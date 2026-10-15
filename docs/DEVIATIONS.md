# Deviations from the preregistration

The preregistration commits us to log every deviation here: what changed, when, why, who decided,
and **whether it was decided before or after the relevant results were seen**. A change made after
seeing results is not disqualifying; concealing it would be.

Results referred to below: [`data/validation/validation_results.md`](../data/validation/validation_results.md)
(B2 coding of a 200-record sample, final 2026-10-07).

---

## D1. Coder agreement below threshold: no second coding round before the conference

| | |
|---|---|
| **Registered** | Cohen's κ ≥ 0.70 on each question. If not met: "Retrain coders on the guide, re-code, report both rounds." |
| **Result** | κ = 0.31 for *is_metaresearch*, 0.44 for *is_canadian* (pooled over the four coder pairs). |
| **What we did instead** | We report round 1 only. Round 2 (retraining on a clarified coding guide, then re-coding) is planned after the conference and will be reported next to round 1. |
| **Why** | The conference talk is on 2026-10-28. Retraining eight volunteer coders, re-coding 200 records and adjudicating again does not fit before then. |
| **Mitigations** | Every disagreement (76 on Q1, 14 on Q2) was adjudicated blind by a co-lead outside the pair, so the precision estimate does not rest on any single coder. κ stays the headline agreement statistic. Pair-level κ is published. |
| **Decided** | 2026-10-08, by Eduardo Santos (project lead). **After** the results were seen. Confirmed by the co-leads on 2026-10-15. |

## D2. Supplementary agreement statistics

| | |
|---|---|
| **Registered** | Cohen's κ only. |
| **Change** | Gwet's AC1 and per-category specific agreement are reported alongside κ, never instead of it. |
| **Why** | Almost every record is Canadian, so κ on Q2 is low despite 93% raw agreement (the kappa paradox). AC1 shows this; for Q1, AC1 (0.48) confirms the disagreement is real. |
| **Decided** | 2026-10-05, by Eduardo Santos. **After** the provisional results were seen. |

## D3. Precision below threshold: tightened-query variant not yet reported

| | |
|---|---|
| **Registered** | Precision ≥ 0.80. If not met: "Report as-is **and** report a tightened-query variant as a sensitivity analysis; do not silently swap the primary definition." |
| **Result** | Q1 precision 0.27 (95% CI 0.21–0.33). The primary corpus is unchanged and reported as-is. |
| **What we did instead, for now** | The tightened variant has not been defined yet. In the meantime, the dashboard shows the measured precision next to each of the six topics and lets users untick the less precise ones. This is an exploratory reading aid, not the registered sensitivity analysis: per-topic samples are small (7 to 72 records), and topics chosen by looking at these numbers would be tuned to this sample. |
| **Next** | Define the tightened variant **before** scoring it, and estimate its precision on a fresh sample rather than re-scoring this one. |
| **Decided** | 2026-10-08, by Eduardo Santos. **After** the results were seen. |

## D4. Recall and database benchmark not completed before the conference

| | |
|---|---|
| **Registered** | Recall against a community-curated seed set (≥ 150 nominations, target ≥ 0.85), and a coverage benchmark against one comparator database (Web of Science or Scopus), both before the conference. |
| **Status** | Neither is complete. No community seed set was collected: the only nominations are 35 works from the eight team members in Phase 1, and they were used to choose the topic set, so they cannot give an unbiased recall. We have no API access to Scopus or Web of Science from the project pipeline. |
| **Decided** | 2026-10-08, by Eduardo Santos. |

## D5. October OpenAlex release: corpus re-pulled for comparison, primary corpus unchanged

| | |
|---|---|
| **Registered** | One dated, version-pinned pull (2026-09-15, `2026-09-15-frozen-v1`) is the corpus. |
| **What happened** | OpenAlex re-tagged every work with a new topic classifier and merged ~14M duplicates (release of 2026-10-14). The unchanged `query_config.yaml` now returns 20,369 works instead of 9,464; 5,232 of the v1 works remain. |
| **What we did** | v1 stays the primary corpus on the dashboard and in the release. We re-pulled the corpus as a comparison (`data/raw/records_2026-10-14.json`), compared pilot, v1 and October in [`CORPUS-VERSIONS.md`](CORPUS-VERSIONS.md), and checked which B2-coded records the new classifier kept (exploratory: 42 of the 100 that stayed are metaresearch). |
| **Why** | v1 is the only version whose precision people measured. Replacing it would be the silent swap the preregistration rules out. |
| **Decided** | 2026-10-15, by Eduardo Santos. **After** the October counts and the retention of the B2 records were seen. |

## D6. AI agents as coders for a first precision reading of the October corpus

| | |
|---|---|
| **Registered** | Human double-coding only. |
| **What we did** | A quick check, not a replacement for B2: 50 works that entered with the October release (era-stratified, seed 20261015) were mixed with the 200 human-coded B2 records, shuffled and relabelled, and double-coded blind by four AI agent instances (two per half) using `CODING_GUIDE.md` only, with OpenAlex IDs and DOIs removed. Disagreements went to a blind agent adjudicator. The 200 B2 records are the benchmark: agent verdicts are scored against the human finals, and the precision on the 50 new works is reported raw and corrected for the agents' measured sensitivity and specificity. Scripts: `sample_agent_check.py`, `analyse_agent_check.py`; outputs in `data/validation/agent_check/`. |
| **Why** | Three quarters of the October corpus has never been coded, and a human round does not fit before 2026-10-28. |
| **Limits** | The four agents are instances of one model with the same instructions, so their errors are correlated and their agreement overstates independence. 50 records give a wide interval. The result is labelled exploratory everywhere it appears. |
| **Decided** | 2026-10-15, by Eduardo Santos, at the co-leads' suggestion of a quick check. **Before** any agent result was seen. |
