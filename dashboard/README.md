# Dashboard

Interactive, open-access dashboard for exploring the Canadian metaresearch landscape —
inspired by the [COKI Open Access Dashboard](https://open.coki.ac/).

## Planned views

- **Overview** — corpus size, time trends, OA share.
- **Openness & transparency** — OA status, preprints, data/code availability.
- **Citations & bibliometrics** — citation distributions, impact by field/year.
- **Topics** — thematic map of the field (topic model).
- **Networks** — co-authorship and institutional collaboration.
- **Representation** — institution type, region, language (EN/FR), career-stage proxies.

## Tech (pilot)

A **static-first stack** (plain HTML/CSS/JS + [Chart.js](https://www.chartjs.org/) via CDN) that
reads a pre-computed aggregate JSON from `app/data/`. No build step, no backend — cheap to host
(e.g. GitHub Pages) and fully reproducible. This pilot validates the approach; we may later migrate
to Observable Framework / Quarto if the view set grows.

## Run the pilot locally

```bash
# 1. Build the data (real OpenAlex aggregates)
OPENALEX_EMAIL=you@example.org python3 scripts/extraction/build_dashboard_data.py

# 2. Serve the app (charts fetch JSON, so a file:// open won't work)
cd dashboard/app && python3 -m http.server 8000
# open http://localhost:8000
```

The current pilot corpus is **Canadian-affiliated works tagged with metaresearch concepts**
(bibliometrics, citation analysis, scientometrics, research integrity, scholarly communication,
open science) — ~2,400 works. Refine the definition in
[`scripts/extraction/query_config.yaml`](../scripts/extraction/query_config.yaml).

## Data contract

`scripts/analysis/run_analyses.py` writes aggregated, privacy-respecting JSON/CSV that the
dashboard consumes. No raw author-level data ships to the client.
