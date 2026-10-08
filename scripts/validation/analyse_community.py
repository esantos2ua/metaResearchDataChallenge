"""Analyse the Stage 2 community validation form (F1): tallies, themes, de-identified release.

    python scripts/validation/analyse_community.py [--raw PATH]

Reads the Google Forms export in `data/validation/community/raw/` (git-ignored: it holds names and
emails) and writes, next to it in `data/validation/community/`:

    stage2_responses_deidentified.csv   one row per respondent (R01…), no name, email or timestamp
    stage2_acknowledgements.csv         only respondents who asked to be acknowledged
    stage2_summary.json / .md           closed-question tallies (overall and by community),
                                        free-text theme counts, verbatim free text by respondent ID

Rules:
- The live form did not include the attribution-consent question, so no answer is ever linked to
  a name. Answers are reported by respondent ID and community group only.
- Communities other than AIMOS, SORTEE and SIPS are pooled as "Other": free-text community
  entries can identify a single person.
- An acknowledgement with a blank name falls back to the name given at the top of the form, as
  the form's help text promised. The file carries no community column, so it cannot be joined to
  the de-identified answers through the small community groups. ORCID iDs are normalised and checksum-validated; invalid ones are
  kept but flagged so they are fixed by hand, not silently dropped.
- Free-text themes are coded by hand in THEMES below. They are the only judgement in this script;
  edit them here so every count in the decisions record stays traceable.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from analyse_validation import wilson  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
COMMUNITY = ROOT / "data" / "validation" / "community"
RAW_DIR = COMMUNITY / "raw"

NAMED_COMMUNITIES = ("AIMOS", "SORTEE", "SIPS")

# Column index -> (field name, expected header prefix). The prefix check stops a re-exported form
# with reordered or reworded questions from being tallied under the wrong label.
COLUMNS = {
    0: ("timestamp", "Timestamp"),
    1: ("name", "Your name"),
    2: ("community", "Which community"),
    3: ("answering_as", "Are you answering as yourself"),
    4: ("q1_definition", "1. Our working definition"),
    5: ("q1_change", "What would you change"),
    6: ("q2a_scientometrics", "2. In practice"),
    7: ("q2b_publishing", "2. In practice"),
    8: ("q2c_rdm_open_science", "2. In practice"),
    9: ("q2d_integrity", "2. In practice"),
    10: ("q2e_evaluation_careers", "2. In practice"),
    11: ("q2_missing_domain", "Is a domain missing"),
    12: ("q4a_exclude_classroom_integrity", "4. We consider"),
    13: ("q4b_exclude_applied_reviews", "4. We consider"),
    14: ("q4_borderline", "Reasons or borderline cases"),
    15: ("q5_canadian", '5. "Canadian"'),
    16: ("q5_alternative", "If you would choose a different primary"),
    17: ("q6_anything_else", "6. Anything else"),
    18: ("acknowledge", "Would you like to be acknowledged"),
    19: ("ack_name", "Name, as you would like"),
    20: ("ack_affiliation", "Affiliation(s)"),
    21: ("ack_orcid", "ORCID"),
    22: ("email", "Email"),
}
GRID_ROWS = {6: "[Scientometrics", 7: "[Publishing", 8: "[Research data", 9: "[Research integrity",
             10: "[Research evaluation", 12: "[Student or classroom", 13: "[Applied systematic"}

CLOSED = {
    "q1_definition": "Q1 Working definition",
    "q2a_scientometrics": "Q2a Scientometrics and bibliometrics",
    "q2b_publishing": "Q2b Publishing and scholarly communication",
    "q2c_rdm_open_science": "Q2c Research data management and open science",
    "q2d_integrity": "Q2d Research integrity and misconduct",
    "q2e_evaluation_careers": "Q2e Research evaluation, careers and equity",
    "q4a_exclude_classroom_integrity": "Q4a Exclude classroom academic integrity",
    "q4b_exclude_applied_reviews": "Q4b Exclude applied systematic reviews / meta-analyses",
    "q5_canadian": 'Q5 "Canadian" = any Canadian-affiliated author',
}
SUPPORT = {"Agree", "Is metaresearch"}
FREE_TEXT = ("q1_change", "q2_missing_domain", "q4_borderline", "q5_alternative", "q6_anything_else")
RELEASED = ("respondent_id", "community_group", "answering_as", *CLOSED, *FREE_TEXT)

# Hand-coded free-text themes (E. Santos, 2026-09-29; R34–R36 added 2026-10-02). Keys are respondent IDs, which follow
# submission order. A respondent counts once per theme, whichever box they wrote it in.
THEME_LABELS = {
    "def_theoretical": "Definition: 'empirical' excludes theoretical / conceptual metaresearch",
    "def_reform_goal": "Definition: should state the aim of improving / reforming research",
    "def_broaden_list": "Definition: list is too narrow or should be non-exhaustive",
    "def_distinguish": "Definition: sharpen the boundary with meta-analysis, science studies, or substantive work",
    "dom_methods_stats": "Missing domain: research methods, statistical practice, QRPs, replicability",
    "dom_policy_funding": "Missing domain: science policy and research funding",
    "dom_training_workforce": "Missing domain: research training, pedagogy, scientific workforce",
    "dom_evidence_synthesis": "Missing domain: evidence synthesis / meta-analysis as metaresearch",
    "dom_research_waste": "Missing domain: research waste, efficiency, priority setting",
    "dom_ethics": "Missing domain: research ethics and oversight",
    "dom_science_society": "Missing domain: citizen science, science communication, societies",
    "dom_hps": "Missing domain: philosophy / sociology / history of science",
    "dom_beyond_os": "Missing domain: coverage is too centred on open science",
    "excl_field_level_integrity": "Exclusion 4a: student behaviour studied at field level should stay in",
    "excl_student_rdm": "Exclusion 4a: student RDM / open-science practice studies should stay in",
    "excl_reviews_of_reviews": "Exclusion 4b: studies of the review literature itself should stay in",
    "can_lead_author": "Canadian: large teams with one Canadian are over-counted; prefer lead / majority",
    "can_union": "Canadian: first OR corresponding author OR Canadian funder",
    "can_funder": "Canadian: Canadian funder as primary",
    "can_setting": "Canadian: Canadian data, setting or subject (not in bibliographic metadata)",
    "can_nationality": "Canadian: author nationality or birthplace (not in bibliographic metadata)",
    "blind_replication": "Blind spot: replication, multi-analyst, robustness studies",
    "blind_rr_prereg_policy": "Blind spot: registered reports, preregistration audits, OS policy are in",
    "blind_conceptual_editorial": "Blind spot: conceptual papers and editorials carry no metaresearch tag",
    "blind_language_indigenous": "Blind spot: French / multilingual work, Indigenous research governance",
    "blind_classification_bias": "Blind spot: OpenAlex files methods studies under the substantive field",
    "blind_program_evaluation": "Blind spot: evaluation of interventions and reform programmes",
    "advice_librarians": "Advice: consult systematic-review librarians",
}
THEMES = {
    "R01": ["def_theoretical"],
    "R02": ["dom_training_workforce", "excl_reviews_of_reviews", "can_lead_author",
            "advice_librarians"],
    "R03": ["def_broaden_list", "dom_research_waste", "blind_replication"],
    "R04": ["def_theoretical"],
    "R05": ["def_theoretical", "dom_training_workforce", "blind_conceptual_editorial"],
    "R07": ["dom_methods_stats", "dom_ethics", "dom_science_society", "blind_language_indigenous"],
    "R09": ["dom_methods_stats"],
    "R10": ["dom_methods_stats", "dom_policy_funding"],
    "R12": ["def_distinguish", "dom_methods_stats", "blind_classification_bias"],
    "R13": ["def_theoretical", "dom_methods_stats", "blind_replication", "blind_rr_prereg_policy"],
    "R14": ["def_broaden_list"],
    "R15": ["can_union"],
    "R16": ["dom_evidence_synthesis", "can_setting"],
    "R17": ["def_reform_goal", "dom_policy_funding", "dom_methods_stats", "dom_hps",
            "blind_program_evaluation"],
    "R18": ["def_broaden_list", "dom_methods_stats", "dom_evidence_synthesis", "dom_research_waste",
            "dom_ethics"],
    "R19": ["def_broaden_list", "dom_hps", "blind_replication", "blind_rr_prereg_policy"],
    "R20": ["def_theoretical", "dom_evidence_synthesis", "dom_hps"],
    "R21": ["can_funder"],
    "R22": ["def_distinguish", "can_setting"],
    "R23": ["dom_beyond_os", "can_lead_author", "can_setting"],
    "R24": ["can_lead_author"],
    "R25": ["dom_training_workforce", "excl_field_level_integrity", "can_lead_author"],
    "R26": ["dom_policy_funding"],
    "R29": ["excl_student_rdm", "blind_rr_prereg_policy"],
    "R30": ["def_broaden_list", "can_nationality"],
    "R31": ["dom_policy_funding"],
    "R32": ["def_reform_goal"],
    "R35": ["def_theoretical", "can_setting"],
    "R36": ["def_distinguish", "dom_methods_stats"],
}


def orcid_checksum_ok(orcid: str) -> bool:
    digits = orcid.replace("-", "")
    total = 0
    for ch in digits[:-1]:
        total = (total + int(ch)) * 2
    check = (12 - total % 11) % 11
    return digits[-1] == ("X" if check == 10 else str(check))


def normalise_orcid(raw: str) -> tuple[str, bool]:
    m = re.search(r"(\d{4}-\d{4}-\d{4}-\d{3}[\dX])", raw.upper())
    if not m:
        return raw.strip(), False
    return m.group(1), orcid_checksum_ok(m.group(1))


def community_group(raw: str) -> str:
    return raw.strip() if raw.strip() in NAMED_COMMUNITIES else "Other"


def load(raw_path: Path) -> list[dict]:
    with raw_path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.reader(f))
    header, body = rows[0], rows[1:]
    if len(header) != len(COLUMNS):
        sys.exit(f"{raw_path.name}: expected {len(COLUMNS)} columns, found {len(header)}")
    for i, (field, prefix) in COLUMNS.items():
        if not header[i].startswith(prefix) or (i in GRID_ROWS and GRID_ROWS[i] not in header[i]):
            sys.exit(f"{raw_path.name}: column {i} ({field}) has unexpected header {header[i][:80]!r}")
    records = [{field: row[i].strip() for i, (field, _) in COLUMNS.items()} for row in body]
    records.sort(key=lambda r: datetime.strptime(r["timestamp"], "%m/%d/%Y %H:%M:%S"))
    for n, r in enumerate(records, start=1):
        r["respondent_id"] = f"R{n:02d}"
        r["community_group"] = community_group(r["community"])
    unknown = set(THEMES) - {r["respondent_id"] for r in records}
    if unknown:
        sys.exit(f"THEMES references respondents not in the export: {sorted(unknown)}")
    return records


def tally(records: list[dict]) -> dict:
    out = {}
    groups = ("All", *NAMED_COMMUNITIES, "Other")
    for field, label in CLOSED.items():
        block = {"label": label, "by_group": {}}
        for g in groups:
            sub = [r for r in records if g == "All" or r["community_group"] == g]
            counts = Counter(r[field] for r in sub)
            k = sum(v for a, v in counts.items() if a in SUPPORT)
            p, lo, hi = wilson(k, len(sub))
            block["by_group"][g] = {"n": len(sub), "counts": dict(counts.most_common()),
                                    "support": k, "support_share": p, "ci95": [lo, hi]}
        out[field] = block
    return out


def theme_counts() -> dict:
    counts = Counter(t for themes in THEMES.values() for t in themes)
    return {t: {"label": THEME_LABELS[t], "n": counts[t],
                "respondents": sorted(r for r, ts in THEMES.items() if t in ts)}
            for t in THEME_LABELS}


def acknowledgements(records: list[dict]) -> list[dict]:
    out = []
    for r in records:
        if not r["acknowledge"].startswith("Yes"):
            continue
        orcid, ok = normalise_orcid(r["ack_orcid"]) if r["ack_orcid"] else ("", True)
        out.append({"name": r["ack_name"] or r["name"], "affiliation": r["ack_affiliation"],
                    "orcid": orcid, "orcid_valid": "" if not orcid else ("yes" if ok else "NO — check")})
    return sorted(out, key=lambda a: a["name"].split()[-1].lower())


def pct(x: float) -> str:
    return f"{100 * x:.0f}%"


def render_markdown(summary: dict, records: list[dict]) -> str:
    groups = ("All", *NAMED_COMMUNITIES, "Other")
    n = summary["n_respondents"]
    lines = [
        "# Stage 2 community validation — summary",
        "",
        f"Generated {summary['generated']} by `scripts/validation/analyse_community.py` from "
        f"`{summary['source']['file']}` (sha256 `{summary['source']['sha256'][:12]}…`).",
        "",
        f"**{n} respondents**, all answering as individuals. Responses {summary['window'][0]} to "
        f"{summary['window'][1]}. Community groups: "
        + ", ".join(f"{g} {c}" for g, c in summary["community_groups"].items()) + ".",
        "",
        "No attribution consent was collected, so answers appear by respondent ID only. "
        "The form as fielded had no Q3 (bibliometrics of another discipline).",
        "",
        "## Closed questions",
        "",
        "Support = *Agree* or *Is metaresearch*; 95% Wilson interval.",
        "",
        "| Item | Support | 95% CI | Unsure | Against | " + " | ".join(groups[1:]) + " |",
        "|---|---|---|---|---|" + "---|" * (len(groups) - 1),
    ]
    for field, block in summary["closed"].items():
        a = block["by_group"]["All"]
        against = sum(v for k, v in a["counts"].items() if k in ("Disagree", "Is not metaresearch"))
        per_group = " | ".join(f"{b['support']}/{b['n']}" for g, b in block["by_group"].items() if g != "All")
        lines.append(f"| {block['label']} | {a['support']}/{a['n']} ({pct(a['support_share'])}) | "
                     f"{pct(a['ci95'][0])}–{pct(a['ci95'][1])} | {a['counts'].get('Unsure', 0)} | "
                     f"{against} | {per_group} |")
    lines += ["", "## Free-text themes", "", "Hand-coded; a respondent counts once per theme.", "",
              "| Theme | n | Respondents |", "|---|---|---|"]
    for t in sorted(summary["themes"].values(), key=lambda t: (-t["n"], t["label"])):
        lines.append(f"| {t['label']} | {t['n']} | {', '.join(t['respondents'])} |")
    lines += ["", "## Verbatim free text", ""]
    titles = {"q1_change": "Q1 — what would you change about the definition",
              "q2_missing_domain": "Q2 — missing domains",
              "q4_borderline": "Q4 — reasons or borderline cases for the exclusions",
              "q5_alternative": "Q5 — alternative definition of Canadian",
              "q6_anything_else": "Q6 — anything else"}
    for field, title in titles.items():
        lines += [f"### {title}", ""]
        for r in records:
            text = r[field]
            if text and text.upper() != "N/A":
                lines.append(f"- **{r['respondent_id']}** ({r['community_group']}): "
                             + " ".join(text.split()))
        lines.append("")
    return "\n".join(lines)


def latest_raw() -> Path:
    exports = sorted(RAW_DIR.glob("stage2_responses_export_*.csv"))
    if not exports:
        sys.exit(f"No export in {RAW_DIR}; download the form responses as CSV first.")
    return exports[-1]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--raw", type=Path, default=None, help="form export (default: latest in raw/)")
    ap.add_argument("--out", type=Path, default=COMMUNITY, help="where outputs are written")
    args = ap.parse_args()

    raw = args.raw or latest_raw()
    records = load(raw)
    args.out.mkdir(parents=True, exist_ok=True)

    with (args.out / "stage2_responses_deidentified.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=RELEASED, extrasaction="ignore")
        w.writeheader()
        w.writerows(records)

    acks = acknowledgements(records)
    with (args.out / "stage2_acknowledgements.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["name", "affiliation", "orcid", "orcid_valid"])
        w.writeheader()
        w.writerows(acks)

    stamps = [datetime.strptime(r["timestamp"], "%m/%d/%Y %H:%M:%S").date().isoformat() for r in records]
    summary = {
        "generated": date.today().isoformat(),
        "source": {"file": raw.name, "sha256": hashlib.sha256(raw.read_bytes()).hexdigest()},
        "n_respondents": len(records),
        "window": [stamps[0], stamps[-1]],
        "community_groups": dict(Counter(r["community_group"] for r in records).most_common()),
        "answering_as": dict(Counter(r["answering_as"] for r in records)),
        "n_acknowledged": len(acks),
        "closed": tally(records),
        "themes": theme_counts(),
    }
    (args.out / "stage2_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n",
                                                  encoding="utf-8")
    (args.out / "stage2_summary.md").write_text(render_markdown(summary, records) + "\n", encoding="utf-8")

    bad = [a["name"] for a in acks if a["orcid_valid"].startswith("NO")]
    print(f"{len(records)} respondents, {len(acks)} to acknowledge -> {args.out.relative_to(ROOT)}")
    if bad:
        print(f"ORCID fails checksum, confirm by hand: {', '.join(bad)}")


if __name__ == "__main__":
    main()
