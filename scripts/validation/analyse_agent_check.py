"""Analyse the agent coding check (deviation D6): AI agents double-code 50 works new in the
October OpenAlex pull, blind, mixed with the 200 human-coded B2 records as a benchmark.

    python3 scripts/validation/analyse_agent_check.py disputes   # sheet for the agent adjudicator
    python3 scripts/validation/analyse_agent_check.py results    # after the adjudication is back

Inputs in data/validation/agent_check/: key_map.csv, batch_{1,2}.csv (from sample_agent_check.py),
returned/coder_{A,B}_batch_1.csv, returned/coder_{C,D}_batch_2.csv, returned/adjudication.csv.
Human truth: the final verdicts in data/validation/relevance_sample_2026-10-07.csv.

Rules mirror B2: agreed codes stand; disagreements go to a blind agent adjudicator; UNCLEAR
counts as out of scope in the primary estimate. Agent precision on the new works is reported raw
and corrected for the agents' measured sensitivity and specificity against the human benchmark
(Rogan–Gladen), which is exploratory.
"""

from __future__ import annotations

import csv
import json
import random
import sys
from pathlib import Path

from analyse_validation import QUESTIONS, cohen_kappa, gwet_ac1, wilson

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "data" / "validation" / "agent_check"
RET = DIR / "returned"
HUMAN = ROOT / "data" / "validation" / "relevance_sample_2026-10-07.csv"
COMPARISON = ROOT / "data" / "versions" / "comparison.json"
PAIRS = {1: ("A", "B"), 2: ("C", "D")}
RETAINED_PRECISION = (42, 100)  # B2 records still in the October corpus: YES / total (CORPUS-VERSIONS.md)


def read(path: Path) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def codings() -> dict[str, dict]:
    """{key: {"a": row, "b": row}} for every key, checked complete."""
    out = {}
    for batch, (ca, cb) in PAIRS.items():
        keys = [r["key"] for r in read(DIR / f"batch_{batch}.csv")]
        rows = {c: {r["key"]: r for r in read(RET / f"coder_{c}_batch_{batch}.csv")} for c in (ca, cb)}
        for c, got in rows.items():
            missing = set(keys) - set(got)
            bad = [k for k, r in got.items() for f in QUESTIONS.values() if r[f].strip().upper() not in ("YES", "NO", "UNCLEAR")]
            if missing or bad:
                sys.exit(f"coder {c}: {len(missing)} missing, {len(bad)} invalid values")
        for k in keys:
            out[k] = {"a": rows[ca][k], "b": rows[cb][k]}
    return out


def v(row: dict, field: str) -> str:
    return row[field].strip().upper()


def cmd_disputes() -> None:
    cods = codings()
    batch = {r["key"]: r for n in PAIRS for r in read(DIR / f"batch_{n}.csv")}
    disputed = [k for k, c in cods.items() if any(v(c["a"], f) != v(c["b"], f) for f in QUESTIONS.values())]
    with open(DIR / "adjudication_sheet.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(batch[disputed[0]].keys()) + ["disputed_questions"])
        w.writeheader()
        for k in disputed:
            qs = [f for f in QUESTIONS.values() if v(cods[k]["a"], f) != v(cods[k]["b"], f)]
            w.writerow({**batch[k], "disputed_questions": " ".join(qs)})
    print(f"{len(disputed)} disputed records -> {(DIR / 'adjudication_sheet.csv').relative_to(ROOT)}")


def prop(k: int, n: int) -> dict:
    p, lo, hi = wilson(k, n)
    return {"yes": k, "n": n, "estimate": round(p, 3), "ci95": [round(lo, 3), round(hi, 3)]}


def corrected_ci(bench: list[tuple[bool, bool]], new: list[bool], reps: int = 5000) -> list[float]:
    """Percentile bootstrap of the Rogan–Gladen estimate, resampling benchmark and new records."""
    rng, out = random.Random(1), []
    for _ in range(reps):
        b = [rng.choice(bench) for _ in bench]
        n = [rng.choice(new) for _ in new]
        pos, neg = [g for h, g in b if h], [g for h, g in b if not h]
        if not pos or not neg:
            continue
        se, sp = sum(pos) / len(pos), 1 - sum(neg) / len(neg)
        if se + sp <= 1:
            continue
        out.append(min(1.0, max(0.0, (sum(n) / len(n) + sp - 1) / (se + sp - 1))))
    out.sort()
    return [round(out[int(0.025 * len(out))], 3), round(out[int(0.975 * len(out)) - 1], 3)]


def cmd_results() -> None:
    cods = codings()
    adj = {r["key"]: r for r in read(RET / "adjudication.csv")}
    keymap = {r["key"]: r for r in read(DIR / "key_map.csv")}
    human = {r["record_id"]: r for r in read(HUMAN)}

    final = {}
    for k, c in cods.items():
        final[k] = {}
        for f in QUESTIONS.values():
            a, b = v(c["a"], f), v(c["b"], f)
            final[k][f] = a if a == b else (v(adj[k], f) if k in adj and adj[k].get(f) else "UNCLEAR")

    res = {"agreement_between_agents": {}, "benchmark": {}, "new": {}}
    for f in QUESTIONS.values():
        a = [v(c["a"], f) for c in cods.values()]
        b = [v(c["b"], f) for c in cods.values()]
        res["agreement_between_agents"][f] = {
            "raw": round(sum(x == y for x, y in zip(a, b)) / len(a), 3),
            "kappa": round(cohen_kappa(a, b), 2), "ac1": round(gwet_ac1(a, b), 2)}

    bench = [k for k, m in keymap.items() if m["source"] == "benchmark"]
    new = [k for k, m in keymap.items() if m["source"] == "new"]
    for f in QUESTIONS.values():
        hf = f"{f}_final"
        h = [human[keymap[k]["source_id"]][hf] for k in bench]
        g = [final[k][f] for k in bench]
        hy, gy = [x == "YES" for x in h], [x == "YES" for x in g]
        tp = sum(x and y for x, y in zip(hy, gy))
        tn = sum(not x and not y for x, y in zip(hy, gy))
        sens, spec = tp / sum(hy), tn / (len(hy) - sum(hy))
        res["benchmark"][f] = {
            "human_precision": prop(sum(hy), len(hy)), "agent_precision": prop(sum(gy), len(gy)),
            "kappa_agent_vs_human": round(cohen_kappa(h, g), 2),
            "agreement_yes_vs_not": round(sum(x == y for x, y in zip(hy, gy)) / len(hy), 3),
            "sensitivity": round(sens, 3), "specificity": round(spec, 3)}
        k_new = sum(final[k][f] == "YES" for k in new)
        raw = prop(k_new, len(new))
        corr = None
        if sens + spec > 1:
            corr = round(min(1.0, max(0.0, (k_new / len(new) + spec - 1) / (sens + spec - 1))), 3)
        res["new"][f] = {"agent_precision": raw, "corrected_for_agent_error": corr,
                         "corrected_ci95_bootstrap": corrected_ci(list(zip(hy, gy)),
                                                                  [final[k][f] == "YES" for k in new])}

    flows = json.loads(COMPARISON.read_text())["flows"]["v1->oct"]
    kept, entered = flows["kept"], flows["entered"]
    p_new = res["new"]["is_metaresearch"]["corrected_for_agent_error"] or res["new"]["is_metaresearch"]["agent_precision"]["estimate"]
    p_kept = RETAINED_PRECISION[0] / RETAINED_PRECISION[1]
    res["october_corpus_rough"] = {
        "kept_works": kept, "kept_precision_human": p_kept, "entered_works": entered,
        "entered_precision_agent": p_new,
        "overall": round((kept * p_kept + entered * p_new) / (kept + entered), 3),
        "overall_range_from_entered_ci": [
            round((kept * p_kept + entered * x) / (kept + entered), 3)
            for x in res["new"]["is_metaresearch"]["corrected_ci95_bootstrap"]],
        "metaresearch_works_estimate": round(kept * p_kept + entered * p_new),
        "v1_metaresearch_works_estimate": round(9464 * 0.27)}

    (DIR / "agent_check_results.json").write_text(json.dumps(res, indent=2))
    with open(DIR / "agent_check_final.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["key", "source", "source_id", "is_metaresearch_final", "is_canadian_final"])
        for k in sorted(final):
            w.writerow([k, keymap[k]["source"], keymap[k]["source_id"], final[k]["is_metaresearch"], final[k]["is_canadian"]])
    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    {"disputes": cmd_disputes, "results": cmd_results}[sys.argv[1] if len(sys.argv) > 1 else "results"]()
