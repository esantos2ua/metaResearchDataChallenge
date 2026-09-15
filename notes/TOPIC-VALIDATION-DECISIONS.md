# Topic and Search-String Validation: Adjudication Record

**Date:** 2026-09-15  
**Context:** Formal adjudication of team responses to [`TOPIC-VALIDATION.md`](file:///Users/eduardosantos/Documents/Repos/metaResearchDataChallenge/notes/TOPIC-VALIDATION.md) (Phase 1 Codesign).  
**Adjudication Body:** Eduardo S. A. Santos (Lead Coordinator) in consultation with Shinichi Nakagawa, Małgorzata (Losia) Lagisz, and Marija Purgar.

---

## 1. Summary of Responses

The validation questionnaire was open to the 11 confirmed team members from September 4 to September 11, 2026. A total of **8 members responded**:
- Bruno Eleres Soares (University of Regina)
- Małgorzata (Losia) Lagisz (University of Alberta / COSSEE)
- Elena Gazzea (University of Alberta / COSSEE)
- Gichaba Vincent Makini (Tharaka University / MATE)
- Marija Purgar (University of Alberta / COSSEE)
- Valentin Lucet (Concordia University, Montreal)
- Shinichi Nakagawa (University of Alberta / COSSEE)
- Stephanie Flaman (University of Alberta / COSSEE)

---

## 2. Adjudicated Decisions

### Decision 1: Primary Definition of Canadian Affiliation
- **Options Considered:**
  1. *Any author affiliated with a Canadian institution* (`institutions.country_code:ca`) as primary retrieval; first author, corresponding author, and Canadian funder as sensitivity subsets.
  2. *First or last author* as primary retrieval (suggested by V. Lucet).
  3. *At least two co-authors* with Canadian affiliation.
- **Vote:** 7 Agree, 1 Unsure (V. Lucet), 0 Disagree.
- **Decision:** **RETAIN "ANY CO-AUTHOR" AS PRIMARY RETRIEVAL.**
- **Reason:** Metaresearch is highly collaborative and internationally distributed. Narrowing the primary retrieval would drop landmark collaborative multi-analyst projects with critical Canadian leadership (e.g. Gould et al. 2025, Noble et al. 2025). The sensitivity dashboard switcher allows users to inspect first-author and corresponding-author subsets dynamically.

---

### Decision 2: Date Floor of 1970
- **Options Considered:** 1970 floor vs. older date floor (e.g., S. Nakagawa: *"could be older and"*).
- **Vote:** 7 Agree, 1 Unsure, 0 Disagree.
- **Decision:** **RETAIN 1970 FLOOR.**
- **Reason:** Scientometrics/bibliometrics were coined c. 1969. Earlier items tagged with these topics in OpenAlex are overwhelmingly misclassified digitised historical books, journals, or archival paratext. Pre-1970 records degrade precision without adding true modern metaresearch.

---

### Decision 3: The Five Core Topics
- **T10102 Scientometrics and bibliometrics research:** 6 Keep, 2 Unsure, 0 Drop -> **KEEP**
- **T13607 Academic Publishing and Open Access:** 8 Keep (Unanimous) -> **KEEP**
- **T13516 Publishing and Scholarly Communication:** 8 Keep (Unanimous) -> **KEEP**
- **T11492 Academic integrity and plagiarism:** 7 Keep, 1 Unsure, 0 Drop -> **KEEP**
- **T13976 Web visibility and informetrics:** 7 Keep, 1 Unsure, 0 Drop -> **KEEP**
- **Decision:** **RETAIN ALL FIVE CORE TOPICS.**

---

### Decision 4: Borderline Cases for Manual Coding
1. **Bibliometric analyses of another discipline** (e.g. "a bibliometric analysis of nursing research"):
   - **Vote:** 5 In (62.5%), 2 Out (25%), 1 Unsure (12.5%).
   - **Decision:** **CODED AS IN-SCOPE.**
   - **Reason:** Bibliometrics is a foundational metaresearch methodology. Mapping literature, citation networks, and publication patterns of any scientific domain represents quantitative study of science.
2. **Student / classroom academic integrity** (exam cheating, contract cheating, proctoring):
   - **Vote:** 4 Out (50%), 3 In (37.5%), 1 Unsure (12.5%).
   - **Decision:** **CODED AS OUT-OF-SCOPE (FALSE POSITIVE).**
   - **Reason:** Student cheating in coursework focuses on pedagogy and educational discipline rather than the research enterprise. Topic T11492 cannot be split at retrieval time in OpenAlex without dropping research misconduct papers, so student cheating will be screened out during manual validation coding to quantify this known false-positive rate.

---

### Decision 5: Addition of Candidate Topic T11937 (Research Data Management Practices)
- **Vote:** 8 of 8 respondents (100% Unanimous) voted to add T11937.
- **Empirical Testing:** Nominated seed papers (e.g., Roche et al. 2015 *PLoS Biol*; Ivimey-Cook et al. 2025 *Proc Roy Soc B*; Bledsoe et al. 2022 *Proc Roy Soc B*; Roche et al. 2022 *Proc Roy Soc B*) were tagged by OpenAlex *solely* with T11937 and were missed by the 5-topic baseline.
- **Impact:** Adding T11937 increases the Canadian corpus from 7,393 to 9,464 works (+2,071 works, +28.0%).
- **Decision:** **ACCEPT T11937 INTO THE FROZEN CORPUS DEFINITION.**
- **Other Topics:** Topics such as T11986 (+5,067 works, mostly bioinformatics software engineering) and T10206 (+9,411 works, mostly applied clinical systematic reviews) are **REJECTED** to preserve precision and prevent thematic dilution.

---

### Decision 6: The Keyword Layer
- **Vote:** 4 Off, 3 Unsure, 1 On (strict terms only).
- **Decision:** **DISABLE KEYWORD LAYER IN PRIMARY FROZEN CORPUS.**
- **Reason:** Lexical searches with terms like `reproducibility` and `meta-research` inflate the corpus by 900% (63,000+ works). Remaining topic-driven preserves transparency and auditability.

---

## 3. Seed Resolution & The Clinical Metaresearch Blind Spot

All 35+ nominated seed works were resolved against OpenAlex. Key outcomes:
- Inclusion of T11937 rescued major open science papers that were otherwise absent.
- **Critical Finding for Bias Report:** Canadian clinical metaresearch papers (e.g., trial registration audits, research waste assessments, reporting guidelines adherence nominated by S. Flaman) are almost universally tagged by OpenAlex under `T10206 (Meta-analysis and systematic reviews)` or clinical topics. Because T10206 is dominated by applied medical reviews, it cannot be included wholesale. This reveals a structural classification gap in OpenAlex's topic assignment for medical metaresearch.

---

## 4. Phase 2 Validation Coding Assignments (Sep 15–26, 2026)

Sample size: 200 randomly sampled records from the frozen corpus.  
Double-coded: Every record coded independently by 2 coders (400 codings total; 50 records/coder).

| Pair | Coder 1 | Coder 2 | Records |
| :---: | :--- | :--- | :---: |
| **1** | Bruno Soares | Elena Gazzea | 1–50 |
| **2** | Stephanie Flaman | Valentin Lucet | 51–100 |
| **3** | Shinichi Nakagawa | Losia Lagisz | 101–150 |
| **4** | Marija Purgar | Eduardo Santos | 151–200 |

- **Adjudication:** Co-leads (Eduardo, Shinichi, Losia, Marija) adjudicate disagreements.
- **French Copy Review:** Valentin Lucet confirmed to review French-language dashboard copy in late September.

---

## 5. Frozen Corpus & Coding Package Status

- **Frozen Corpus Dataset:** [`dashboard/app/data/records.json`](file:///Users/eduardosantos/Documents/Repos/metaResearchDataChallenge/dashboard/app/data/records.json) (9,464 works, version `2026-09-15-frozen-v1`, retrieval date 2026-09-15).
- **Snapshot Provenance:** Documented in [`data/raw/SNAPSHOT.md`](file:///Users/eduardosantos/Documents/Repos/metaResearchDataChallenge/data/raw/SNAPSHOT.md).
- **Validation Coding Guide:** [`docs/CODING_GUIDE.md`](file:///Users/eduardosantos/Documents/Repos/metaResearchDataChallenge/docs/CODING_GUIDE.md).
- **Coding Sample Sheets:**
  - Full blinded dataset: [`data/validation/validation_sample_200_blinded.csv`](file:///Users/eduardosantos/Documents/Repos/metaResearchDataChallenge/data/validation/validation_sample_200_blinded.csv)
  - Pair 1 (Bruno & Elena, 1–50): [`data/validation/coding_sheet_pair1_bruno_elena_records_001_050.csv`](file:///Users/eduardosantos/Documents/Repos/metaResearchDataChallenge/data/validation/coding_sheet_pair1_bruno_elena_records_001_050.csv)
  - Pair 2 (Stephanie & Valentin, 51–100): [`data/validation/coding_sheet_pair2_stephanie_valentin_records_051_100.csv`](file:///Users/eduardosantos/Documents/Repos/metaResearchDataChallenge/data/validation/coding_sheet_pair2_stephanie_valentin_records_051_100.csv)
  - Pair 3 (Shinichi & Losia, 101–150): [`data/validation/coding_sheet_pair3_shinichi_losia_records_101_150.csv`](file:///Users/eduardosantos/Documents/Repos/metaResearchDataChallenge/data/validation/coding_sheet_pair3_shinichi_losia_records_101_150.csv)
  - Pair 4 (Marija & Eduardo, 151–200): [`data/validation/coding_sheet_pair4_marija_eduardo_records_151_200.csv`](file:///Users/eduardosantos/Documents/Repos/metaResearchDataChallenge/data/validation/coding_sheet_pair4_marija_eduardo_records_151_200.csv)
- **Master Evaluation File:** [`data/validation/validation_sample_200_master.json`](file:///Users/eduardosantos/Documents/Repos/metaResearchDataChallenge/data/validation/validation_sample_200_master.json)
