"""Build the institutional co-authorship network from OpenAlex.

Unlike the facet-based dashboard aggregates, a collaboration network needs record-level
data: which institutions appear together on the same work. This script pages through the
Canadian metaresearch corpus (cursor paging), requesting only the fields needed, and builds:

  - nodes: institutions (id, name, country, works_count within the corpus)
  - edges: institution pairs co-occurring on a work, weighted by shared work count

Output: dashboard/app/data/network_data.json  (consumed by the dashboard network view).

Run:
    OPENALEX_EMAIL=you@example.org python3 scripts/extraction/build_network_data.py
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "dashboard" / "app" / "data"
BASE = "https://api.openalex.org/works"
EMAIL = os.environ.get("OPENALEX_EMAIL", "").strip()  # optional OpenAlex polite-pool contact

# Same pilot corpus definition as build_dashboard_data.py (OpenAlex Topics taxonomy).
METARESEARCH_TOPICS = [
    "T10102", "T13607", "T13516", "T11492", "T13976",
]
BASE_FILTER = "institutions.country_code:ca,topics.id:" + "|".join(METARESEARCH_TOPICS)

# Keep the graph readable: top-N institutions by corpus output, and prune weak ties.
TOP_N_NODES = 60
MIN_EDGE_WEIGHT = 2


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


def iter_works():
    """Cursor-page through the corpus, yielding each work's institution list."""
    cursor = "*"
    n = 0
    while cursor:
        data = api({
            "filter": BASE_FILTER,
            "select": "id,authorships",
            "per-page": 200,
            "cursor": cursor,
        })
        for work in data["results"]:
            yield work
        n += len(data["results"])
        cursor = data["meta"].get("next_cursor")
        print(f"  fetched {n} works", file=sys.stderr)
        if not data["results"]:
            break


def institutions_of(work: dict) -> dict[str, dict]:
    """Unique institutions on a work: {id: {name, country}}."""
    insts: dict[str, dict] = {}
    for authorship in work.get("authorships", []):
        for inst in authorship.get("institutions", []):
            iid = inst.get("id")
            if iid:
                insts[iid] = {
                    "name": inst.get("display_name", iid),
                    "country": inst.get("country_code"),
                }
    return insts


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Building collaboration network from OpenAlex (mailto={EMAIL or 'not set'}) ...")

    node_info: dict[str, dict] = {}
    node_works: dict[str, int] = {}
    edge_weight: dict[tuple[str, str], int] = {}

    for work in iter_works():
        insts = institutions_of(work)
        for iid, info in insts.items():
            node_info[iid] = info
            node_works[iid] = node_works.get(iid, 0) + 1
        # Co-occurrence edges (undirected, sorted pair key).
        for a, b in combinations(sorted(insts), 2):
            edge_weight[(a, b)] = edge_weight.get((a, b), 0) + 1

    # Keep top-N institutions by corpus output.
    top_ids = {iid for iid, _ in sorted(node_works.items(), key=lambda kv: kv[1], reverse=True)[:TOP_N_NODES]}

    nodes = [
        {
            "id": iid,
            "name": node_info[iid]["name"],
            "country": node_info[iid]["country"],
            "works": node_works[iid],
        }
        for iid in top_ids
    ]
    edges = [
        {"source": a, "target": b, "weight": w}
        for (a, b), w in edge_weight.items()
        if a in top_ids and b in top_ids and w >= MIN_EDGE_WEIGHT
    ]

    payload = {
        "meta": {
            "source": "OpenAlex",
            "base_filter": BASE_FILTER,
            "top_n_nodes": TOP_N_NODES,
            "min_edge_weight": MIN_EDGE_WEIGHT,
            "total_institutions": len(node_info),
            "nodes_shown": len(nodes),
            "edges_shown": len(edges),
            "note": "Institutional co-authorship network. Nodes = institutions (top-N by "
                    "corpus output); edges = co-authored works (weight >= "
                    f"{MIN_EDGE_WEIGHT}).",
        },
        "nodes": sorted(nodes, key=lambda n: n["works"], reverse=True),
        "edges": sorted(edges, key=lambda e: e["weight"], reverse=True),
    }

    out = OUT_DIR / "network_data.json"
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"  {len(nodes)} nodes, {len(edges)} edges -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
