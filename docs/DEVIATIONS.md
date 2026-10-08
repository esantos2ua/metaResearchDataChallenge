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
| **Decided** | 2026-10-08, by Eduardo Santos (project lead). **After** the results were seen. Co-lead confirmation pending. |

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
