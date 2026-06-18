# Methodology

This document is the authoritative, versioned description of how the Canadian metaresearch corpus
is defined, retrieved, validated, and analyzed. Every decision here should be reproducible from the
scripts in `scripts/`.

## 1. Defining "metaresearch"

Metaresearch (metascience) is operationalized through a combination of OpenAlex **topics/concepts**
and lexical filters:

- OpenAlex topics: metascience, bibliometrics/scientometrics, science & technology studies,
  research integrity & reproducibility, scholarly communication, open science.
- Keyword filters on title/abstract (EN + FR) for terms not well-covered by topics.

> The exact concept IDs and keyword list live in `scripts/extraction/query_config.yaml` and are
> version-controlled. Any change to the definition is a tracked commit.

## 2. Defining "Canadian"

Primary definition: at least one authorship with an **institution in Canada** (country_code = CA),
resolved via ROR. Reported alternatives for sensitivity analysis:

1. Corresponding/first author at a Canadian institution.
2. Any Canadian co-author.
3. Canadian funder acknowledgment.

## 3. Retrieval

- Source: OpenAlex API (snapshot date pinned in `data/raw/SNAPSHOT.md`).
- Polite pool email set via `OPENALEX_EMAIL` env var.
- Full provenance (query, filters, counts, date) logged to `data/raw/`.

## 4. Cleaning & enrichment

Deduplication, abstract reconstruction (inverted index → text), affiliation/ROR normalization,
OA status, language detection, and linkage of preprint/version relationships.

## 5. Validation & bias assessment

- Stratified manual review sample; report precision/recall vs. a curated seed set.
- Coverage and language (EN/FR) bias assessment.
- Documented limitations of OpenAlex metadata.

## 6. Analyses

See `scripts/analysis/` — openness/transparency, bibliometrics & citations, topic modeling,
co-authorship and institutional collaboration networks, and representation analyses.

## 7. Dashboard

Aggregated, privacy-respecting outputs feed the dashboard in `dashboard/`
(inspired by <https://open.coki.ac/>).
