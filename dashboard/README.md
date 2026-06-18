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

## Tech (proposed)

A static-first stack that reads pre-computed aggregates from `app/data/` so the dashboard is
cheap to host and fully reproducible. Candidate stacks: Observable Framework / Quarto / a
React+Vite SPA. Decide and document here.

## Data contract

`scripts/analysis/run_analyses.py` writes aggregated, privacy-respecting JSON/CSV that the
dashboard consumes. No raw author-level data ships to the client.
