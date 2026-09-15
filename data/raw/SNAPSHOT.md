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
