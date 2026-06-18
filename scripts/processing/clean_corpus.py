"""Clean and enrich the raw OpenAlex pull into an analysis-ready dataset.

Reads raw JSONL from ``data/raw/`` and writes processed tables to ``data/processed/``.
Steps: deduplicate, reconstruct abstracts from inverted index, normalize affiliations/ROR,
derive OA status, detect language, and link preprint/version relationships.

Scaffold — implement each step. Keep transformations deterministic and documented.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"


def reconstruct_abstract(inverted_index: dict) -> str:
    """OpenAlex stores abstracts as an inverted index; reconstruct plain text. TODO."""
    raise NotImplementedError


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    raise NotImplementedError("Implement cleaning pipeline: raw -> processed")


if __name__ == "__main__":
    main()
