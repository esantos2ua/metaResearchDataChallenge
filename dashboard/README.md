# Dashboard

Interactive, open-access dashboard for exploring the Canadian metaresearch landscape —
inspired by the [COKI Open Access Dashboard](https://open.coki.ac/).

**Live:** <https://esantos2ua.github.io/metaResearchDataChallenge/>

## Features (pilot)

- **Sidebar navigation** across views: Overview, Publication trends, Institutions,
  Collaboration network, Topics & fields, About.
- **Interactive filters** — year range, open-access status, language, output type, and an
  "open access only" toggle. Every chart, the collaboration network, and the KPIs re-aggregate
  live as filters change.
- **Download filtered CSV** — export exactly the subset currently in view (COKI-style).
- **Views:** OA status & open-vs-closed, publication trend, top Canadian institutions,
  institutional co-authorship **network** (vis-network), topics, output types, languages.

## Tech

A **static-first stack** (plain HTML/CSS/JS + [Chart.js](https://www.chartjs.org/) and
[vis-network](https://visjs.github.io/vis-network/) via CDN). The app loads a single
**record-level dataset** (`app/data/records.json`, one row per work) and does all filtering,
aggregation, network construction, and CSV export **client-side**. No build step, no backend —
cheap to host (GitHub Pages) and fully reproducible. No author-level personal data beyond
public OpenAlex institutional affiliations is shipped.

## Run the pilot locally

```bash
# 1. Build the record-level dataset (powers all views, filters, and CSV export)
OPENALEX_EMAIL=you@example.org python3 scripts/extraction/build_records.py

# 2. Serve the app (it fetches JSON, so a file:// open won't work)
cd dashboard/app && python3 -m http.server 8000
# open http://localhost:8000
```

The current pilot corpus is **Canadian-affiliated works tagged with metaresearch concepts**
(bibliometrics, citation analysis, scientometrics, research integrity, scholarly communication,
open science) — ~2,400 works. Refine the definition in
[`scripts/extraction/query_config.yaml`](../scripts/extraction/query_config.yaml).

### Alternative aggregate builders

`build_dashboard_data.py` (facet aggregates) and `build_network_data.py` (precomputed network)
demonstrate a server-side aggregation approach using the OpenAlex `group_by` API. They are kept
as reference; the live dashboard uses the record-level `build_records.py` so it can filter and
export dynamically.

## Data flow

`build_records.py` → `app/data/records.json` → dashboard (client-side aggregation + CSV export).
A push to `main` touching `dashboard/app/**` redeploys the live site via GitHub Actions.
