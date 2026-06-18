# Reproducibility

The goal: anyone can reproduce the dataset and dashboard from scratch.

## Environment

- Python (see `requirements.txt`) — pinned versions; use a virtual environment.
- Node.js for the dashboard (see `dashboard/`).
- OpenAlex polite-pool email in `.env` (`OPENALEX_EMAIL=you@example.org`).

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit
```

## Pipeline

Run in order — each stage reads the previous stage's output:

```bash
python scripts/extraction/fetch_openalex.py     # raw → data/raw/
python scripts/processing/clean_corpus.py        # raw → data/processed/
python scripts/analysis/run_analyses.py          # processed → docs/figures + dashboard data
```

## Pinning

- **OpenAlex snapshot date** recorded in `data/raw/SNAPSHOT.md`.
- Query definition pinned in `scripts/extraction/query_config.yaml`.
- Dependency versions pinned in `requirements.txt`.

## Data availability

Raw pulls are git-ignored (size); the exact query + snapshot date allow regeneration. Processed,
analysis-ready aggregates and the codebook are published under CC BY 4.0.
