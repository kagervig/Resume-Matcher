"""Session LLM-spend accumulator and usage aggregation.

The session total is an in-memory running sum for the current backend process
(it resets on restart or via the reset endpoint); per-model stats are read from
the persisted ``llm_calls`` table. This split matches the product decision:
"session cost since the server started" vs "all-time per-model stats".
"""

import threading
from datetime import datetime, timezone
from typing import Any


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


_lock = threading.Lock()
_session: dict[str, Any] = {
    "cost_usd": 0.0,
    "calls": 0,
    "started_at": _utcnow_iso(),
}


def record_cost(cost_usd: float | None) -> None:
    """Add one completed call to the session total (cost may be unknown)."""
    with _lock:
        _session["calls"] += 1
        if cost_usd is not None:
            _session["cost_usd"] += cost_usd


def session_snapshot() -> dict[str, Any]:
    """Return a copy of the current session totals."""
    with _lock:
        return dict(_session)


def reset_session() -> dict[str, Any]:
    """Zero the session total and restart its clock; return the fresh snapshot."""
    with _lock:
        _session["cost_usd"] = 0.0
        _session["calls"] = 0
        _session["started_at"] = _utcnow_iso()
        return dict(_session)


async def usage_stats() -> dict[str, Any]:
    """Combine the session snapshot with all-time per-model stats."""
    from app.database import db

    return {"session": session_snapshot(), "models": await db.get_model_stats()}


async def set_rating(request_id: str, rating: str) -> int:
    """Attach a good/bad rating to the calls for ``request_id``."""
    from app.database import db

    return await db.set_llm_call_rating(request_id, rating)
