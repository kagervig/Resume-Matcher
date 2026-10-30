'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { SwissGrid } from '@/components/home/swiss-grid';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { buttonClass } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusIndicator, type StatusTone } from '@/components/ui/status-indicator';
import { DefaultBadge } from '@/components/common/default-badge';
import { ArrowsClockwise, ArrowLeft } from '@phosphor-icons/react';
import { useTranslations } from '@/lib/i18n';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { fetchResumeList, type ResumeListItem } from '@/lib/api/resume';

// Stretched link: its ::after covers the whole tile for mouse and keyboard navigation.
const TILE_LINK =
  'after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-white';
const TILE_FILL =
  'hover:border-transparent hover:translate-x-0 hover:translate-y-0 hover:bg-primary hover:text-white has-[:focus-visible]:z-20 has-[:focus-visible]:bg-primary has-[:focus-visible]:text-white';
const TILE_WHITE = 'group-hover:text-white group-has-[:focus-visible]:text-white';
const TILE_WHITE_BORDER = 'group-hover:border-white group-has-[:focus-visible]:border-white';
const TILE_STATUS =
  'group-hover:[&>span:first-child]:bg-white group-hover:[&>span:last-child]:text-white group-has-[:focus-visible]:[&>span:first-child]:bg-white group-has-[:focus-visible]:[&>span:last-child]:text-white';

const STATUS_TONE: Record<ResumeListItem['processing_status'], StatusTone> = {
  ready: 'ready',
  processing: 'active',
  pending: 'neutral',
  failed: 'error',
};

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

export default function AllResumesPage() {
  const { t, locale } = useTranslations();
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [listError, setListError] = useState(false);
  const loadRequestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const formatEditedDate = (value: string) =>
    formatDate(value, locale, { month: 'short', day: '2-digit', year: 'numeric' }) ||
    t('common.unknown');

  const loadResumes = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    const isCurrent = () => mountedRef.current && requestId === loadRequestIdRef.current;
    try {
      setListError(false);
      const data = await fetchResumeList(true);
      if (!isCurrent()) return;
      // Newest first by generation date, masters and tailored interleaved.
      const sorted = [...data].sort((a, b) =>
        (b.created_at || '').localeCompare(a.created_at || '')
      );
      setResumes(sorted);
    } catch (err) {
      if (!isCurrent()) return;
      console.error('Failed to load resumes:', err);
      setListError(true);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadResumes();
    return () => {
      mountedRef.current = false;
      loadRequestIdRef.current += 1;
    };
  }, [loadResumes]);

  return (
    <SwissGrid
      title={t('nav.allResumes')}
      banner={
        listError && (
          <Alert tone="error" title={t('dashboard.errors.loadFailed')}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void loadResumes()}
            >
              <ArrowsClockwise aria-hidden="true" />
              {t('common.retry')}
            </Button>
          </Alert>
        )
      }
    >
      {resumes.map((resume) => {
        if (resume.is_master) {
          const title = resume.title || resume.filename || t('dashboard.masterTrack');
          return (
            <Card
              key={resume.resume_id}
              variant="interactive"
              className={cn('aspect-square h-full', TILE_FILL)}
            >
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div
                    className={cn(
                      'size-12 border-2 border-ink bg-primary text-white flex items-center justify-center',
                      TILE_WHITE_BORDER
                    )}
                  >
                    <span className="font-mono font-bold">M</span>
                  </div>
                  <StatusIndicator
                    tone={STATUS_TONE[resume.processing_status]}
                    className={TILE_STATUS}
                  >
                    {t(`dashboard.status.${resume.processing_status}`)}
                  </StatusIndicator>
                </div>
                <div className="flex items-start gap-2">
                  <CardTitle className="min-w-0 text-lg">
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
                  {resume.is_default_master && (
                    <DefaultBadge className={TILE_WHITE_BORDER}>
                      {t('dashboard.defaultBadge')}
                    </DefaultBadge>
                  )}
                </div>
                <CardDescription className={cn('mt-auto pt-4 uppercase tabular-nums', TILE_WHITE)}>
                  {t('dashboard.edited', {
                    date: formatEditedDate(resume.updated_at || resume.created_at),
                  })}
                </CardDescription>
              </div>
            </Card>
          );
        }

        const title =
          resume.title || resume.jobSnippet || resume.filename || t('dashboard.tailoredResume');
        const monogramFill = MONOGRAM_FILLS[hashTitle(title) % MONOGRAM_FILLS.length];
        const jobLabel = [resume.job_role, resume.job_company].filter(Boolean).join(' @ ');
        return (
          <Card
            key={resume.resume_id}
            variant="interactive"
            className={cn('aspect-square h-full', TILE_FILL)}
          >
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
                <StatusIndicator
                  tone={STATUS_TONE[resume.processing_status]}
                  className={TILE_STATUS}
                >
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
              {jobLabel && (
                <p
                  className={cn('font-mono text-xs uppercase tracking-wider truncate', TILE_WHITE)}
                >
                  {jobLabel}
                </p>
              )}
              <CardDescription className={cn('mt-auto pt-4 uppercase tabular-nums', TILE_WHITE)}>
                {t('dashboard.edited', {
                  date: formatEditedDate(resume.updated_at || resume.created_at),
                })}
              </CardDescription>
            </div>
          </Card>
        );
      })}

      {/* Back to Dashboard tile */}
      <Card className="aspect-square h-full">
        <div className="flex-1 flex flex-col items-center justify-center text-center h-full gap-4">
          <Link href="/dashboard" className={buttonClass({ variant: 'outline' })}>
            <ArrowLeft aria-hidden="true" />
            {t('nav.backToDashboard')}
          </Link>
        </div>
      </Card>
    </SwissGrid>
  );
}
