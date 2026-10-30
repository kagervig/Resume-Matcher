"""Pydantic schemas for LLM usage, stats, ratings, and OpenRouter models."""

from typing import Literal

from pydantic import BaseModel


class SessionUsage(BaseModel):
    """Running LLM spend for the current backend process."""

    cost_usd: float
    calls: int
    started_at: str


class ModelStat(BaseModel):
    """All-time aggregated stats for one (provider, model) pair."""

    provider: str
    model: str
    count: int
    total_cost_usd: float | None = None
    avg_cost_usd: float | None = None
    avg_latency_ms: int
    good_count: int
    bad_count: int


class UsageStatsResponse(BaseModel):
    """Session total plus per-model stats."""

    session: SessionUsage
    models: list[ModelStat]


class RatingRequest(BaseModel):
    """Rate the LLM result tied to a tailoring ``request_id``."""

    request_id: str
    rating: Literal["good", "bad"]


class RatingResponse(BaseModel):
    """Result of applying a rating."""

    request_id: str
    rating: Literal["good", "bad"]
    updated: int


class OpenRouterModel(BaseModel):
    """One OpenRouter model for the picker (prices are USD per token)."""

    id: str
    name: str
    prompt_price: float | None = None
    completion_price: float | None = None


class OpenRouterModelsResponse(BaseModel):
    """The OpenRouter model list."""

    models: list[OpenRouterModel]
