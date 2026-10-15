# Corpus versions and OpenAlex releases

Our corpus is defined by one file, [`query_config.yaml`](../scripts/extraction/query_config.yaml):
six OpenAlex topics, a Canadian affiliation, works since 1970. The file pins **our** definition.
It does not pin **OpenAlex**: the same filter run on a different day can return a different set of
works, because OpenAlex keeps changing the records underneath it. This page records the three
versions of the corpus we have, what changed between them, and what that means for the dashboard.

Numbers below come from [`data/versions/comparison.md`](../data/versions/comparison.md), generated
by `scripts/analysis/compare_versions.py`.

## The three versions

| | Pilot | v1 (frozen, primary) | v1 config on October OpenAlex |
| --- | --- | --- | --- |
| Pulled | 2026-06-19 | 2026-09-15 | 2026-10-15 (snapshot of 2026-10-14) |
| What changed | — | **Our definition**: the team and community added Research Data Management (T11937) | **OpenAlex**: every work re-tagged by a new topic classifier; ~14M duplicates merged |
| Topics | 5 | 6 | 6 (same file as v1) |
| Works | 7,062 | 9,464 | 20,369 |
| Precision (B2 human coding) | ~0.27 (the 160 B2 records the pilot topics cover) | 0.27 (95% CI 0.21–0.33) | not measured by humans; see the agent check below |

Two different kinds of change:

- **Pilot → v1 is a change we made.** The definition grew by one topic, and the corpus by 2,640
  works (238 left through ordinary OpenAlex updates). Precision held: records that entered only
  through T11937 score 10/40 (0.25), like the rest.
- **v1 → October is a change OpenAlex made.** We changed nothing. 5,232 works stayed, 4,232 left
  and 15,137 entered: three in four works in the October corpus were not in v1.

## What changes between OpenAlex releases

OpenAlex is served two ways. The **API** is live and changes continuously. The **snapshot** is a
full dated copy, published since October 2026 on a fixed schedule: the second Wednesday of
January, April, July and October. Our pulls use the API on a given date, so each pull reflects
OpenAlex as it was that day. The October 2026 release changed five things
([announcement](https://help.openalex.org/access/sync/#public-release-dates)):

| Change | What it does | Effect on our corpus |
| --- | --- | --- |
| **New topic classifier** ([blog](https://blog.openalex.org/same-topics-better-assignments/)) | Same 4,516 topics, same IDs and names; every work re-tagged by a new model. OpenAlex reports strict accuracy up from 25% to 82%, with large gains for works without abstracts (20% → 75%), datasets (6% → 86%) and non-English works (9% → 72%) | **The main driver.** A work still gets three topics, but the second and third can carry very low scores. Publishing and Scholarly Communication (T13516) went from 972 to 6,661 works; in a sample of 200 of them it was the third topic for a third, and its median score was 0.13 |
| **~14M duplicate works merged** | A preprint and its article, Zenodo/Figshare versions, double DOIs become one work; the extra DOIs stay in `locations[].doi` | Some records vanish into their merged twin: 12 of the 200 B2 records no longer resolve, 11 of them coded NO (datasets, deposits, duplicates) |
| **Keywords rebuilt** ([blog](https://blog.openalex.org/openalex-keywords-are-finally-good/)) | 1.88M keywords instead of 65K, every work re-tagged | None yet: our keyword layer is off. It is the basis for the bilingual keyword layer planned after the conference |
| **New `study_designs` field** ([blog](https://blog.openalex.org/filter-openalex-for-rcts-meta-analyses-and-systematic-reviews/)) | RCT, systematic review, meta-analysis, case report… on 20.8M works | None yet. A candidate signal for the methods and statistical-practice gap the community named |
| **New SDG classifier** | F1 0.77 against 0.42 before | None: we do not use SDGs |

### What the new classifier did to the records we coded

The 200 B2 records were coded by people before the change, so we can see what the new classifier
kept and dropped (`data/validation/relevance_sample_2026-10-07.csv`, checked against the API on
2026-10-15):

| B2 verdict | Still in the corpus | Left (topic no longer assigned) | Merged / gone |
| --- | --- | --- | --- |
| Metaresearch (53) | 42 (79%) | 10 | 1 |
| Not metaresearch (139) | 51 (37%) | 77 | 11 |
| Unclear (8) | 7 | 1 | 0 |

Among the 100 that stayed, 42 are metaresearch: **precision 0.42**, up from 0.27. The new
classifier is better at our boundary. But this says nothing about the 15,137 works that entered,
and those are now three quarters of the corpus. To get a first reading of them we ran an agent
coding check (below and deviation D6).

### Agent coding check

Exploratory, not preregistered (deviation D6). 50 works that entered with the October release were
mixed with the 200 human-coded B2 records, shuffled, stripped of IDs and DOIs, and double-coded
blind by AI agents with the coding guide; 14 disagreements went to a blind agent adjudicator.
Results: [`agent_check_results.json`](../data/validation/agent_check/agent_check_results.json).

**How the agents code, measured against the humans on the 200 B2 records:**

| | Humans (adjudicated) | Agents |
| --- | --- | --- |
| Share coded metaresearch | 0.27 (53/200) | 0.47 (94/200) |
| Agreement with the humans (κ) | — | 0.41 |
| Sensitivity (human YES → agent YES) | — | 0.91 |
| Specificity (human NO/UNCLEAR → agent not YES) | — | 0.69 |
| Agreement between the two agents of a pair | κ = 0.31 (human pairs) | κ = 0.92 |

The agents find almost every work the humans accept, but they also accept about one in three the
humans reject, mostly commentaries and editorials on metaresearch topics, which the guide excludes
as not empirical. Their near-perfect agreement with each other is not reliability: they are one
model with one set of instructions, so they make the same mistakes.

**Same yardstick, three groups of works** (share the agents coded metaresearch):

| Group | Agents | Humans |
| --- | --- | --- |
| B2 records the new classifier **kept** (100) | 0.69 | 0.42 |
| B2 records the new classifier **dropped or merged** (100) | 0.25 | 0.11 |
| Works that **entered** in October (50) | 0.40 | not coded |

By the agents' own measure, the works that entered are much less clean than the ones the new
classifier kept. Corrected for the agents' measured error, their precision is about **0.15**
(bootstrap 95% interval 0.00–0.39).

**Rough reading of the October corpus as a whole.** Weighting the kept works (5,232 at 0.42) and the
entered ones (15,137 at 0.15): precision about **0.22** (range 0.11–0.40), against 0.27 for v1.
That is roughly 4,400 metaresearch works (range about 2,200 to 8,000), against about 2,550 in v1.
The new classifier probably finds more real metaresearch, but it does not make the corpus cleaner:
each release changes both what is found and how much noise comes with it. Only a fresh human
sample can settle the October precision.

## Reproducibility

- **v1 stays the primary corpus** on the dashboard and in the dataset release. It is the only
  version whose precision was measured by people, and swapping it would be the silent change the
  preregistration rules out (D3, D5).
- **v1 can still be rebuilt.** `records.json` keeps the exact works. OpenAlex froze the old topic
  assignments on 2026-10-05 and attached them to its v2.0.0 release; the old classifier is on
  GitHub and Zenodo, and the `/text/topics?version=1` endpoint serves it until 2027-01-13.
- **Pulling the corpus now needs a free OpenAlex API key** for cursor paging.
  `build_records.py` uses `OPENALEX_API_KEY` when set; without it, it splits the pull into
  publication-year slices that each fit under the 10,000-result page limit.
- **Every quarter, the same file draws a new map.** After the conference, each OpenAlex release
  gets a new pull, a new comparison, and a fresh precision sample before it replaces the primary
  corpus.

## After the conference

1. **Bilingual keyword layer**, rebuilt on the new OpenAlex keywords, as the proposal promised.
2. **A worldwide version**: the same definition without the Canadian filter, with a filter for the
   country or countries of the authors' institutions, so any community can see its own map.
3. **Topic score threshold**: test a minimum topic score, so a work enters only when the topic is
   more than a faint third guess. Defined before it is scored, on a fresh sample.
4. **Quarterly refresh** tied to the OpenAlex release schedule, with a precision check each time.
