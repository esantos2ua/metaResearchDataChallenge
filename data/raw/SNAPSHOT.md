# OpenAlex snapshot — Canadian Metaresearch Corpus (Frozen v1)

Record of the exact retrieval for full reproducibility and auditability.

- **Snapshot / retrieval date:** 2026-09-15
- **OpenAlex API base URL:** `https://api.openalex.org/works`
- **Query config version:** `2026-09-15-frozen-v1`
- **Query config SHA-256:** `0b5ebd1cd83a7610c8a910c814e3758464abf90da47a258e46a2a44c521f3a2e`
- **Corpus filter:**
  ```
  institutions.country_code:ca,topics.id:T10102|T13607|T13516|T11492|T13976|T11937,from_publication_date:1970-01-01,type:!paratext
  ```
- **Total works retrieved:** 9,464 works
- **Target artifact:** `dashboard/app/data/records.json` (6.42 MB)
- **Sensitivity subsets:**
  - Primary (any Canadian author): 9,464 works
  - First author Canadian: recorded in `records.json` -> `meta.sensitivity`
  - Corresponding author Canadian: recorded in `records.json` -> `meta.sensitivity`
  - Funded by major Canadian funder: recorded in `records.json` -> `meta.sensitivity`

## Later OpenAlex releases (added 2026-10-15)

- OpenAlex re-tagged every work with a new topic classifier and merged ~14M duplicate works in
  its release of 2026-10-14. The same filter returned 20,369 works on 2026-10-15. That pull is
  kept for comparison only (`data/raw/records_2026-10-14.json`, not committed); **v1 above stays
  the primary corpus** (deviation D5). See [`docs/CORPUS-VERSIONS.md`](../../docs/CORPUS-VERSIONS.md).
- To reproduce v1's topic assignments after the change: OpenAlex froze the old topics and scores
  on 2026-10-05 and attached them to its v2.0.0 release; the old classifier serves
  `/text/topics?version=1` until 2027-01-13.
- Re-pulling now needs a free OpenAlex API key for cursor paging (`OPENALEX_API_KEY`);
  without one, `build_records.py` pulls in publication-year slices.
