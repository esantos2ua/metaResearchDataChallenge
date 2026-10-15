"""Figures for the Oct 28, 2026 plenary (notes/TALK-OUTLINE.md, section 3).

    python3 scripts/analysis/make_talk_figures.py [--refresh]

Writes SVG + PNG to docs/figures/talk/:
  1-corpus-versions   pilot / v1 / October: kept, left, entered
  2-coded-dots        the 200 B2-coded records, by human verdict and October outcome
  3-precision         precision with 95% interval against the 0.80 line

Figure 2 needs each record's October status. It is fetched from the OpenAlex API (frozen filter from
data/raw/SNAPSHOT.md plus openalex:ID batches of 50; no key needed) and cached in
data/versions/b2_october_status.json; pass --refresh to query again.
Slide size 13.33 x 7.5 in, so every font size here is the size on the slide (>= 40 pt).
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import time
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.lines import Line2D  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "figures" / "talk"
CACHE = ROOT / "data" / "versions" / "b2_october_status.json"
FILTER = ("institutions.country_code:ca,topics.id:T10102|T13607|T13516|T11492|T13976|T11937,"
          "from_publication_date:1970-01-01,type:!paratext")

# COSSEE palette (dashboard/app/styles.css); the green/blue pair is the one tuned for colour-blind viewers
INK, MUTED = "#1b2733", "#5c6e68"
GREEN, GREEN_DARK, BLUE, GREY = "#1f7a63", "#155c4a", "#7aa7c6", "#b7beb9"
AMBER = "#c77d1a"  # warning colour for the agent-based, exploratory estimates

FS = 40
plt.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["Helvetica Neue", "Helvetica", "Arial", "DejaVu Sans"],
    "font.size": FS, "text.color": INK, "axes.labelcolor": INK,
    "xtick.color": INK, "ytick.color": INK, "svg.fonttype": "none",
})


def save(fig, name):
    OUT.mkdir(parents=True, exist_ok=True)
    for ext in ("svg", "png"):
        fig.savefig(OUT / f"{name}.{ext}", dpi=150, transparent=False, facecolor="white")
    plt.close(fig)


def clean(ax):
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)


# ---- 1. three corpus versions -------------------------------------------------------------
def fig_versions():
    c = json.loads((ROOT / "data/versions/comparison.json").read_text())
    v, fl = c["versions"], c["flows"]
    fig, ax = plt.subplots(figsize=(13.33, 7.5))
    # pilot has no earlier version: one solid bar. Later bars: kept + entered solid, left hatched on top.
    ax.bar(0, v["pilot"]["works"], color=BLUE, width=0.62)
    for x, key, f in ((1, "v1", fl["pilot->v1"]), (2, "oct", fl["v1->oct"])):
        assert f["kept"] + f["entered"] == v[key]["works"], key
        ax.bar(x, f["kept"], color=BLUE, width=0.62)
        ax.bar(x, f["entered"], bottom=f["kept"], color=GREEN, width=0.62)
        ax.bar(x, f["left"], bottom=v[key]["works"], facecolor="white", edgecolor=INK,
               hatch="///", linewidth=2, width=0.62)
        ax.text(x, v[key]["works"] + f["left"] + 500, f"{v[key]['works']:,}", ha="center", fontsize=FS, fontweight="bold")
    ax.text(0, v["pilot"]["works"] + 500, f"{v['pilot']['works']:,}", ha="center", fontsize=FS, fontweight="bold")
    ax.set_xticks([0, 1, 2], ["Pilot", "v1", "October"])
    ax.set_ylim(0, 27000)
    ax.set_yticks([0, 10000, 20000], ["0", "10k", "20k"])
    ax.legend(handles=[Patch(color=BLUE, label="kept"), Patch(color=GREEN, label="entered"),
                       Patch(facecolor="white", edgecolor=INK, hatch="///", label="left")],
              loc="upper left", frameon=False, fontsize=FS, handlelength=1.2)
    clean(ax)
    fig.tight_layout()
    save(fig, "1-corpus-versions")


# ---- 2. the 200 coded records and where they went ------------------------------------------
def october_status(ids, refresh):
    if CACHE.exists() and not refresh:
        return json.loads(CACHE.read_text())["status"]

    def fetch(filt):
        found = set()
        for i in range(0, len(ids), 50):
            batch = "|".join(ids[i:i + 50])
            url = ("https://api.openalex.org/works?filter=" + urllib.parse.quote(f"{filt}openalex:{batch}", safe=":,|!")
                   + "&select=id&per-page=50")
            for attempt in range(4):
                try:
                    with urllib.request.urlopen(url, timeout=60) as r:
                        res = json.load(r)["results"]
                    break
                except Exception:
                    if attempt == 3:
                        raise
                    time.sleep(2 * (attempt + 1))
            found |= {w["id"].rsplit("/", 1)[-1] for w in res}
            time.sleep(0.3)
        return found

    kept, exists = fetch(FILTER + ","), fetch("")
    status = {i: "kept" if i in kept else "dropped" if i in exists else "gone" for i in ids}
    CACHE.write_text(json.dumps({"filter": FILTER, "queried": time.strftime("%Y-%m-%d"), "status": status}, indent=1))
    return status


def load_b2(refresh):
    rows = list(csv.DictReader(open(ROOT / "data/validation/relevance_sample_2026-10-07.csv")))
    status = october_status([r["openalex_id"] for r in rows], refresh)
    return [(r["is_metaresearch_final"], status[r["openalex_id"]]) for r in rows]


def fig_dots(b2):
    cnt = Counter(b2)
    expect = {("YES", "kept"): 42, ("YES", "dropped"): 10, ("YES", "gone"): 1,
              ("NO", "kept"): 51, ("NO", "dropped"): 77, ("NO", "gone"): 11,
              ("UNCLEAR", "kept"): 7, ("UNCLEAR", "dropped"): 1}
    for k, n in expect.items():
        assert cnt[k] == n, (k, cnt[k], n)
    style = {"YES": dict(c=GREEN, marker="o", ec=GREEN_DARK), "NO": dict(c=GREY, marker="s", ec="#7d8782"),
             "UNCLEAR": dict(c="white", marker="D", ec=BLUE)}
    fig, ax = plt.subplots(figsize=(13.33, 7.5))
    ncol, step = 14, 1.0
    gap = 1.2
    for p, (st, label) in enumerate((("kept", "Kept"), ("dropped", "Dropped"), ("gone", "Gone"))):
        x0 = p * (ncol + gap)
        n = sum(cnt[(v, st)] for v in style)
        i = 0
        for v in ("YES", "UNCLEAR", "NO"):
            for _ in range(cnt[(v, st)]):
                r, c = divmod(i, ncol)
                s = style[v]
                ax.scatter(x0 + c * step, -r * step, s=260 if v != "UNCLEAR" else 190, marker=s["marker"],
                           facecolor=s["c"], edgecolor=s["ec"], linewidth=2.2)
                i += 1
        ax.text(x0 + (ncol - 1) / 2, 0.9, f"{label}  {n}", ha="center", va="bottom", fontsize=FS, fontweight="bold")
    ax.set_xlim(-0.8, 3 * ncol + 2 * gap)
    ax.set_ylim(-10.6, 2.6)
    ax.axis("off")
    ax.legend(handles=[Line2D([], [], marker=m, ls="", markersize=22, markerfacecolor=f, markeredgecolor=e,
                              markeredgewidth=2.2, label=f"{t} {sum(cnt[(k, s)] for s in ('kept', 'dropped', 'gone'))}")
                       for k, t, (m, f, e) in (("YES", "Yes", ("o", GREEN, GREEN_DARK)),
                                               ("NO", "No", ("s", GREY, "#7d8782")),
                                               ("UNCLEAR", "Unclear", ("D", "white", BLUE)))],
              loc="lower center", bbox_to_anchor=(0.5, -0.03), ncol=3, frameon=False, fontsize=FS, handletextpad=0.2,
              columnspacing=1.2)
    fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
    save(fig, "2-coded-dots")


# ---- 3. precision ----------------------------------------------------------------------------
def wilson(k, n, z=1.96):
    p = k / n
    d = 1 + z * z / n
    mid = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return mid - h, mid + h


def fig_precision(b2):
    a = json.loads((ROOT / "data/validation/agent_check/agent_check_results.json").read_text())
    human = a["benchmark"]["is_metaresearch"]["human_precision"]
    new = a["new"]["is_metaresearch"]
    oct_ = a["october_corpus_rough"]
    kept = [v for v, s in b2 if s == "kept"]
    k_yes, k_n = kept.count("YES"), len(kept)
    k_ci = wilson(k_yes, k_n)  # not in the source files: Wilson interval on 42 / 100
    assert round(k_yes / k_n, 2) == oct_["kept_precision_human"]
    rows = [  # label, estimate, lo, hi, exploratory
        ("v1 corpus", human["estimate"], *human["ci95"], False),
        ("B2 records\nkept", k_yes / k_n, *k_ci, False),
        ("October\nnewcomers", new["corrected_for_agent_error"], *new["corrected_ci95_bootstrap"], True),
        ("October\noverall", oct_["overall"], *oct_["overall_range_from_entered_ci"], True),
    ]
    fig, ax = plt.subplots(figsize=(13.33, 7.5))
    ax.axvline(0.80, color=INK, ls=(0, (6, 4)), lw=3)
    ax.text(0.80, 3.62, "0.80", ha="center", va="bottom", fontsize=FS, fontweight="bold")
    for y, (lab, e, lo, hi, expl) in enumerate(rows[::-1]):
        col = AMBER if expl else GREEN
        ax.plot([lo, hi], [y, y], color=col, lw=8, solid_capstyle="butt")
        ax.scatter(e, y, s=900, color=col, marker="D" if expl else "o", edgecolor="white", linewidth=3, zorder=3)
        ax.text(hi + 0.025, y + 0.02, f"{e:.2f}", va="center", fontsize=FS, fontweight="bold", color=col if not expl else "#8a5410")
        if expl:
            ax.text(hi + 0.025, y - 0.34, "exploratory", ha="left", va="center", fontsize=FS - 4, style="italic", color="#8a5410")
    ax.set_yticks(range(4), [r[0] for r in rows[::-1]], linespacing=0.85)
    ax.set_xlim(0, 1)
    ax.set_ylim(-0.6, 3.6)
    ax.set_xticks([0, 0.5, 1], ["0", "0.5", "1"])
    ax.tick_params(length=0, pad=10)
    clean(ax)
    ax.spines["left"].set_visible(False)
    fig.tight_layout()
    save(fig, "3-precision")
    print("B2 kept:", f"{k_yes}/{k_n}", [round(x, 2) for x in k_ci])


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true", help="re-query OpenAlex for the B2 records' October status")
    args = ap.parse_args()
    b2 = load_b2(args.refresh)
    fig_versions()
    fig_dots(b2)
    fig_precision(b2)
    print("wrote", OUT)
