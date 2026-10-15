"""Build the agent coding check: 50 works new in the October OpenAlex pull, mixed with the 200
human-coded B2 records as a benchmark, for blind double-coding by AI agents.

Not preregistered (declared as deviation D6). Design:
- New sample: 50 works in the October pull (data/raw/records_2026-10-14.json) but not in v1,
  era-stratified with proportional allocation as in B2, seed 20261015.
- Benchmark: the 200 B2 records exactly as the human coders saw them
  (data/validation/validation_sample_200_blinded.csv).
- The 250 records are shuffled and relabelled K001–K250, so a coder cannot tell new from
  benchmark. OpenAlex IDs and DOIs are removed from the agent sheets so records cannot be
  looked up; everything else matches the human sheets.
- Two batches of 125; each batch is coded by two independent agents (four codings per record
  set, two per record).

Writes data/validation/agent_check/{new_sample_50_master.json, key_map.csv, batch_1.csv, batch_2.csv}.
"""

from __future__ import annotations

import csv
import json
import random
from collections import defaultdict
from pathlib import Path

from sample_validation_records import fetch_openalex_details, reconstruct_abstract

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "validation" / "agent_check"
V1 = ROOT / "dashboard" / "app" / "data" / "records.json"
OCT = ROOT / "data" / "raw" / "records_2026-10-14.json"
BENCHMARK = ROOT / "data" / "validation" / "validation_sample_200_blinded.csv"
SEED = 20261015
N_NEW = 50
FIELDS = ["key", "year", "venue", "title", "abstract", "authors_and_affiliations"]


def era(year: int) -> str:
    return "1970-1999" if year < 2000 else "2000-2014" if year < 2015 else "2015-present"


def main() -> None:
    rng = random.Random(SEED)
    v1_ids = {r["id"] for r in json.loads(V1.read_text())["records"]}
    new = [r for r in json.loads(OCT.read_text())["records"] if r["id"] not in v1_ids]

    strata = defaultdict(list)
    for r in sorted(new, key=lambda r: r["id"]):
        strata[era(r["year"])].append(r)
    alloc = {k: round(N_NEW * len(v) / len(new)) for k, v in strata.items()}
    alloc[max(alloc, key=alloc.get)] += N_NEW - sum(alloc.values())
    picked = [r for k in sorted(strata) for r in rng.sample(strata[k], alloc[k])]

    details = fetch_openalex_details([r["id"] for r in picked])
    master, pool = [], []
    for r in picked:
        d = details.get(r["id"], {})
        loc = d.get("primary_location") or {}
        venue = (loc.get("source") or {}).get("display_name") or loc.get("raw_source_name") or "Unknown"
        authors = " | ".join(
            f"{(a.get('author') or {}).get('display_name') or 'Unknown'}"
            + (f" ({'; '.join(i['display_name'] for i in a.get('institutions', []) if i.get('display_name'))})"
               if a.get("institutions") else "")
            for a in d.get("authorships", []))
        row = {"source": "new", "source_id": r["id"], "year": r["year"], "venue": venue,
               "title": r["title"], "abstract": reconstruct_abstract(d.get("abstract_inverted_index")),
               "authors_and_affiliations": authors}
        master.append({**row, "stratum_era": era(r["year"]), "type": r["type"], "language": r["language"],
                       "topics": r["topics"], "primary_topic": r["topic"]})
        pool.append(row)

    with open(BENCHMARK, encoding="utf-8") as f:
        for b in csv.DictReader(f):
            pool.append({"source": "benchmark", "source_id": b["record_id"], "year": b["year"],
                         "venue": b["venue"], "title": b["title"], "abstract": b["abstract"],
                         "authors_and_affiliations": b["authors_and_affiliations"]})

    rng.shuffle(pool)
    for i, row in enumerate(pool, 1):
        row["key"] = f"K{i:03d}"

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "new_sample_50_master.json").write_text(json.dumps(master, indent=1, ensure_ascii=False))
    with open(OUT / "key_map.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["key", "source", "source_id"])
        w.writeheader()
        w.writerows({k: row[k] for k in ("key", "source", "source_id")} for row in pool)
    half = len(pool) // 2
    for n, rows in ((1, pool[:half]), (2, pool[half:])):
        with open(OUT / f"batch_{n}.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=FIELDS)
            w.writeheader()
            w.writerows({k: row[k] for k in FIELDS} for row in rows)
    print(f"new: {len(master)} ({alloc}); pool: {len(pool)}; batches of {half} and {len(pool) - half}")


if __name__ == "__main__":
    main()
