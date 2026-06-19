# Canadian Metaresearch Data Challenge — Proposal

**An Open, Reproducible Dashboard for Mapping the Canadian Metaresearch Landscape**
*Team: TBD · Submission July 1, 2026 · Conference Oct 27–29, 2026 (uOttawa)*

---

**The challenge — and our answer.** The call asks: *"How can we construct an open, reproducible, and inclusive dataset that best captures the Canadian metaresearch landscape?"* Our answer is to define the corpus through a transparent, versioned query over OpenAlex [2] that anyone can re-run; to script every step from retrieval to visualization so the dataset rebuilds with a single command; to report several defensible definitions of "Canadian" and "metaresearch" side by side rather than hide a single choice; to co-design the inclusion criteria with the community; and to surface the dataset's own gaps — language, discipline, coverage — directly in the dashboard rather than bury them. The deliverable is a live, public dashboard (inspired by the [COKI Open Access Dashboard](https://open.coki.ac/)), already running as a pilot on real OpenAlex data, that lets researchers, funders, and communities explore who is shaping Canadian research culture, whose voices are missing, and where to improve transparency and equity.

**Defining and retrieving the corpus.** We operationalize "metaresearch" [1] as a versioned OpenAlex query. The pilot draws on nine OpenAlex concepts — bibliometrics, citation analysis, scientometrics, research integrity, scholarly communication, open science, peer review, altmetrics, and research assessment — yielding roughly 4,500 Canadian-affiliated works, and the full corpus will layer in English- and French-language title/abstract keywords. "Canadian" is defined by author–institution country in OpenAlex; because that choice is contestable, we report sensitivity checks against alternatives (first or corresponding author, funder) side by side. Retrieval uses the OpenAlex API with a dated, version-pinned snapshot, and we benchmark coverage against established sources such as Web of Science and Scopus [3], validating relevance through a manually checked stratified sample and precision/recall against a curated seed set. Inclusion criteria are pre-registered [4] and refined with stakeholders before the corpus is frozen. From the resulting dataset the dashboard derives output and citation trends, open-access patterns (including an open-versus-closed citation comparison [8]), thematic structure (topic and field breakdowns now, formal topic modeling for the full study), and co-authorship and institutional collaboration networks.

**Openness, transparency, and reproducibility.** Reproducibility is the project's core design principle: the entire dataset rebuilds from source with one command, and every choice is inspectable. All extraction, cleaning, analysis, and dashboard code is MIT-licensed and public on GitHub; the processed, record-level corpus and its codebook are released under CC BY 4.0 and built to be FAIR [9], with a dated OpenAlex snapshot so results remain reproducible as the database grows. The pipeline (raw → processed → dashboard) is fully scripted with pinned software environments, and the corpus-defining query lives in a single versioned configuration file, so the definition is auditable and re-runnable. Documentation includes a methodology and reproducibility guide, the codebook, and an in-dashboard "Search & validation" panel that displays the exact query, re-runs it live against OpenAlex, and spot-checks a random sample for relevance — transparency any reader can exercise in the browser. The approach aligns with the UNESCO Recommendation on Open Science [11].

**Diversity across traditions, languages, and communities.** Metaresearch is not monolithic, and the dataset is built to reflect that. Its traditions and disciplines span quantitative scientometrics, science-and-technology studies, research-integrity and ethics scholarship, and library and information science; our concept set deliberately mixes these, and the dashboard breaks the corpus down by field, topic, and concept so that no single tradition stands in for the whole. English and French are treated as first-class — the query, keywords, and dashboard are bilingual — and we report the English/French balance explicitly (the pilot is ~94% English, itself a finding rather than a target). Inclusion criteria are co-designed with librarians, researchers, EDI experts, and policymakers, and smaller institutions and all regions are tracked alongside the largest universities. Where the corpus touches Indigenous-led research or data, we follow the First Nations principles of OCAP® [5], the CARE Principles for Indigenous Data Governance [6], and Chapter 9 of the Tri-Council Policy Statement (TCPS 2) [7].

**Assumptions, limitations, and sources of bias.** We are explicit about what this approach assumes and where it can mislead. It assumes that OpenAlex concepts and affiliations are usable proxies for "metaresearch" and "Canadian" — both contestable, which is why we test alternatives rather than assert one — and that affiliation country adequately captures Canadian contribution. The main limitations are coverage bias, since OpenAlex favours English-language, journal-based, DOI-bearing outputs and under-represents non-English work, grey literature, and community-based scholarship [3, 10]; definitional bias, since concept tagging is noisy (broad concepts can pull in false positives, as observed in the pilot) and affiliation-based attribution credits a whole work to Canada regardless of contribution share; and metadata gaps, since OpenAlex carries little reliable information on author demographics, career stage, or equity-deserving groups, so any equity analysis relies on coarse proxies. We surface these gaps in the dashboard rather than hide them, so the tool informs capacity building and equitable policy.

**Work plan.** All work is completed before the conference, in four overlapping phases:

| Phase | Window | Output |
|-------|--------|--------|
| Corpus definition, retrieval & stakeholder codesign | Jul–Aug 2026 | Versioned query, dated snapshot, validated inclusion criteria |
| Cleaning, validation & bias assessment | Aug 2026 | Validated dataset + bias/coverage report |
| Analyses & dashboard build | Sep–Oct 2026 | Bibliometric, network, and topic results in a deployed dashboard |
| Documentation & rehearsal | Oct 2026 | Reproducibility docs + 30-minute plenary talk |

**Outputs.** An open dataset with codebook, reproducible code and workflows, a deployed public dashboard (CC BY 4.0 data and docs; MIT code), and a 30-minute plenary presentation.

---

## References

> Citations support the methodology; please verify each DOI/URL before final submission.

1. Ioannidis JPA, Fanelli D, Dunne DD, Goodman SN (2015). Meta-research: Evaluation and improvement of research methods and practices. *PLoS Biology* 13(10): e1002264. https://doi.org/10.1371/journal.pbio.1002264
2. Priem J, Piwowar H, Orr R (2022). OpenAlex: A fully-open index of scholarly works, authors, venues, institutions, and concepts. *arXiv* 2205.01833. https://arxiv.org/abs/2205.01833
3. Mongeon P, Paul-Hus A (2016). The journal coverage of Web of Science and Scopus: a comparative analysis. *Scientometrics* 106: 213–228. https://doi.org/10.1007/s11192-015-1765-5
4. Nosek BA, Ebersole CR, DeHaven AC, Mellor DT (2018). The preregistration revolution. *PNAS* 115(11): 2600–2606. https://doi.org/10.1073/pnas.1708274114
5. First Nations Information Governance Centre (FNIGC). The First Nations Principles of OCAP®. https://fnigc.ca/ocap-training/
6. Carroll SR, Garba I, Figueroa-Rodríguez OL, et al. (2020). The CARE Principles for Indigenous Data Governance. *Data Science Journal* 19(1): 43. https://doi.org/10.5334/dsj-2020-043
7. CIHR, NSERC, SSHRC (2022). *Tri-Council Policy Statement: Ethical Conduct for Research Involving Humans (TCPS 2)*, Chapter 9. https://ethics.gc.ca/eng/policy-politique_tcps2-eptc2_2022.html
8. Piwowar H, Priem J, Larivière V, et al. (2018). The state of OA: a large-scale analysis of the prevalence and impact of Open Access articles. *PeerJ* 6: e4375. https://doi.org/10.7717/peerj.4375
9. Wilkinson MD, Dumontier M, Aalbersberg IJ, et al. (2016). The FAIR Guiding Principles for scientific data management and stewardship. *Scientific Data* 3: 160018. https://doi.org/10.1038/sdata.2016.18
10. Vera-Baceta MA, Thelwall M, Kousha K (2019). Web of Science and Scopus language coverage. *Scientometrics* 121: 1803–1813. https://doi.org/10.1007/s11192-019-03264-z
11. UNESCO (2021). *Recommendation on Open Science*. https://doi.org/10.54677/MNMH8546
