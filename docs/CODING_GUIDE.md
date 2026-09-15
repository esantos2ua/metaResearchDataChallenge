# Canadian Metaresearch Dashboard: Validation Coding Guide (B2)

**Version:** 1.0 (Frozen 2026-09-15)  
**Target Sample:** 200 records randomly drawn from the frozen Canadian corpus (`corpus-v1`, 6 topics).  
**Design:** Every record is double-coded independently (50 records per coder, 8 coders in 4 pairs). Disagreements are adjudicated by a third coder from the co-lead team.  
**Estimated Time:** ~45–60 minutes per coder (1–2 minutes per record).

---

## 1. What You Will See

For each record, you will be given:
- **Title**
- **Abstract** (if available)
- **Venue** (Journal / Book / Repository / Conference)
- **Publication Year**
- **Author Affiliations**

> [!NOTE]
> Coders work **blind to the OpenAlex topic assignment** (the topic assignment is what we are testing).

---

## 2. The Two Questions to Answer

For each record, you will record your judgement on two questions:

### Question 1: Is this work metaresearch?
- `YES` (In scope)
- `NO` (Out of scope / false positive)
- `UNCLEAR` (Cannot determine from title and abstract alone)

### Question 2: Is this work Canadian?
- `YES` (At least one author has an affiliation at a Canadian university, institute, hospital, government agency, or company)
- `NO` (No Canadian affiliation identified)
- `UNCLEAR` (Affiliation information missing or ambiguous)

---

## 3. Inclusion & Exclusion Criteria (Adjudicated Consensus)

### What Counts as Metaresearch (IN SCOPE):
Metaresearch is the empirical study of research itself — its methods, reporting, reproducibility, evaluation, incentives, and governance.

1. **Scientometrics & Bibliometrics:**
   - Quantitative analysis of scientific literature, citations, co-authorship networks, and scholarly impact.
   - **Disciplinary bibliometrics:** Papers that perform a bibliometric or citation analysis *of another discipline* (e.g., *"A bibliometric analysis of nursing research"*, *"Mapping 30 years of orthopedic surgery"*) are **IN SCOPE**.
2. **Publishing & Scholarly Communication:**
   - Studies of open access, journal policies, APCs, predatory journals, preprints, peer review practices, editorial standards, and authorship disputes.
3. **Research Data Management & Open Science:**
   - Studies of data sharing, code availability, FAIR principles, data repositories, institutional RDM policies, and reproducibility practices.
4. **Research Integrity & Misconduct:**
   - Studies of fabrication, falsification, plagiarism in academic research, retractions, conflicts of interest, and institutional research integrity policies.
5. **Research Evaluation, Careers & Equity:**
   - Studies evaluating grant peer review, researcher assessment indicators, academic hiring/promotion criteria, and diversity/equity within the scientific workforce.

---

### What Does NOT Count as Metaresearch (OUT OF SCOPE / FALSE POSITIVES):

1. **Student / Classroom Academic Integrity:**
   - Papers on undergraduate classroom cheating, exam dishonesty, homework copying, contract cheating services for courses, and online classroom proctoring are **OUT OF SCOPE**.
   - *(Note: Studies on graduate student research ethics training or scientific misconduct by trainees remain IN SCOPE).*
2. **Applied Systematic Reviews and Meta-Analyses:**
   - Standard clinical or applied systematic reviews evaluating treatment efficacy, clinical trials, or ecological evidence (e.g., *"Efficacy of Drug X vs Placebo: A Systematic Review"*) are **OUT OF SCOPE**.
   - *(Note: Only methodological studies evaluating systematic review practices, reporting quality, or research waste are IN SCOPE).*
3. **Pure Computational Software & Tools:**
   - Development of standard scientific software libraries, bioinformatics pipelines, or computational simulations without an empirical study of the research process itself are **OUT OF SCOPE**.
4. **General Higher Education / Pedagogy:**
   - General curriculum design, teaching methods, student grade satisfaction, or classroom pedagogy (unless specifically addressing the training of research practices) are **OUT OF SCOPE**.
5. **Paratext:**
   - Journal covers, table of contents, author indexes, editorial board listings, call-for-papers announcements, and publisher back matter are **OUT OF SCOPE**.

---

## 4. Disagreement Adjudication & Precision Rules

1. **Independence:** Do not discuss individual records with your coding partner until after your independent sheets are submitted.
2. **Disagreements:** If Coder 1 and Coder 2 disagree (`YES` vs `NO`), an adjudicator (one of the project co-leads: Losia, Shinichi, Marija, or Eduardo) will independently review and make the final determination.
3. **Conservative Evaluation Rule:** Per our preregistered protocol, any record adjudicated as `UNCLEAR` will be treated as **out-of-scope (NO)** in the primary precision estimate. Precision will also be reported with `UNCLEAR` excluded from the denominator in sensitivity reporting.
