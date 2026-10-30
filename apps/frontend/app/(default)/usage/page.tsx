'use client';

import { useEffect, useState } from 'react';
import { ChartBar, CurrencyDollar, ThumbsUp, ThumbsDown, SpinnerGap } from '@phosphor-icons/react';
import { PageFrame } from '@/components/ui/page-frame';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { useTranslations } from '@/lib/i18n';
import {
  fetchUsageStats,
  resetSessionUsage,
  type ModelStat,
  type UsageStats,
} from '@/lib/api/usage';

const formatCost = (value: number | null): string => (value == null ? '—' : `$${value.toFixed(4)}`);

const formatLatency = (ms: number): string =>
  ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;

export default function UsagePage() {
  const { t } = useTranslations();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    fetchUsageStats()
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleReset = () => {
    resetSessionUsage()
      .then((session) => setStats((prev) => (prev ? { ...prev, session } : prev)))
      .catch(() => undefined);
  };

  return (
    <PageFrame width="default">
      <PageHeader>
        <PageHeader.Back href="/dashboard">{t('nav.dashboard')}</PageHeader.Back>
        <PageHeader.Title>{t('usage.title')}</PageHeader.Title>
        <PageHeader.Subtitle>{t('usage.subtitle')}</PageHeader.Subtitle>
      </PageHeader>

      <div className="px-8 py-8 md:px-12 space-y-8">
        {loading ? (
          <div className="flex items-center gap-2 font-mono text-sm text-steel">
            <SpinnerGap className="w-4 h-4 animate-spin" />
            {t('common.loading')}
          </div>
        ) : error ? (
          <Alert tone="error" title={t('usage.loadError')}>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={load}>
              {t('common.retry')}
            </Button>
          </Alert>
        ) : stats ? (
          <>
            {/* Session summary */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-panel-hover pb-2">
                <CurrencyDollar className="w-4 h-4" />
                <h2 className="font-serif text-xl font-bold text-ink">{t('usage.sessionTitle')}</h2>
              </div>
              <div className="border border-ink bg-white p-4 shadow-sw-nested">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono text-xs uppercase text-steel">
                      {t('usage.sessionCost')}
                    </span>
                    <div className="font-mono text-3xl font-bold tabular-nums">
                      {formatCost(stats.session.cost_usd)}
                    </div>
                    <p className="mt-1 text-xs text-steel font-mono">
                      {t('usage.sessionCalls', { count: stats.session.calls })}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                    {t('usage.reset')}
                  </Button>
                </div>
              </div>
            </section>

            {/* Per-model stats */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-panel-hover pb-2">
                <ChartBar className="w-4 h-4" />
                <h2 className="font-serif text-xl font-bold text-ink">{t('usage.modelsTitle')}</h2>
              </div>
              {stats.models.length === 0 ? (
                <EmptyState
                  variant="framed"
                  title={t('usage.emptyTitle')}
                  description={t('usage.emptyDescription')}
                />
              ) : (
                <ModelStatsTable models={stats.models} />
              )}
            </section>
          </>
        ) : null}
      </div>
    </PageFrame>
  );
}

function ModelStatsTable({ models }: { models: ModelStat[] }) {
  const { t } = useTranslations();
  return (
    <div className="overflow-x-auto border border-ink bg-white shadow-sw-nested">
      <table className="w-full border-collapse font-mono text-sm">
        <thead>
          <tr className="border-b border-ink bg-panel text-left">
            <th className="px-3 py-2 font-bold uppercase text-xs">{t('usage.table.model')}</th>
            <th className="px-3 py-2 font-bold uppercase text-xs text-right">
              {t('usage.table.queries')}
            </th>
            <th className="px-3 py-2 font-bold uppercase text-xs text-right">
              {t('usage.table.totalCost')}
            </th>
            <th className="px-3 py-2 font-bold uppercase text-xs text-right">
              {t('usage.table.avgCost')}
            </th>
            <th className="px-3 py-2 font-bold uppercase text-xs text-right">
              {t('usage.table.avgLatency')}
            </th>
            <th className="px-3 py-2 font-bold uppercase text-xs text-right">
              {t('usage.table.rating')}
            </th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr
              key={`${m.provider}/${m.model}`}
              className="border-b border-panel-hover last:border-0"
            >
              <td className="px-3 py-2">
                <span className="block text-ink">{m.model}</span>
                <span className="block text-xs text-steel">{m.provider}</span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{m.count}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCost(m.total_cost_usd)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCost(m.avg_cost_usd)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatLatency(m.avg_latency_ms)}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-3 tabular-nums">
                  <span className="inline-flex items-center gap-1 text-success">
                    <ThumbsUp className="w-4 h-4" />
                    {m.good_count}
                  </span>
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <ThumbsDown className="w-4 h-4" />
                    {m.bad_count}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
