"""Pilot extraction: build real dashboard aggregates from OpenAlex.

This is the working mock-up pipeline. It defines the Canadian metaresearch corpus as
works with >=1 Canadian institution AND at least one metaresearch-related OpenAlex concept,
then uses the API's ``group_by`` facets to compute aggregates WITHOUT downloading every
record. Output: dashboard/app/data/*.json consumed by the static dashboard.

Run:
    OPENALEX_EMAIL=you@example.org python scripts/extraction/build_dashboard_data.py
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

# --- Corpus definition (pilot) -------------------------------------------------
# Metaresearch-related OpenAlex topics (current Topics taxonomy; Concepts is
# deprecated). Pilot set; refine in query_config.yaml for the full study.
METARESEARCH_TOPICS = {
    "T10102": "Scientometrics and bibliometrics research",
    "T13607": "Academic Publishing and Open Access",
    "T13516": "Publishing and Scholarly Communication",
    "T11492": "Academic integrity and plagiarism",
    "T13976": "Web visibility and informetrics",
}
TOPIC_FILTER = "topics.id:" + "|".join(METARESEARCH_TOPICS)
# Floor at 1970 (field named c.1969) and drop paratext — removes pre-field misclassifications.
BASE_FILTER = f"institutions.country_code:ca,{TOPIC_FILTER},from_publication_date:1970-01-01,type:!paratext"


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


def total_count() -> int:
    return api({"filter": BASE_FILTER, "per-page": 1})["meta"]["count"]


def group_by(dimension: str, extra_filter: str = "") -> list[dict]:
    filt = BASE_FILTER + (f",{extra_filter}" if extra_filter else "")
    data = api({"filter": filt, "group_by": dimension, "per-page": 200})
    return [{"key": g["key"], "name": g.get("key_display_name", g["key"]),
             "count": g["count"]} for g in data["group_by"]]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Querying OpenAlex (mailto={EMAIL or 'not set'}) ...")

    total = total_count()
    print(f"  corpus size: {total} works")

    payload = {
        "meta": {
            "source": "OpenAlex",
            "base_filter": BASE_FILTER,
            "topics": METARESEARCH_TOPICS,
            "total_works": total,
            "note": "Pilot corpus defined on OpenAlex Topics. Refine the topic/keyword definition for the full study.",
        },
        "oa_status": group_by("open_access.oa_status"),
        "year": sorted(group_by("publication_year"), key=lambda g: g["key"]),
        "type": group_by("type"),
        "institutions": group_by("institutions.id")[:15],
        "topics": group_by("topics.id")[:15],
        "languages": group_by("language"),
        "is_oa": group_by("open_access.is_oa"),
        "topics": group_by("primary_topic.id")[:15],
    }

    out = OUT_DIR / "dashboard_data.json"
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"  wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
