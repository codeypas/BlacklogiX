from __future__ import annotations

import hashlib
import json
from typing import Any


HASH_ALGORITHM = "sha256"


def canonicalize_payload(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def compute_raw_hash(payload: dict[str, Any]) -> str:
    return sha256_hex(canonicalize_payload(payload))


def compute_chain_hash(raw_hash: str, previous_hash: str | None) -> str:
    return sha256_hex(f"{previous_hash or ''}:{raw_hash}")
