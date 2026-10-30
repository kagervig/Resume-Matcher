'use client';

import { useEffect, useState } from 'react';
import { ListBullets, SpinnerGap } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n';
import { fetchJdSummary, generateJdSummary, type JDSummaryRecord } from '@/lib/api/resume';

interface JdSummaryPanelProps {
  resumeId: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; record: JDSummaryRecord | null }
  | { status: 'failed' };

/** AI digest of the linked job description: summary, core competencies, keywords. */
export function JdSummaryPanel({ resumeId }: JdSummaryPanelProps) {
  const { t } = useTranslations();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [generating, setGenerating] = useState(false);
  const [generateFailed, setGenerateFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      setState({ status: 'loading' });
      setGenerateFailed(false);
      try {
        const record = await fetchJdSummary(resumeId);
        if (!cancelled) setState({ status: 'loaded', record });
      } catch (err) {
        if (!cancelled) {
          console.warn('Could not load JD summary:', err);
          setState({ status: 'failed' });
        }
      }
    };

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateFailed(false);
    try {
      const record = await generateJdSummary(resumeId);
      setState({ status: 'loaded', record });
    } catch (err) {
      console.warn('Could not generate JD summary:', err);
      setGenerateFailed(true);
    } finally {
      setGenerating(false);
    }
  };

  const loading = state.status === 'loading';
  const record = state.status === 'loaded' ? state.record : null;

  return (
    <div className="border-2 border-ink bg-white p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h3 className="font-mono text-sm font-bold uppercase">
            {t('builder.jdMatch.summary.title')}
          </h3>
          <p className="text-sm text-ink-soft leading-relaxed">
            {t('builder.jdMatch.summary.description')}
          </p>
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={loading || generating}>
          {generating ? (
            <SpinnerGap aria-hidden="true" className="animate-spin" />
          ) : (
            <ListBullets aria-hidden="true" />
          )}
          {generating
            ? t('builder.jdMatch.summary.generating')
            : record
              ? t('builder.jdMatch.summary.regenerate')
              : t('builder.jdMatch.summary.generate')}
        </Button>
      </div>

      {generateFailed && <Alert tone="error">{t('builder.jdMatch.summary.generateFailed')}</Alert>}
      {state.status === 'failed' && (
        <Alert tone="error">{t('builder.jdMatch.summary.loadFailed')}</Alert>
      )}

      {record ? (
        <div className="space-y-4">
          {record.summary.summary && (
            <p className="text-sm text-ink-soft leading-relaxed">{record.summary.summary}</p>
          )}

          {record.summary.core_competencies.length > 0 && (
            <div className="space-y-1">
              <h4 className="font-mono text-xs font-bold uppercase text-steel">
                {t('builder.jdMatch.summary.competenciesHeading')}
              </h4>
              <ul className="list-disc pl-4 text-sm text-ink-soft space-y-1">
                {record.summary.core_competencies.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {record.summary.keywords.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-mono text-xs font-bold uppercase text-steel">
                {t('builder.jdMatch.summary.keywordsHeading')}
              </h4>
              <div className="flex flex-wrap gap-1">
                {record.summary.keywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="border border-ink bg-paper px-2 py-1 font-mono text-xs text-ink-soft"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        state.status === 'loaded' &&
        !generating && <p className="text-sm text-ink-soft">{t('builder.jdMatch.summary.empty')}</p>
      )}
    </div>
  );
}
