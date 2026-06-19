"""Build a record-level dataset of the Canadian metaresearch corpus from OpenAlex.

The interactive dashboard filters and re-aggregates on the client, and lets users export
the filtered subset as CSV — so it needs one row per work, not pre-computed facets. This
script cursor-pages the corpus and writes a compact record-level JSON consumed by the app.

All charts, the collaboration network, and the CSV export are derived from this single file.

Run:
    OPENALEX_EMAIL=you@example.org python3 scripts/extraction/build_records.py
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "dashboard" / "app" / "data"
BASE = "https://api.openalex.org/works"
EMAIL = os.environ.get("OPENALEX_EMAIL", "").strip()  # optional OpenAlex polite-pool contact

# Pilot corpus definition. Built on OpenAlex's current Topics taxonomy (the legacy
# Concepts taxonomy is deprecated). A work joins the corpus if any of its topics is
# one of these metaresearch topics.
METARESEARCH_TOPICS = {
    "T10102": "Scientometrics and bibliometrics research",
    "T13607": "Academic Publishing and Open Access",
    "T13516": "Publishing and Scholarly Communication",
    "T11492": "Academic integrity and plagiarism",
    "T13976": "Web visibility and informetrics",
}
# Floor the window at 1970 — "bibliometrics"/"scientometrics" were coined c.1969, so
# topic tags before then are anachronistic misclassifications of digitised old content.
# Drop paratext (covers, indexes, back-matter), which OpenAlex also mis-tags.
DATE_FROM = "1970-01-01"
# The topic/date/type constraints that define "metaresearch" — held constant across all
# "Canadian" definitions so the sensitivity comparison varies only the country criterion.
SUBJECT_FILTER = ("topics.id:" + "|".join(METARESEARCH_TOPICS)
                  + f",from_publication_date:{DATE_FROM},type:!paratext")
# Primary definition of "Canadian": at least one author affiliated with a Canadian institution.
BASE_FILTER = "institutions.country_code:ca," + SUBJECT_FILTER
SELECT = "id,title,publication_year,type,language,cited_by_count,open_access,authorships,primary_topic,topics"

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


def build_sensitivity(records: list[dict]) -> dict:
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
    n_funder = count_for(f"{SUBJECT_FILTER},funders.id:{funder_ids}")

    return {
        "note": "Corpus size under alternative definitions of 'Canadian', with the metaresearch "
                "subject filter held constant. The primary definition (any author institution) "
                "is what the rest of this dashboard uses.",
        "corresponding_coverage": n_has_corr,   # works with any corresponding author marked in OpenAlex
        "definitions": [
            {"key": "any_author", "primary": True, "count": n_any,
             "method": "institutions.country_code:ca"},
            {"key": "first_author", "count": n_first,
             "method": "first author's institution in Canada (computed from authorships)"},
            {"key": "corresponding", "count": n_corr,
             "method": "a corresponding author's institution in Canada (computed from authorships)"},
            {"key": "funder", "count": n_funder,
             "method": "funded by a major Canadian funder (funders.id), regardless of affiliation",
             "funders": funders},
        ],
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Building record-level dataset from OpenAlex (mailto={EMAIL or 'not set'}) ...")

    records: list[dict] = []
    cursor = "*"
    while cursor:
        data = api({"filter": BASE_FILTER, "select": SELECT, "per-page": 200, "cursor": cursor})
        for w in data["results"]:
            oa = w.get("open_access") or {}
            topic = w.get("primary_topic") or {}
            records.append({
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
                           if (tid := short_id(tp.get("id"))) in METARESEARCH_TOPICS],
                # author-role flags for the "Canadian" sensitivity analysis
                "first_ca": first_author_ca(w),
                "corr_ca": any(authorship_is_ca(a) for a in corresponding_authors(w)),
                "has_corr": bool(corresponding_authors(w)),
            })
        cursor = data["meta"].get("next_cursor")
        print(f"  fetched {len(records)} records", file=sys.stderr)
        if not data["results"]:
            break

    sensitivity = build_sensitivity(records)

    payload = {
        "meta": {
            "source": "OpenAlex",
            "base_filter": BASE_FILTER,
            "topics": METARESEARCH_TOPICS,
            "total_works": len(records),
            "note": "Pilot corpus defined on OpenAlex Topics. Refine the topic/keyword definition for the full study.",
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
