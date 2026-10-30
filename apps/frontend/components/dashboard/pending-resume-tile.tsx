'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SpinnerGap } from '@phosphor-icons/react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusIndicator, type StatusTone } from '@/components/ui/status-indicator';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { applyResume } from '@/lib/api/tracker';
import type { ResumeListItem } from '@/lib/api/resume';

interface PendingResumeTileProps {
  resume: ResumeListItem;
  onApplied: (resumeId: string) => void;
  locale: string;
}

// Blue-fill dashboard tile (matches the master tiles): hover or keyboard focus fills it Hyper Blue
// and turns its contents white; the stretched link navigates, the action floats above it.
const TILE_LINK =
  'after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-white';
const TILE_FILL =
  'hover:border-transparent hover:translate-x-0 hover:translate-y-0 hover:bg-primary hover:text-white has-[:focus-visible]:z-20 has-[:focus-visible]:bg-primary has-[:focus-visible]:text-white';
const TILE_WHITE = 'group-hover:text-white group-has-[:focus-visible]:text-white';
const TILE_WHITE_BORDER = 'group-hover:border-white group-has-[:focus-visible]:border-white';
const TILE_STATUS =
  'group-hover:[&>span:first-child]:bg-white group-hover:[&>span:last-child]:text-white group-has-[:focus-visible]:[&>span:first-child]:bg-white group-has-[:focus-visible]:[&>span:last-child]:text-white';
// The action button floats above the stretched link and keeps a white focus ring on the blue fill.
const TILE_ACTION = 'z-10 focus-visible:ring-white';

const STATUS_TONE: Record<ResumeListItem['processing_status'], StatusTone> = {
  ready: 'ready',
  processing: 'active',
  pending: 'neutral',
  failed: 'error',
};

// Monogram fills: brand tokens only, each AA with white text (lowest: steel, 5.19:1).
const MONOGRAM_FILLS = ['bg-primary', 'bg-ink', 'bg-success', 'bg-steel', 'bg-destructive'];

function getMonogram(title: string): string {
  const words = title.split(/\s+/).filter((w) => /^[a-zA-Z]/.test(w));
  return words
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function hashTitle(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function PendingResumeTile({ resume, onApplied, locale }: PendingResumeTileProps) {
  const { t } = useTranslations();
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState(false);

  const title =
    resume.title || resume.jobSnippet || resume.filename || t('dashboard.tailoredResume');
  const monogramFill = MONOGRAM_FILLS[hashTitle(title) % MONOGRAM_FILLS.length];
  const editedDate =
    formatDate(resume.updated_at || resume.created_at, locale, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }) || t('common.unknown');

  const handleApply = async () => {
    if (isApplying) return;
    setIsApplying(true);
    setError(false);
    try {
      await applyResume(resume.resume_id);
      onApplied(resume.resume_id);
    } catch (err) {
      console.error('Failed to mark resume as applied:', err);
      setError(true);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card variant="interactive" className={cn('aspect-square h-full', TILE_FILL)}>
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <div
            className={cn(
              'size-12 border-2 border-ink text-white flex items-center justify-center',
              TILE_WHITE_BORDER,
              monogramFill
            )}
          >
            <span className="font-mono font-bold">{getMonogram(title)}</span>
          </div>
          <StatusIndicator tone={STATUS_TONE[resume.processing_status]} className={TILE_STATUS}>
            {t(`dashboard.status.${resume.processing_status}`)}
          </StatusIndicator>
        </div>
        <CardTitle className="text-lg">
          <Link
            href={`/resumes/${resume.resume_id}`}
            className={cn(
              'block font-serif text-base font-bold leading-tight mb-1 w-full line-clamp-2',
              TILE_LINK
            )}
          >
            {title}
          </Link>
        </CardTitle>
        {(resume.job_company || resume.job_role) && (
          <p className={cn('font-mono text-xs uppercase tracking-wider truncate', TILE_WHITE)}>
            {[resume.job_role, resume.job_company].filter(Boolean).join(' @ ')}
          </p>
        )}
        <CardDescription className={cn('pt-4 uppercase tabular-nums', TILE_WHITE)}>
          {t('dashboard.edited', { date: editedDate })}
        </CardDescription>

        {error && (
          <Alert tone="error" className="relative z-10 mt-4 p-2">
            {t('dashboard.iAppliedError')}
          </Alert>
        )}

        <div className="relative z-10 mt-auto flex w-fit max-w-full flex-wrap gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={TILE_ACTION}
            disabled={isApplying}
            onClick={handleApply}
          >
            {isApplying ? (
              <>
                <SpinnerGap aria-hidden="true" className="animate-spin" />
                {t('dashboard.iApplying')}
              </>
            ) : (
              t('dashboard.iApplied')
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
