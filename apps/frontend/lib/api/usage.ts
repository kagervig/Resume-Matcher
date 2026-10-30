import { apiFetch, apiPost } from './client';

export interface SessionUsage {
  cost_usd: number;
  calls: number;
  started_at: string;
}

export interface ModelStat {
  provider: string;
  model: string;
  count: number;
  total_cost_usd: number | null;
  avg_cost_usd: number | null;
  avg_latency_ms: number;
  good_count: number;
  bad_count: number;
}

export interface UsageStats {
  session: SessionUsage;
  models: ModelStat[];
}

export type Rating = 'good' | 'bad';

export interface RatingResult {
  request_id: string;
  rating: Rating;
  updated: number;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  // USD per token, or null when OpenRouter does not report a price.
  prompt_price: number | null;
  completion_price: number | null;
}

export async function fetchSessionUsage(): Promise<SessionUsage> {
  const res = await apiFetch('/usage/session');
  if (!res.ok) {
    throw new Error(`Failed to fetch session usage (status ${res.status}).`);
  }
  return res.json();
}

export async function resetSessionUsage(): Promise<SessionUsage> {
  const res = await apiPost('/usage/session/reset', {});
  if (!res.ok) {
    throw new Error(`Failed to reset session usage (status ${res.status}).`);
  }
  return res.json();
}

export async function fetchUsageStats(): Promise<UsageStats> {
  const res = await apiFetch('/usage/stats');
  if (!res.ok) {
    throw new Error(`Failed to fetch usage stats (status ${res.status}).`);
  }
  return res.json();
}

export async function submitRating(requestId: string, rating: Rating): Promise<RatingResult> {
  const res = await apiPost('/usage/rating', { request_id: requestId, rating });
  if (!res.ok) {
    throw new Error(`Failed to submit rating (status ${res.status}).`);
  }
  return res.json();
}

export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const res = await apiFetch('/config/openrouter-models');
  if (!res.ok) {
    throw new Error(`Failed to fetch OpenRouter models (status ${res.status}).`);
  }
  const data = (await res.json()) as { models: OpenRouterModel[] };
  return data.models;
}
