"""LLM usage, per-model stats, and response-rating endpoints."""

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.usage import (
    RatingRequest,
    RatingResponse,
    SessionUsage,
    UsageStatsResponse,
)
from app.services import usage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/usage", tags=["Usage"])


@router.get("/session", response_model=SessionUsage)
async def get_session_usage() -> SessionUsage:
    """Return the running LLM spend for the current backend process."""
    return SessionUsage(**usage.session_snapshot())


@router.post("/session/reset", response_model=SessionUsage)
async def reset_session_usage() -> SessionUsage:
    """Zero the session spend and restart its clock."""
    return SessionUsage(**usage.reset_session())


@router.get("/stats", response_model=UsageStatsResponse)
async def get_usage_stats() -> UsageStatsResponse:
    """Return the session total plus all-time per-model stats."""
    return UsageStatsResponse(**await usage.usage_stats())


@router.post("/rating", response_model=RatingResponse)
async def rate_result(request: RatingRequest) -> RatingResponse:
    """Attach a good/bad rating to the LLM calls for a tailoring request."""
    updated = await usage.set_rating(request.request_id, request.rating)
    if updated == 0:
        raise HTTPException(status_code=404, detail="No LLM calls found for request.")
    return RatingResponse(
        request_id=request.request_id, rating=request.rating, updated=updated
    )
