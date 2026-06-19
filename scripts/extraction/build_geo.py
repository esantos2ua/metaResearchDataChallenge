"""Build an institution -> [lat, lon] lookup for the geographic collaboration map.

Reads the institution ids present in dashboard/app/data/records.json, fetches their
coordinates from the OpenAlex institutions API in batches, and writes a compact
dashboard/app/data/institutions_geo.json: { "<id>": [lat, lon], ... }.

Run after build_records.py:
    OPENALEX_EMAIL=you@example.org python3 scripts/extraction/build_geo.py
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
DATA_DIR = ROOT / "dashboard" / "app" / "data"
BASE = "https://api.openalex.org/institutions"
EMAIL = os.environ.get("OPENALEX_EMAIL", "").strip()  # optional OpenAlex polite-pool contact
BATCH = 50


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


def main() -> None:
    records = json.loads((DATA_DIR / "records.json").read_text())["records"]
    ids = sorted({i["id"] for r in records for i in r["institutions"]})
    print(f"Fetching coordinates for {len(ids)} institutions ...")

    geo: dict[str, list[float]] = {}
    for start in range(0, len(ids), BATCH):
        batch = ids[start:start + BATCH]
        data = api({
            "filter": "ids.openalex:" + "|".join(batch),
            "select": "id,geo",
            "per-page": BATCH,
        })
        for inst in data.get("results", []):
            iid = (inst.get("id") or "").rsplit("/", 1)[-1]
            g = inst.get("geo") or {}
            lat, lon = g.get("latitude"), g.get("longitude")
            if iid and lat is not None and lon is not None:
                geo[iid] = [round(lat, 4), round(lon, 4)]
        print(f"  {min(start + BATCH, len(ids))}/{len(ids)} ...", file=sys.stderr)

    out = DATA_DIR / "institutions_geo.json"
    out.write_text(json.dumps(geo, separators=(",", ":")))
    print(f"  wrote {len(geo)} located institutions -> {out.relative_to(ROOT)} "
          f"({out.stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
