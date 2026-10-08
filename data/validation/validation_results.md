# B2 validation results

Generated 2026-10-07. Stratified random sample of 200 records from `corpus-v1`, every record double-coded blind to its OpenAlex topic; disagreements adjudicated blind.

## Precision

| Question | YES / NO / UNCLEAR | Primary (UNCLEAR = out) | UNCLEAR excluded |
| --- | --- | --- | --- |
| Q1 Metaresearch | 53 / 139 / 8 | 0.27 (95% CI 0.21–0.33) | 0.28 (95% CI 0.22–0.34) (n = 192) |
| Q2 Canadian | 188 / 7 / 5 | 0.94 (95% CI 0.90–0.97) | 0.96 (95% CI 0.93–0.98) (n = 195) |
| Q1 and Q2 | 50 / 137 / 13 | 0.25 (95% CI 0.20–0.31) | 0.27 (95% CI 0.21–0.34) (n = 187) |

## Inter-coder agreement (before adjudication)

| Question | Raw agreement | Cohen κ (pooled) | Fleiss κ | Gwet AC1 | Specific agreement YES / NO / UNCLEAR |
| --- | --- | --- | --- | --- | --- |
| is_metaresearch | 62.0% | 0.31 | 0.31 | 0.48 | 0.62 / 0.69 / 0.18 |
| is_canadian | 93.0% | 0.44 | 0.43 | 0.93 | 0.97 / 0.40 / 0.36 |

Cohen κ is the preregistered index (target ≥ 0.70). When one answer dominates (Q2 is nearly all YES), κ can be low despite high raw agreement (the kappa paradox), so Gwet's AC1 and per-category specific agreement are added as a **declared deviation**: supplementary, not a replacement for κ.

| Pair | κ Q1 | κ Q2 | AC1 Q1 | AC1 Q2 | Agreement Q1 | Agreement Q2 |
| --- | --- | --- | --- | --- | --- | --- |
| pair1 | 0.15 | 0.47 | 0.25 | 0.91 | 46% | 92% |
| pair2 | 0.50 | 0.66 | 0.58 | 0.98 | 70% | 98% |
| pair3 | 0.24 | 0.00 | 0.44 | 0.87 | 58% | 88% |
| pair4 | 0.53 | 0.64 | 0.64 | 0.93 | 74% | 94% |

## Exploratory: Q1 precision by era

| Group | n | YES | Primary precision |
| --- | --- | --- | --- |
| 1970-1999 | 12 | 2 | 0.17 (95% CI 0.05–0.45) |
| 2000-2014 | 49 | 14 | 0.29 (95% CI 0.18–0.42) |
| 2015-present | 139 | 37 | 0.27 (95% CI 0.20–0.35) |

## Exploratory: Q1 precision by language

| Group | n | YES | Primary precision |
| --- | --- | --- | --- |
| en | 186 | 52 | 0.28 (95% CI 0.22–0.35) |
| fr | 4 | 0 | 0.00 (95% CI 0.00–0.49) |
| other | 3 | 0 | 0.00 (95% CI 0.00–0.56) |
| unknown | 7 | 1 | 0.14 (95% CI 0.03–0.51) |

## Exploratory: Q1 precision by how the record entered the corpus

| Group | n | YES | Primary precision |
| --- | --- | --- | --- |
| primary topic | 109 | 29 | 0.27 (95% CI 0.19–0.36) |
| secondary topic only | 91 | 24 | 0.26 (95% CI 0.18–0.36) |

## Exploratory: Q1 precision by corpus topic (a record with several topics counts in each)

| Group | n | YES | Primary precision |
| --- | --- | --- | --- |
| T10102 Scientometrics and bibliometrics research | 72 | 35 | 0.49 (95% CI 0.37–0.60) |
| T11492 Academic integrity and plagiarism | 29 | 5 | 0.17 (95% CI 0.08–0.35) |
| T11937 Research Data Management Practices | 57 | 18 | 0.32 (95% CI 0.21–0.44) |
| T13516 Publishing and Scholarly Communication | 28 | 4 | 0.14 (95% CI 0.06–0.31) |
| T13607 Academic Publishing and Open Access | 61 | 16 | 0.26 (95% CI 0.17–0.38) |
| T13976 Web visibility and informetrics | 7 | 1 | 0.14 (95% CI 0.03–0.51) |

Subgroup intervals are wide by design; they are exploratory, not tests.
