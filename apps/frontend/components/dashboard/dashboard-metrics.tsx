'use client';

import Link from 'next/link';
import { useTranslations } from '@/lib/i18n';
import type { SessionUsage } from '@/lib/api/usage';

interface DashboardMetricsProps {
  pendingCount: number;
  appliedCount: number;
  sessionUsage: SessionUsage | null;
  locale: string;
}

const BOX = 'flex-1 min-w-40 bg-white border border-ink shadow-sw-nested p-4';
const LABEL = 'block font-mono text-xs uppercase text-steel';
const VALUE = 'mt-2 block font-mono text-2xl font-bold tabular-nums';

export function DashboardMetrics({
  pendingCount,
  appliedCount,
  sessionUsage,
  locale,
}: DashboardMetricsProps) {
  const { t } = useTranslations();
  void locale;

  const cost = sessionUsage ? sessionUsage.cost_usd.toFixed(4) : '0.0000';
  const calls = sessionUsage?.calls ?? 0;

  return (
    <div className="flex flex-wrap gap-4">
      <div className={BOX}>
        <span className={LABEL}>{t('dashboard.pending')}</span>
        <span className={VALUE}>{pendingCount}</span>
      </div>
      <div className={BOX}>
        <span className={LABEL}>{t('dashboard.applied')}</span>
        <span className={VALUE}>{appliedCount}</span>
      </div>
      <Link
        href="/usage"
        className={`${BOX} block hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas`}
      >
        <span className={LABEL}>{t('dashboard.sessionCost')}</span>
        <span className={VALUE}>${cost}</span>
        <span className="mt-1 block font-mono text-xs text-steel tabular-nums">
          {t('dashboard.sessionCalls', { count: calls })}
        </span>
      </Link>
    </div>
  );
}
