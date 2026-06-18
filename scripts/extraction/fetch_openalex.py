"""Retrieve the Canadian metaresearch corpus from OpenAlex.

Reads the versioned query definition in ``query_config.yaml`` and pages through the
OpenAlex Works API, writing raw results and full provenance to ``data/raw/``.

This is a scaffold: the query construction and paging are stubbed for the team to
complete. Keep all retrieval logic here so the corpus is reproducible from config alone.
"""

from __future__ import annotations

import os
from pathlib import Path

import yaml  # pip install pyyaml

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = Path(__file__).with_name("query_config.yaml")
RAW_DIR = ROOT / "data" / "raw"
OPENALEX_WORKS = "https://api.openalex.org/works"


def load_config() -> dict:
    with CONFIG_PATH.open() as fh:
        return yaml.safe_load(fh)


def build_filter(config: dict) -> str:
    """Build the OpenAlex ``filter`` string from the config. TODO: implement."""
    raise NotImplementedError("Construct the OpenAlex filter from query_config.yaml")


def fetch(config: dict) -> None:
    """Page through OpenAlex (cursor paging) and write raw JSONL to data/raw/. TODO."""
    email = os.environ.get("OPENALEX_EMAIL")  # polite pool
    raise NotImplementedError("Implement cursor paging and write to data/raw/")


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    config = load_config()
    fetch(config)


if __name__ == "__main__":
    main()
