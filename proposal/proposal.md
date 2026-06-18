# Canadian Metaresearch Data Challenge — Proposal

**Title:** _An Open, Reproducible Dashboard for Mapping the Canadian Metaresearch Landscape_

**Team:** _TBD_

**Submission deadline:** July 1, 2026 · **Notification:** July 10, 2026 · **Conference:** Oct 27–29, 2026 (uOttawa)

---

> Methodology description — **2 pages maximum**. Must address (1) openness, transparency &
> reproducibility; (2) diversity considerations & bias acknowledgment; (3) a work plan for
> pre-conference completion.

## 1. Problem & objective

How can we construct an open, reproducible, and inclusive dataset that best captures the Canadian
metaresearch landscape? We propose an end-to-end, fully open pipeline built on **OpenAlex** that
produces (a) a documented open dataset of Canadian metaresearch outputs and (b) an interactive,
open-access **dashboard** — inspired by the [COKI Open Access Dashboard](https://open.coki.ac/) —
for exploring openness, transparency, citation/bibliometric, and network dimensions of the field.

## 2. Search & retrieval strategy (OpenAlex)

- Define "metaresearch" via a transparent, versioned query combining OpenAlex **concepts/topics**
  (metascience, bibliometrics/scientometrics, STS, research integrity & reproducibility, scholarly
  communication, open science) with keyword filters on titles/abstracts.
- Restrict to "Canadian" outputs via author **institution country (CA)** and ROR-linked affiliations,
  with sensitivity checks on alternative definitions (author location, funder).
- Retrieve via the OpenAlex API (snapshot pinned by date) for reproducibility.

## 3. Inclusion/exclusion & community definition

- Pre-registered inclusion/exclusion criteria documented in `docs/METHODOLOGY.md`.
- Multiple "Canadian-ness" definitions reported side-by-side to expose sensitivity.

## 4. Validation & bias assessment

- Manual validation on a stratified sample; precision/recall against a curated seed set.
- Coverage and language bias assessment (English/French); acknowledgment of OpenAlex coverage gaps.

## 5. Analyses

- **Openness/transparency:** OA status, preprints, data/code availability.
- **Bibliometrics & citations:** output trends, citation distributions, fields.
- **Topic modeling & thematic mapping.**
- **Network analyses:** co-authorship and institutional collaboration.
- **Underrepresented groups:** institution type, region, language, career stage proxies.

## 6. Openness, transparency & reproducibility

- All code MIT-licensed and public; data/docs CC BY 4.0.
- Scripted pipeline (raw → processed → dashboard), pinned environments, pinned OpenAlex snapshot.

## 7. Diversity & bias acknowledgment

- Report inclusive of French-language and smaller-institution outputs.
- Explicit discussion of OpenAlex metadata limitations and equity considerations.

## 8. Work plan (pre-conference)

| Phase | Window | Output |
|-------|--------|--------|
| Corpus definition & retrieval | Jul–Aug 2026 | Query spec + raw snapshot |
| Cleaning & validation | Aug 2026 | Validated dataset + bias report |
| Analyses | Sep 2026 | Bibliometric/network/topic results |
| Dashboard build | Sep–Oct 2026 | Deployed open dashboard |
| Documentation & rehearsal | Oct 2026 | Docs + 30-min plenary talk |

## 9. Outputs

Open dataset (with codebook), reproducible code/workflows, deployed dashboard, and a 30-minute
plenary presentation.
