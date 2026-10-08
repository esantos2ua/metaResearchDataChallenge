"""Copy the B2 precision estimates the dashboard shows into dashboard/app/data/.

Reads data/validation/validation_results.json (written by `analyse_validation.py results`) and
writes dashboard/app/data/validation_precision.json: overall Q1 precision plus Q1 precision per
corpus topic, primary rule (a final UNCLEAR counts as out of scope), with Wilson 95% CIs.
Refuses to export provisional results.

Usage: python scripts/validation/export_dashboard_precision.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data" / "validation" / "validation_results.json"
TARGET = ROOT / "dashboard" / "app" / "data" / "validation_precision.json"


def block(b: dict) -> dict:
    p = b["primary"]
    return {"n": b["n"], "yes": b["yes"], "estimate": round(p["estimate"], 3),
            "ci95": [round(x, 3) for x in p["ci95"]]}


def main() -> None:
    res = json.loads(SOURCE.read_text(encoding="utf-8"))
    if res.get("provisional"):
        sys.exit("validation_results.json is provisional; export only final results.")
    out = {
        "generated": res["generated"],
        "source": "data/validation/validation_results.json",
        "threshold": 0.80,
        "overall": block(res["precision"]["is_metaresearch"]),
        # Keys look like "T10102 Scientometrics and bibliometrics research"; keep the id only.
        "by_topic": {k.split()[0]: block(v)
                     for k, v in res["exploratory"]["corpus_topic"].items()},
    }
    TARGET.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {TARGET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
