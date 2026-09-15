"""Draw a stratified random sample of 200 records from the frozen corpus for validation coding (B2).

Preregistered specifications:
- Sample size: n = 200
- Random seed: 2026 (fixed for reproducibility)
- Strata: Era only (1970–1999, 2000–2014, 2015–present) with proportional allocation
- Double-coded: 8 coders in 4 pairs (50 records each)
- Blinded: Topic assignments are omitted from coding sheets
- Outputs: Master dataset + 4 pair-specific CSV coding sheets
"""

from __future__ import annotations

import csv
import json
import os
import random
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RECORDS_PATH = ROOT / "dashboard" / "app" / "data" / "records.json"
OUT_DIR = ROOT / "data" / "validation"
EMAIL = os.environ.get("OPENALEX_EMAIL", "esantos2@ualberta.ca").strip()
SEED = 2026
SAMPLE_SIZE = 200
BATCH_SIZE = 50


def reconstruct_abstract(inverted_index: dict | None) -> str:
    """Reconstruct text from OpenAlex inverted index abstract representation."""
    if not inverted_index:
        return ""
    word_pos = []
    for word, positions in inverted_index.items():
        for pos in positions:
            word_pos.append((pos, word))
    word_pos.sort(key=lambda x: x[0])
    return " ".join(w for _, w in word_pos)


def fetch_openalex_details(work_ids: list[str]) -> dict[str, dict]:
    """Fetch rich work metadata (abstract, venue, doi) in batches from OpenAlex."""
    details: dict[str, dict] = {}
    base_url = "https://api.openalex.org/works"
    select = "id,doi,title,publication_year,primary_location,authorships,abstract_inverted_index"

    for i in range(0, len(work_ids), BATCH_SIZE):
        batch = work_ids[i:i + BATCH_SIZE]
        filter_val = "|".join(batch)
        params = {
            "filter": f"openalex:{filter_val}",
            "select": select,
            "per-page": len(batch),
        }
        if EMAIL:
            params["mailto"] = EMAIL
        url = f"{base_url}?{urllib.parse.urlencode(params)}"
        print(f"  fetching details batch {i + 1}–{min(i + BATCH_SIZE, len(work_ids))} of {len(work_ids)}...", file=sys.stderr)

        for attempt in range(4):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": f"mailto:{EMAIL}"})
                with urllib.request.urlopen(req, timeout=60) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    for w in data.get("results", []):
                        wid = w.get("id", "").rsplit("/", 1)[-1]
                        details[wid] = w
                break
            except Exception as e:
                if attempt == 3:
                    print(f"Warning: could not fetch batch {i}: {e}", file=sys.stderr)
                time.sleep(2 * (attempt + 1))
        time.sleep(0.1)
    return details


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if not RECORDS_PATH.exists():
        sys.exit(f"Error: {RECORDS_PATH} not found. Run build_records.py first.")

    raw_data = json.loads(RECORDS_PATH.read_text(encoding="utf-8"))
    records = raw_data["records"]
    total_n = len(records)
    print(f"Loaded {total_n} records from {RECORDS_PATH.relative_to(ROOT)}.")

    # 1. Stratify by era
    # 1970–1999 / 2000–2014 / 2015–present
    strata: dict[str, list[dict]] = {
        "1970-1999": [],
        "2000-2014": [],
        "2015-present": [],
    }
    for r in records:
        yr = r.get("year") or 0
        if yr < 2000:
            strata["1970-1999"].append(r)
        elif yr < 2015:
            strata["2000-2014"].append(r)
        else:
            strata["2015-present"].append(r)

    print("\nCorpus breakdown by era:")
    for k, v in strata.items():
        pct = (len(v) / total_n) * 100
        print(f"  {k}: {len(v):,d} works ({pct:.2f}%)")

    # 2. Proportional allocation
    rng = random.Random(SEED)
    allocations = {}
    sampled_records = []

    # Calculate exact counts with largest-remainder rounding
    raw_counts = {k: (len(v) / total_n) * SAMPLE_SIZE for k, v in strata.items()}
    int_counts = {k: int(v) for k, v in raw_counts.items()}
    remainder = SAMPLE_SIZE - sum(int_counts.values())
    sorted_by_remainder = sorted(strata.keys(), key=lambda k: raw_counts[k] - int_counts[k], reverse=True)
    for k in sorted_by_remainder[:remainder]:
        int_counts[k] += 1

    print("\nProportional allocation for n=200 sample (seed=2026):")
    for k, n_k in int_counts.items():
        allocations[k] = n_k
        print(f"  {k}: {n_k} records ({n_k / SAMPLE_SIZE * 100:.1f}%)")
        sample_k = rng.sample(strata[k], n_k)
        for item in sample_k:
            item["stratum_era"] = k
        sampled_records.extend(sample_k)

    # Shuffle the final sample so eras are mixed
    rng.shuffle(sampled_records)

    # 3. Fetch full metadata from OpenAlex
    work_ids = [r["id"] for r in sampled_records]
    print(f"\nFetching rich metadata for {len(work_ids)} works from OpenAlex...")
    details_map = fetch_openalex_details(work_ids)

    # 4. Assemble master sample and blinded items
    master_rows = []
    blinded_rows = []

    for idx, r in enumerate(sampled_records, start=1):
        wid = r["id"]
        det = details_map.get(wid, {})

        # Abstract
        inv_idx = det.get("abstract_inverted_index")
        abstract = reconstruct_abstract(inv_idx)

        # Venue
        loc = det.get("primary_location") or {}
        src = loc.get("source") or {}
        venue = src.get("display_name") or loc.get("raw_source_name") or "Unknown"

        # DOI
        doi = det.get("doi") or ""

        # Authors & Affiliations formatting
        author_parts = []
        for auth in det.get("authorships", []):
            name = (auth.get("author") or {}).get("display_name") or "Unknown"
            insts = [i.get("display_name") for i in auth.get("institutions", []) if i.get("display_name")]
            inst_str = f" ({'; '.join(insts)})" if insts else ""
            author_parts.append(f"{name}{inst_str}")
        authorships_formatted = " | ".join(author_parts)

        row_common = {
            "record_id": idx,
            "openalex_id": wid,
            "doi": doi,
            "year": r.get("year"),
            "stratum_era": r.get("stratum_era"),
            "venue": venue,
            "title": r.get("title"),
            "abstract": abstract,
            "authors_and_affiliations": authorships_formatted,
        }

        # Blinded row for coders
        blinded_row = {
            "record_id": idx,
            "openalex_id": wid,
            "doi": doi,
            "year": r.get("year"),
            "venue": venue,
            "title": r.get("title"),
            "abstract": abstract,
            "authors_and_affiliations": authorships_formatted,
            "is_metaresearch": "",   # YES / NO / UNCLEAR
            "is_canadian": "",       # YES / NO / UNCLEAR
            "notes": "",
        }
        blinded_rows.append(blinded_row)

        # Master row with truth topics
        master_row = dict(row_common)
        master_row.update({
            "assigned_topics": r.get("topics"),
            "primary_topic": r.get("topic"),
            "primary_field": r.get("field"),
            "first_ca": r.get("first_ca"),
            "corr_ca": r.get("corr_ca"),
        })
        master_rows.append(master_row)

    # 5. Write Master Sample
    master_path = OUT_DIR / "validation_sample_200_master.json"
    master_path.write_text(json.dumps(master_rows, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote master sample -> {master_path.relative_to(ROOT)}")

    # 6. Write Full Blinded Sample CSV
    blinded_csv_path = OUT_DIR / "validation_sample_200_blinded.csv"
    with open(blinded_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(blinded_rows[0].keys()))
        writer.writeheader()
        writer.writerows(blinded_rows)
    print(f"Wrote full blinded CSV -> {blinded_csv_path.relative_to(ROOT)}")

    # 7. Write 4 Pair-Specific Coding Sheets
    pairs = [
        ("pair1_bruno_elena", 0, 50, "Bruno Soares & Elena Gazzea"),
        ("pair2_stephanie_valentin", 50, 100, "Stephanie Flaman & Valentin Lucet"),
        ("pair3_shinichi_losia", 100, 150, "Shinichi Nakagawa & Losia Lagisz"),
        ("pair4_marija_eduardo", 150, 200, "Marija Purgar & Eduardo Santos"),
    ]

    for pair_id, start_idx, end_idx, pair_names in pairs:
        pair_rows = blinded_rows[start_idx:end_idx]
        file_name = f"coding_sheet_{pair_id}_records_{start_idx + 1:03d}_{end_idx:03d}.csv"
        pair_path = OUT_DIR / file_name
        with open(pair_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(pair_rows[0].keys()))
            writer.writeheader()
            writer.writerows(pair_rows)
        print(f"Wrote {pair_names} sheet ({len(pair_rows)} records) -> {pair_path.relative_to(ROOT)}")

    print("\nValidation sample preparation complete! Ready for Phase 2 validation coding.")


if __name__ == "__main__":
    main()
