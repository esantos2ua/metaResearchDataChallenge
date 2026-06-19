# Canadian Metaresearch Data Challenge — Proposal

**Title:** _An Open, Reproducible Dashboard for Mapping the Canadian Metaresearch Landscape_

**Team:** _TBD_

**Submission deadline:** July 1, 2026 · **Notification:** July 10, 2026 · **Conference:** Oct 27–29, 2026 (uOttawa)

---

> Methodology description — **2 pages maximum**. Must address (1) openness, transparency &
> reproducibility; (2) diversity considerations & bias acknowledgment; (3) a work plan for
> pre-conference completion.

## 1. The challenge question — and our answer

> *"How can we construct an open, reproducible, and inclusive dataset that best captures the Canadian metaresearch landscape?"*

**Our answer, in one sentence:** by defining the corpus through a **transparent, versioned query over OpenAlex** that anyone can re-run; **scripting every step** from retrieval to dashboard so the dataset rebuilds with one command; reporting **multiple defensible definitions** of "Canadian" and "metaresearch" side-by-side instead of a single hidden choice; **co-designing inclusion criteria with the community**; and **surfacing the dataset's own gaps** (language, discipline, coverage) directly in the dashboard rather than hiding them.

**Why it matters.** Mapping the Canadian metaresearch ecosystem shows who is shaping research culture, whose voices are missing, and where to improve transparency and equity in science. The deliverable is a live, public **dashboard** (inspired by the [COKI Open Access Dashboard](https://open.coki.ac/)) — already running as a pilot on real OpenAlex data — that lets researchers, funders, and communities explore the landscape and inspect exactly how it was built.

The three commitments the call asks us to evaluate map directly to the sections below: **openness & reproducibility (§6)**, **diversity & bias transparency (§7)**, and a concrete **work plan (§8)**.

## 2. Search & retrieval strategy (OpenAlex)

- Define "metaresearch" [1] via a transparent, versioned query. The pilot corpus (≈4,500 works) is built
  from nine OpenAlex **concepts** (bibliometrics, citation analysis, scientometrics, research integrity,
  scholarly communication, open science, peer review, altmetrics, research assessment); the versioned
  `query_config.yaml` additionally specifies English/French title/abstract **keyword filters** to be
  layered in for the full corpus.
- Restrict to "Canadian" outputs via author **institution country (CA)** in OpenAlex [2]. The pilot uses an
  any-author-affiliation definition; the full study reports **sensitivity checks** on alternatives
  (first/corresponding author, funder) side by side.
- Retrieve via the OpenAlex API [2]; the full corpus pins a **dated snapshot** for reproducibility, with
  coverage benchmarked against established sources (e.g., Web of Science, Scopus) [3].

## 3. Inclusion/exclusion & community codesign

- **Pre-registered** inclusion/exclusion criteria, co-designed and validated through active engagement with
  diverse stakeholders (librarians, researchers, EDI experts, and policymakers) to ensure community
  alignment. Pre-registration of the corpus definition follows open, time-stamped specification practice [4],
  with the criteria versioned in the public repository.
- Meaningful involvement of Indigenous scholars and knowledge keepers to respectfully represent Indigenous
  research methodologies. Where the corpus touches Indigenous-led research or data, we adhere to the First
  Nations principles of **OCAP®** (Ownership, Control, Access, and Possession) [5], the **CARE** Principles
  for Indigenous Data Governance [6], and Chapter 9 of the **Tri-Council Policy Statement (TCPS 2)** on
  research involving First Nations, Inuit, and Métis Peoples [7].
- Multiple "Canadian-ness" definitions reported side-by-side to expose sensitivity (see §2).

## 4. Validation & stakeholder engagement

- Iterative dashboard validation involving target users (institutions, funders, early-career researchers) to guarantee the tool addresses real-world needs.
- Manual validation on a stratified sample; precision/recall against a curated seed set.
- Coverage and language-bias assessment (English/French) — the pilot snapshot is ~94% English with very few
  French-language outputs, a gap the full study quantifies; database language coverage is a known source of
  bias [10], as are OpenAlex/indexing coverage gaps relative to other sources [3].

## 5. Analyses

- **Openness/transparency:** OA status and preprint share (live in the dashboard); data/code-availability
  indicators to be added for the full study.
- **Bibliometrics & citations:** output trends, citation counts, and an open-vs-closed comparison [8], by field.
- **Thematic mapping:** OpenAlex primary-topic and field frequencies in the pilot; formal topic modeling
  (e.g., BERTopic/LDA) for the full study.
- **Network analyses:** co-authorship and institutional collaboration (interactive network in the dashboard).
- **Underrepresented groups:** institution type, region, language, career-stage proxies (planned).

## 6. Openness, transparency & reproducibility

> *How will the project support openness, transparency, and reproducibility — and how will data, code, workflows, and documentation be shared?*

Reproducibility is the project's core design principle: the dataset rebuilds from source with a single command, and every choice is inspectable.

- **Data** — the record-level processed corpus, with a **codebook**, is released **CC BY 4.0** and built to be **FAIR** [9]. A **dated, version-pinned OpenAlex snapshot** keeps results reproducible even as OpenAlex updates.
- **Code** — all extraction, cleaning, analysis, and dashboard code is **MIT-licensed** and public on GitHub.
- **Workflows** — a fully scripted pipeline (raw → processed → dashboard) with pinned software environments; the corpus-defining query lives in one **versioned config** (`query_config.yaml`), so the definition is auditable and re-runnable.
- **Documentation** — a methodology and reproducibility guide and the codebook, plus an in-dashboard **"Search & validation"** panel that displays the exact query, **re-runs it live against OpenAlex**, and spot-checks a random sample for relevance — transparency anyone can exercise in the browser.
- Aligned with the **UNESCO Recommendation on Open Science** [11].

## 7. Diversity, assumptions, limitations & sources of bias

> *How does the proposal account for diversity in metaresearch traditions, research cultures, disciplines, languages, or communities? What are the key assumptions, limitations, and potential sources of bias?*

**Accounting for diversity**
- **Traditions & disciplines** — metaresearch spans quantitative scientometrics, science-and-technology studies, research-integrity and ethics scholarship, and library/information science; our concept set deliberately mixes these, and the dashboard breaks the corpus down by **field, topic, and concept** so no single tradition stands in for the whole.
- **Languages** — English and French are first-class: query, keywords, and dashboard are **bilingual**, and we report the EN/FR balance explicitly (the pilot is ~94% English — itself a finding, not a target).
- **Communities & research cultures** — inclusion criteria are **co-designed** with librarians, researchers, EDI experts, and policymakers; Indigenous-related research follows **OCAP®, CARE, and TCPS 2** (§3).
- **Institutions & regions** — smaller institutions and all regions are tracked, not only the largest universities.

**Key assumptions**
- OpenAlex concepts and affiliations are a usable proxy for "metaresearch" and "Canadian." Both are contestable, so we **test alternative definitions** (§2) rather than assert one.
- Author-affiliation country adequately captures Canadian contribution.

**Limitations & sources of bias**
- **Coverage bias** — OpenAlex favours English-language, journal-based, DOI-bearing outputs; non-English work, grey literature, and community-based scholarship are under-represented [3, 10].
- **Definitional bias** — concept tagging is noisy (broad concepts can pull in false positives, observed in the pilot), and affiliation-based "Canadian" credits a whole work to Canada regardless of contribution share.
- **Metadata gaps** — OpenAlex carries little reliable information on author demographics, career stage, or equity-deserving groups, so EDI analysis relies on coarse proxies and is reported as such.
- We **surface these gaps in the dashboard** rather than hide them, to inform capacity building and equitable policy.

## 8. Work plan (pre-conference)

| Phase | Window | Output |
|-------|--------|--------|
| Corpus definition & retrieval | Jul–Aug 2026 | Query spec + raw snapshot |
| Stakeholder codesign | Aug 2026 | Validated inclusion & dashboard feedback |
| Cleaning & validation | Aug 2026 | Validated dataset + bias report |
| Analyses | Sep 2026 | Bibliometric/network/topic results |
| Dashboard build | Sep–Oct 2026 | Deployed open dashboard |
| Documentation & rehearsal | Oct 2026 | Docs + 30-min plenary talk |

## 9. Outputs

Open dataset (with codebook), reproducible code/workflows, deployed dashboard, and a 30-minute
plenary presentation.

---

## References

> Citations support the methodology; please verify each DOI/URL before final submission.

1. Ioannidis JPA, Fanelli D, Dunne DD, Goodman SN (2015). Meta-research: Evaluation and improvement of research methods and practices. *PLoS Biology* 13(10): e1002264. https://doi.org/10.1371/journal.pbio.1002264
2. Priem J, Piwowar H, Orr R (2022). OpenAlex: A fully-open index of scholarly works, authors, venues, institutions, and concepts. *arXiv* 2205.01833. https://arxiv.org/abs/2205.01833
3. Mongeon P, Paul-Hus A (2016). The journal coverage of Web of Science and Scopus: a comparative analysis. *Scientometrics* 106: 213–228. https://doi.org/10.1007/s11192-015-1765-5
4. Nosek BA, Ebersole CR, DeHaven AC, Mellor DT (2018). The preregistration revolution. *PNAS* 115(11): 2600–2606. https://doi.org/10.1073/pnas.1708274114
5. First Nations Information Governance Centre (FNIGC). The First Nations Principles of OCAP®. https://fnigc.ca/ocap-training/
6. Carroll SR, Garba I, Figueroa-Rodríguez OL, et al. (2020). The CARE Principles for Indigenous Data Governance. *Data Science Journal* 19(1): 43. https://doi.org/10.5334/dsj-2020-043
7. CIHR, NSERC, SSHRC (2022). *Tri-Council Policy Statement: Ethical Conduct for Research Involving Humans (TCPS 2)*, Chapter 9: Research Involving the First Nations, Inuit and Métis Peoples of Canada. https://ethics.gc.ca/eng/policy-politique_tcps2-eptc2_2022.html
8. Piwowar H, Priem J, Larivière V, et al. (2018). The state of OA: a large-scale analysis of the prevalence and impact of Open Access articles. *PeerJ* 6: e4375. https://doi.org/10.7717/peerj.4375
9. Wilkinson MD, Dumontier M, Aalbersberg IJ, et al. (2016). The FAIR Guiding Principles for scientific data management and stewardship. *Scientific Data* 3: 160018. https://doi.org/10.1038/sdata.2016.18
10. Vera-Baceta MA, Thelwall M, Kousha K (2019). Web of Science and Scopus language coverage. *Scientometrics* 121: 1803–1813. https://doi.org/10.1007/s11192-019-03264-z
11. UNESCO (2021). *Recommendation on Open Science*. https://doi.org/10.54677/MNMH8546
