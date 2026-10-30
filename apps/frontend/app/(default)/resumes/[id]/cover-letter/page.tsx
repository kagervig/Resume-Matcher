'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageFrame } from '@/components/ui/page-frame';
import { PageHeader } from '@/components/ui/page-header';
import { StatusIndicator } from '@/components/ui/status-indicator';
import {
  CoverLetterPreview,
  type CoverLetterPersonalInfo,
} from '@/components/builder/cover-letter-preview';
import {
  fetchResume,
  downloadCoverLetterPdf,
  getCoverLetterPdfUrl,
  type CoverLetterContext,
} from '@/lib/api/resume';
import { fetchDefaultCoverLetterSignature } from '@/lib/api/config';
import { DownloadSimple, SpinnerGap } from '@phosphor-icons/react';
import { useTranslations } from '@/lib/i18n';
import { useLanguage } from '@/lib/context/language-context';
import { downloadBlobAsFile, openUrlInNewTab, sanitizeFilename } from '@/lib/utils/download';

export default function CoverLetterViewerPage() {
  const { t } = useTranslations();
  const { uiLanguage } = useLanguage();
  const params = useParams();
  const resumeId = params?.id as string;

  const [content, setContent] = useState('');
  const [signature, setSignature] = useState('');
  const [personalInfo, setPersonalInfo] = useState<CoverLetterPersonalInfo>({});
  const [context, setContext] = useState<CoverLetterContext | null>(null);
  const [resumeTitle, setResumeTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!resumeId) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [data, defaultSignature] = await Promise.all([
          fetchResume(resumeId),
          fetchDefaultCoverLetterSignature().catch(() => ''),
        ]);
        if (!isMounted.current) return;
        setContent(data.cover_letter ?? '');
        // A per-resume signature overrides the global default; otherwise inherit it.
        setSignature(data.cover_letter_signature || defaultSignature);
        setPersonalInfo((data.processed_resume?.personalInfo as CoverLetterPersonalInfo) ?? {});
        setContext(data.cover_letter_context ?? null);
        setResumeTitle(data.title ?? null);
      } catch (err) {
        if (!isMounted.current) return;
        console.error('Failed to load cover letter:', err);
        setError(t('coverLetterViewer.failedToLoad'));
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };
    load();
  }, [resumeId, t]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const blob = context
        ? await downloadCoverLetterPdf(resumeId, 'A4', uiLanguage, context)
        : await downloadCoverLetterPdf(resumeId, 'A4', uiLanguage);
      const filename = sanitizeFilename(resumeTitle, resumeId, 'cover-letter');
      downloadBlobAsFile(blob, filename);
    } catch (err) {
      console.error('Failed to download cover letter:', err);
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        const fallbackUrl = context
          ? getCoverLetterPdfUrl(resumeId, 'A4', uiLanguage, context)
          : getCoverLetterPdfUrl(resumeId, 'A4', uiLanguage);
        const didOpen = openUrlInNewTab(fallbackUrl);
        if (!didOpen) {
          setDownloadError(t('common.popupBlocked', { url: fallbackUrl }));
        }
        return;
      }
      const errorMessage = err instanceof Error ? err.message : t('common.unknown');
      setDownloadError(t('builder.alerts.coverLetterDownloadFailed', { error: errorMessage }));
    } finally {
      if (isMounted.current) setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <PageFrame>
        <div className="flex items-center gap-3 p-8 md:p-12">
          <SpinnerGap aria-hidden="true" className="size-6 animate-spin text-primary" />
          <StatusIndicator tone="active">{t('coverLetterViewer.loading')}</StatusIndicator>
        </div>
      </PageFrame>
    );
  }

  if (error || !content) {
    return (
      <PageFrame>
        <div className="flex max-w-2xl flex-col gap-6 p-8 md:p-12">
          <Alert tone={error ? 'error' : 'info'}>{error || t('coverLetterViewer.notFound')}</Alert>
          <PageHeader.Back href={`/resumes/${resumeId}`}>
            {t('coverLetterViewer.backToResume')}
          </PageHeader.Back>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <PageHeader className="no-print">
        <PageHeader.Back href={`/resumes/${resumeId}`}>
          {t('coverLetterViewer.backToResume')}
        </PageHeader.Back>

        <PageHeader.Title>{t('coverLetter.title')}</PageHeader.Title>

        <PageHeader.Actions>
          <Button type="button" variant="outline" onClick={handleDownload} disabled={isDownloading}>
            <DownloadSimple aria-hidden="true" />
            {isDownloading ? t('common.generating') : t('coverLetterViewer.download')}
          </Button>
        </PageHeader.Actions>
      </PageHeader>

      {downloadError && (
        <div className="px-8 md:px-12 no-print">
          <Alert tone="error">{downloadError}</Alert>
        </div>
      )}

      <div className="px-8 py-6 md:px-12 md:py-8">
        <div className="flex justify-center pb-4">
          <CoverLetterPreview
            content={content}
            personalInfo={personalInfo}
            signature={signature}
            className="w-full max-w-[250mm]"
          />
        </div>
      </div>
    </PageFrame>
  );
}
