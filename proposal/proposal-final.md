# An Open, Reproducible Dashboard for Mapping the Canadian Metaresearch Landscape

> **This is the text of the submitted, selected proposal** (`proposal-final.docx`, submitted
> July 2026). It is the authoritative statement of what the project committed to deliver before
> the 2nd Canadian Open Science Conference (Ottawa, October 27–29, 2026). `proposal.md` is the
> earlier, longer working draft — kept for history, superseded by this file.
>
> Text extracted verbatim from the .docx; paragraph headings preserved.

**The challenge and our answer.** The call asks: "How can we construct an open, reproducible, and inclusive dataset that best captures the Canadian metaresearch landscape?" Our answer is a live, public, and community-engaged dashboard, already running as a pilot version on real OpenAlex[^1] data (https://esantos2ua.github.io/metaResearchDataChallenge/). Selecting our proposal would fund the validation and community-driven extension, not the development, thereby reducing delivery risk before the conference. The dashboard lets researchers, funders, and communities explore who is shaping Canadian research culture, whose voices are missing, and where to improve transparency and equity. The dashboard is available in English and French and will provide an accessible overview of publication trends, topic breakdowns, open- and closed-access articles, key research hubs, collaboration networks, funding relationships, and other facets to be determined through the community-driven process. One unique aspect is that the development of the dashboard will be informed by consultations with Canadian and global meta-research communities, who will also be involved in validating the data and workflows used to populate it. This approach is enabled by unique meta-research expertise and connections of the project leadership team (e.g., SORTEE Canada Chapter, CaRN, AuRN, UKRN, GFRN, CONNECT Network, AIMOS, SRSM, SIPS).

**Defining and retrieving the corpus.** The pilot version of the dashboard draws on five OpenAlex topics, relevant under "metaresearch"[^2]: (i) scientometrics and bibliometrics, (ii) academic publishing and open access, (iii) scholarly communication, (iv) academic integrity, and (v) web visibility/informetrics. The pilot dashboard already covers ~7,000 Canadian-affiliated works from 1970 onward. The retrieval uses the OpenAlex API with a dated, version-pinned snapshot. We will benchmark coverage against established sources such as Web of Science and Scopus[^3]. We will then validate relevance through a manually checked stratified sample and precision/recall against a community-curated seed set.

**Openness, transparency, and reproducibility.** We have designed the project around open science and reproducibility principles. The entire dataset can be rebuilt from OpenAlex with one command, and every step is documented and inspectable. The pipeline (raw data → processed data → dashboard) is fully scripted with Python scripts, and the corpus-defining query lives in a single versioned configuration file, so the definition is auditable and re-runnable. In the documentation, we provide a methodology and reproducibility guide, as well as the codebook. To maintain transparency, the "Search & validation" panel in the dashboard displays the specific query used, executes it in real time via OpenAlex, and conducts random spot checks to verify the sample's relevance. To support reproducibility, the project code is MIT-licensed, while data and documentation use CC BY 4.0. Publicly hosted on GitHub, the project follows FAIR principles and uses a version-pinned OpenAlex snapshot. This architecture provides an open framework for other scholarly communities to develop and improve similar tracking tools.

**Diversity across traditions, languages, and communities.** Canadian metaresearch spans different scholarly traditions, disciplines, and languages. The interface is fully bilingual, and we use bilingual keywords. The low French share (4%) is reported as an equity gap in the dashboard. We provide other equity indicators, such as the institutional share and topic concentration to make underrepresented work visible. Where the corpus includes Indigenous-led research or Indigenous data, the project will follow the First Nations principles of OCAP®[^5], the CARE Principles for Indigenous Data Governance[^6], and Chapter 9 of the Tri-Council Policy Statement[^7].

**Outputs.** An open dataset with codebook, reproducible code and workflows, a deployed public dashboard (see Figure 1), and a 30-minute plenary presentation. We plan to implement and monitor indicators such as community feedback, GitHub contributions, dataset reuse, dashboard usage, and uptake by Canadian meta-research organizations to gauge the success/impact of this initiative.

*Figure 1. Screenshot of the pilot version of the Canadian Metaresearch Dashboard.*

**Assumptions, limitations, and sources of bias.** The main assumption underlying this project is that OpenAlex metadata, particularly topic classification and institutional affiliations, can be used to identify Canadian metaresearch outputs and contributions with reasonable accuracy. Because these proxies are imperfect, we will validate retrieval performance through manual review, benchmarking against established databases, and testing alternative inclusion criteria.

Additional limitations relate to coverage and metadata quality. OpenAlex may underrepresent Francophone outputs, grey literature, and community-based scholarship. OpenAlex provides limited information on author demographics, career stage, and equity-deserving groups, restricting the scope of equity analyses. We will assess and report these limitations through dataset validation, methodological documentation, and dashboard indicators, so users can interpret the findings appropriately.

**Work plan.** The pilot dashboard is built. Post-selection work will refine and validate it before the 2nd Canadian Open Science Conference in October 2026.

| Phase | Window | Output |
| --- | --- | --- |
| Community codesign & topic/criteria validation | Aug | Community-vetted topic set + inclusion/exclusion criteria |
| Cleaning, validation & bias assessment | Aug–Sep | Validated dataset + bias/coverage report |
| Analyses & dashboard refinement | Sep–Oct | Updated bibliometric, network, and topic views |
| Documentation & rehearsal | Oct | Reproducibility docs + 30-minute plenary talk |

## References

[^1]: Priem, J. et al. OpenAlex: A fully-open index of scholarly works, authors, venues, institutions, and concepts. arXiv:2205.01833 (2022).
[^2]: Ioannidis, J. P. A. et al. Meta-research: Evaluation and improvement of research methods and practices. PLoS Biology 13, e1002264 (2015).
[^3]: Mongeon, P. & Paul-Hus, A. The journal coverage of Web of Science and Scopus: A comparative analysis. Scientometrics 106, 213–228 (2016).
[^4]: Wilkinson, M. D. et al. The FAIR guiding principles for scientific data management and stewardship. Scientific Data 3, 160018 (2016).
[^5]: First Nations Information Governance Centre (FNIGC). The first nations principles of OCAP®.
[^6]: Carroll, S. R. et al. The CARE principles for indigenous data governance. Data Science Journal 19, 43 (2020).
[^7]: CIHR, NSERC, SSHRC. Tri-council policy statement: Ethical conduct for research involving humans (TCPS 2), chapter 9. (2022).
