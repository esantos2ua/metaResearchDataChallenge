"""Build a record-level dataset of the Canadian metaresearch corpus from OpenAlex.

The interactive dashboard filters and re-aggregates on the client, and lets users export
the filtered subset as CSV — so it needs one row per work, not pre-computed facets. This
script cursor-pages the corpus and writes a compact record-level JSON consumed by the app.

All charts, the collaboration network, and the CSV export are derived from this single file.

THE CORPUS DEFINITION LIVES IN query_config.yaml, NOT HERE. Every corpus-defining constraint
(topics, keyword layer, country, date window, excluded types) is read from that file, and the
resolved filter string plus the config's git SHA and content hash are written to
records.json -> meta.provenance.

Run:
    OPENALEX_EMAIL=you@example.org python3 scripts/extraction/build_records.py
    python3 scripts/extraction/build_records.py --dry-run          # resolve + count, write nothing
    python3 scripts/extraction/build_records.py --dry-run --keywords  # also test the keyword layer
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("PyYAML is required (pip install pyyaml, or: python3 -m venv .venv && "
             ".venv/bin/pip install -r requirements.txt)")

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "dashboard" / "app" / "data"
CONFIG_PATH = Path(__file__).resolve().parent / "query_config.yaml"
BASE = "https://api.openalex.org/works"
EMAIL = os.environ.get("OPENALEX_EMAIL", "").strip()  # optional OpenAlex polite-pool contact
SELECT = "id,title,publication_year,type,language,cited_by_count,open_access,authorships,primary_topic,topics"


class CorpusDefinition:
    """The corpus definition, resolved from query_config.yaml into OpenAlex filter strings."""

    def __init__(self, path: Path = CONFIG_PATH):
        self.path = path
        raw = path.read_text(encoding="utf-8")
        cfg = yaml.safe_load(raw)
        self.version = str(cfg.get("version", ""))

        topics = cfg.get("topics") or []
        if not topics:
            sys.exit(f"{path.name}: `topics` is empty — the corpus definition must name at least one topic")
        self.topics: dict[str, str] = {}
        self.topic_rationales: dict[str, str] = {}
        for t in topics:
            tid = str(t["id"]).strip()
            if not tid.startswith("T"):
                sys.exit(f"{path.name}: topic id {tid!r} is not an OpenAlex topic (expected T#####)")
            self.topics[tid] = str(t.get("name", tid)).strip()
            self.topic_rationales[tid] = " ".join(str(t.get("rationale", "")).split())

        self.country = str(cfg.get("country", "")).strip().lower()
        if len(self.country) != 2:
            sys.exit(f"{path.name}: `country` must be a 2-letter ISO code")
        self.canadian_definition = cfg.get("canadian_definition", "any_author_institution")
        if self.canadian_definition != "any_author_institution":
            sys.exit(f"{path.name}: canadian_definition={self.canadian_definition!r} is not retrievable; "
                     "the builder pulls any_author_institution and computes the others as sensitivity flags")

        self.date_from = str(cfg.get("from_publication_date") or "").strip()
        if not self.date_from:
            sys.exit(f"{path.name}: `from_publication_date` is required")
        self.date_to = cfg.get("to_publication_date") or None
        self.exclude_types = [str(x) for x in (cfg.get("exclude_types") or [])]

        kw = cfg.get("keyword_layer") or {}
        self.keyword_enabled = bool(kw.get("enabled", False))
        self.keywords: list[str] = [str(k) for lang in ("en", "fr") for k in (kw.get(lang) or [])]

        self.content_sha256 = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        self.git_sha, self.git_dirty = _git_state(path)

    # -- filter strings ------------------------------------------------------------------
    @property
    def window_filter(self) -> str:
        parts = [f"from_publication_date:{self.date_from}"]
        if self.date_to:
            parts.append(f"to_publication_date:{self.date_to}")
        parts += [f"type:!{t}" for t in self.exclude_types]
        return ",".join(parts)

    @property
    def subject_filter(self) -> str:
        """Topic/date/type constraints defining 'metaresearch' — held constant across all
        'Canadian' definitions so the sensitivity comparison varies only the country criterion."""
        return "topics.id:" + "|".join(self.topics) + "," + self.window_filter

    @property
    def country_filter(self) -> str:
        return f"institutions.country_code:{self.country}"

    @property
    def base_filter(self) -> str:
        """Primary corpus: any author affiliated with an institution in `country`."""
        return f"{self.country_filter},{self.subject_filter}"

    @property
    def keyword_search(self) -> str:
        return " OR ".join(f'"{k}"' if " " in k else k for k in self.keywords)

    @property
    def keyword_filter(self) -> str:
        return f"{self.country_filter},{self.window_filter},title_and_abstract.search:{self.keyword_search}"

    def provenance(self) -> dict:
        return {
            "config_path": _display_path(self.path),
            "config_version": self.version,
            "config_git_sha": self.git_sha,
            "config_git_dirty": self.git_dirty,
            "config_sha256": self.content_sha256,
            "builder_git_sha": _git_state(Path(__file__))[0],
            "resolved_filter": self.base_filter,
            "keyword_layer": {"enabled": self.keyword_enabled,
                              "filter": self.keyword_filter if self.keyword_enabled else None},
            "topic_rationales": self.topic_rationales,
        }


def _display_path(path: Path) -> str:
    """Repo-relative when inside the repo, absolute otherwise (e.g. a --config outside it)."""
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path.resolve())


def _git_state(path: Path) -> tuple[str | None, bool | None]:
    """(last commit SHA touching `path`, whether the working copy differs from it)."""
    try:
        sha = subprocess.run(["git", "log", "-n", "1", "--format=%H", "--", str(path)],
                             cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip() or None
        dirty = bool(subprocess.run(["git", "status", "--porcelain", "--", str(path)],
                                    cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip())
        return sha, dirty
    except Exception:  # noqa: BLE001 — not a git checkout
        return None, None


FUNDERS_API = "https://api.openalex.org/funders"


def api(params: dict) -> dict:
    params = {**params}
    if EMAIL:
        params["mailto"] = EMAIL
    url = f"{BASE}?{urllib.parse.urlencode(params)}"
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                return json.loads(resp.read())
        except Exception as exc:  # noqa: BLE001
            if attempt == 3:
                raise
            print(f"  retry ({exc})", file=sys.stderr)
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("unreachable")


def short_id(url: str | None) -> str | None:
    return url.rsplit("/", 1)[-1] if url else None


def institutions_of(work: dict) -> list[dict]:
    """Distinct institutions on a work, with country."""
    seen: dict[str, dict] = {}
    for authorship in work.get("authorships", []):
        for inst in authorship.get("institutions", []):
            iid = short_id(inst.get("id"))
            if iid and iid not in seen:
                seen[iid] = {
                    "id": iid,
                    "name": inst.get("display_name", iid),
                    "country": inst.get("country_code"),
                }
    return list(seen.values())


def authorship_is_ca(authorship: dict) -> bool:
    """True if this authorship is affiliated with a Canadian institution."""
    if any(inst.get("country_code") == "CA" for inst in authorship.get("institutions", [])):
        return True
    return "CA" in (authorship.get("countries") or [])  # API fallback when no institution resolved


def first_author_ca(work: dict) -> bool:
    for a in work.get("authorships", []):
        if a.get("author_position") == "first":
            return authorship_is_ca(a)
    return False


def corresponding_authors(work: dict) -> list[dict]:
    return [a for a in work.get("authorships", []) if a.get("is_corresponding")]


def canadian_funder_filter() -> tuple[str, list[dict]]:
    """Fetch the top Canadian funders (by output) and return an OpenAlex grants.funder
    filter value plus the funder list, for the funder-based sensitivity definition."""
    params = {"filter": "country_code:ca", "sort": "works_count:desc", "per-page": 25}
    if EMAIL:
        params["mailto"] = EMAIL
    url = f"{FUNDERS_API}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=60) as resp:
        results = json.loads(resp.read())["results"]
    funders = [{"id": short_id(f["id"]), "name": f["display_name"]} for f in results]
    return "|".join(f["id"] for f in funders), funders


def count_for(filter_str: str) -> int:
    return api({"filter": filter_str, "per-page": 1})["meta"]["count"]


def build_sensitivity(records: list[dict], defn: CorpusDefinition) -> dict:
    """Corpus size under alternative definitions of 'Canadian', holding the metaresearch
    subject filter constant. First/corresponding are computed from the records we already
    fetched (both are subsets of the any-author corpus); funder is a distinct population
    queried live (works funded by major Canadian funders, regardless of affiliation)."""
    n_any = len(records)
    n_first = sum(1 for r in records if r["first_ca"])
    n_corr = sum(1 for r in records if r["corr_ca"])
    n_has_corr = sum(1 for r in records if r["has_corr"])

    print("  computing funder-based definition (live)…", file=sys.stderr)
    funder_ids, funders = canadian_funder_filter()
    n_funder = count_for(f"{defn.subject_filter},funders.id:{funder_ids}")

    return {
        "note": "Corpus size under alternative definitions of 'Canadian', with the metaresearch "
                "subject filter held constant. The primary definition (any author institution) "
                "is what the rest of this dashboard uses.",
        "corresponding_coverage": n_has_corr,   # works with any corresponding author marked in OpenAlex
        "definitions": [
            {"key": "any_author", "primary": True, "count": n_any,
             "method": defn.country_filter},
            {"key": "first_author", "count": n_first,
             "method": "first author's institution in Canada (computed from authorships)"},
            {"key": "corresponding", "count": n_corr,
             "method": "a corresponding author's institution in Canada (computed from authorships)"},
            {"key": "funder", "count": n_funder,
             "method": "funded by a major Canadian funder (funders.id), regardless of affiliation",
             "funders": funders},
        ],
    }


def fetch_all(filter_str: str, label: str) -> list[dict]:
    works: list[dict] = []
    cursor = "*"
    while cursor:
        data = api({"filter": filter_str, "select": SELECT, "per-page": 200, "cursor": cursor})
        works.extend(data["results"])
        cursor = data["meta"].get("next_cursor")
        print(f"  [{label}] fetched {len(works)} works", file=sys.stderr)
        if not data["results"]:
            break
    return works


def to_record(w: dict, defn: CorpusDefinition, via: str) -> dict:
    oa = w.get("open_access") or {}
    topic = w.get("primary_topic") or {}
    return {
        "id": short_id(w.get("id")),
        "title": w.get("title") or "",
        "year": w.get("publication_year"),
        "type": w.get("type") or "unknown",
        "language": w.get("language") or "unknown",
        "cited_by_count": w.get("cited_by_count", 0),
        "is_oa": bool(oa.get("is_oa")),
        "oa_status": oa.get("oa_status") or "unknown",
        "topic": (topic.get("display_name") or "Unclassified"),
        "field": ((topic.get("field") or {}).get("display_name") or "Unclassified"),
        "institutions": institutions_of(w),
        # which of the corpus-defining metaresearch topics this work carries (for filtering)
        "topics": [tid for tp in (w.get("topics") or [])
                   if (tid := short_id(tp.get("id"))) in defn.topics],
        # how the work entered the corpus: "topic" (topic pass) or "keyword" (keyword layer only)
        "via": via,
        # author-role flags for the "Canadian" sensitivity analysis
        "first_ca": first_author_ca(w),
        "corr_ca": any(authorship_is_ca(a) for a in corresponding_authors(w)),
        "has_corr": bool(corresponding_authors(w)),
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", type=Path, default=CONFIG_PATH, help="corpus definition (YAML)")
    ap.add_argument("--dry-run", action="store_true", help="resolve the definition and count; write nothing")
    ap.add_argument("--keywords", action="store_true", help="force the keyword layer on (overrides config)")
    args = ap.parse_args()

    defn = CorpusDefinition(args.config)
    if args.keywords:
        defn.keyword_enabled = True

    print(f"Corpus definition {defn.version} from {_display_path(defn.path)}", file=sys.stderr)
    print(f"  config git SHA : {defn.git_sha}{' (uncommitted changes)' if defn.git_dirty else ''}", file=sys.stderr)
    print(f"  config sha256  : {defn.content_sha256[:16]}…", file=sys.stderr)
    print(f"  topics         : {', '.join(defn.topics)}", file=sys.stderr)
    print(f"  filter         : {defn.base_filter}", file=sys.stderr)
    if defn.keyword_enabled:
        print(f"  keyword filter : {defn.keyword_filter}", file=sys.stderr)

    if args.dry_run:
        n_topic = count_for(defn.base_filter)
        print(f"  topic pass     : {n_topic} works", file=sys.stderr)
        if defn.keyword_enabled:
            n_kw = count_for(defn.keyword_filter)
            print(f"  keyword pass   : {n_kw} works (before dedup against topic pass)", file=sys.stderr)
        print(json.dumps(defn.provenance(), indent=1, ensure_ascii=False))
        return

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    retrieved_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    print(f"Building record-level dataset from OpenAlex (mailto={EMAIL or 'not set'}) ...")

    by_id: dict[str, dict] = {}
    for w in fetch_all(defn.base_filter, "topics"):
        rec = to_record(w, defn, via="topic")
        by_id[rec["id"]] = rec
    n_topic = len(by_id)

    n_kw_total = n_kw_only = 0
    if defn.keyword_enabled:
        for w in fetch_all(defn.keyword_filter, "keywords"):
            n_kw_total += 1
            rec = to_record(w, defn, via="keyword")
            if rec["id"] not in by_id:
                by_id[rec["id"]] = rec
                n_kw_only += 1
    records = list(by_id.values())

    sensitivity = build_sensitivity(records, defn)
    provenance = defn.provenance()
    provenance.update({
        "retrieved_at_utc": retrieved_at,
        "api_base": BASE,
        "counts": {"topic_pass": n_topic, "keyword_pass": n_kw_total,
                   "keyword_only": n_kw_only, "total": len(records)},
    })

    payload = {
        "meta": {
            "source": "OpenAlex",
            "base_filter": defn.base_filter,
            "topics": defn.topics,
            "total_works": len(records),
            "note": ("Corpus defined on OpenAlex Topics via the versioned query_config.yaml "
                     f"({defn.version}); see meta.provenance for the exact definition."),
            "provenance": provenance,
            "sensitivity": sensitivity,
        },
        "records": records,
    }

    out = OUT_DIR / "records.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    size_mb = out.stat().st_size / 1e6
    print(f"  wrote {len(records)} records -> {out.relative_to(ROOT)} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()
