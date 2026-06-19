# Canadian Metaresearch Data Challenge

> An open, reproducible dashboard for mapping the Canadian metaresearch landscape using OpenAlex.

This repository contains our submission to the **Canadian Metaresearch Data Challenge**, part of the
[2nd Canadian Open Science Conference](https://carn-recar.ca/2nd-canadian-open-science-conference-call-for-proposal-canadian-metaresearch-data-challenge/)
(University of Ottawa, October 27–29, 2026).

> 🚀 **Live pilot dashboard:** <https://esantos2ua.github.io/metaResearchDataChallenge/>
> (proof-of-concept mock-up built on real OpenAlex data)

## Project goal

Build a reproducible, open-access dashboard — inspired by the
[COKI Open Access Dashboard](https://open.coki.ac/) — that lets users investigate:

- **Openness & transparency** of Canadian metaresearch outputs (OA status, preprints, data/code sharing)
- **Citation & bibliometric analyses**
- **Topic modeling & thematic mapping** of the field
- **Network analyses** (co-authorship, institutional collaboration)
- **Open dissemination strategies**
- **Diversity & representation** within the Canadian metaresearch community

The challenge question we address:

> *How can we construct an open, reproducible, and inclusive dataset that best captures
> the Canadian metaresearch landscape?*

## Data source

Primary source: **[OpenAlex](https://openalex.org/)** — an open, fully accessible catalog of the
global research system. We use the OpenAlex API/snapshots to define and characterize the Canadian
metaresearch corpus.

## Repository structure

```
.
├── proposal/        # The 2-page methodology proposal and application materials
├── references/      # Literature, prior datasets, methodological references (BibTeX)
├── data/
│   ├── raw/         # Immutable raw pulls from OpenAlex (git-ignored)
│   ├── processed/   # Cleaned, analysis-ready datasets
│   └── external/    # Reference/lookup tables (ROR, institution lists, etc.)
├── scripts/
│   ├── extraction/  # OpenAlex query & retrieval code
│   ├── processing/  # Cleaning, deduplication, enrichment
│   └── analysis/    # Bibliometrics, topic models, network analysis
├── dashboard/       # The interactive open-access dashboard app
├── notebooks/       # Exploratory analyses
└── docs/            # Documentation, methodology, figures
```

## Reproducibility

Every step from raw OpenAlex retrieval to dashboard is scripted and version-controlled.
See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) and [docs/REPRODUCIBILITY.md](docs/REPRODUCIBILITY.md).

## Dashboard analytics

The live dashboard uses **[GoatCounter](https://www.goatcounter.com)** for privacy-friendly,
cookieless visitor tracking (no personal data, no consent banner required). To enable it:

1. Register a free site at <https://www.goatcounter.com> (e.g. site code `metaresearch`).
2. Replace `GOATCOUNTER_CODE` in the analytics `<script>` tag in
   [dashboard/app/index.html](dashboard/app/index.html) with your site code.
3. View stats at `https://YOUR_CODE.goatcounter.com`.

GitHub's own repo traffic (views, clones, referrers — rolling 14-day window) is also available
under **Insights → Traffic**.

## License

- Code: [MIT](LICENSE)
- Data & documentation: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Team

_To be completed._
