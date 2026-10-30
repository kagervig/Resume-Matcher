'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';
import { PanelHeader } from '@/components/ui/panel-header';
import { Textarea } from '@/components/ui/textarea';
import { FloppyDisk, SpinnerGap } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n';
import { CoverLetterWizard } from './cover-letter-wizard';
import { generateCoverLetterGuided, type CoverLetterContext } from '@/lib/api/resume';

export interface CoverLetterEditorProps {
  /** Cover letter content */
  content: string;
  /** Callback when content changes */
  onChange: (content: string) => void;
  /** Callback when save is triggered */
  onSave: () => void;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Signature text */
  signature: string;
  /** Callback when signature changes */
  onSignatureChange: (signature: string) => void;
  /** Callback when signature save is triggered (per-letter override) */
  onSignatureSave: () => void;
  /** Whether signature save is in progress */
  isSignatureSaving: boolean;
  /** Callback to save the current signature as the global default */
  onSignatureSaveDefault: () => void;
  /** Whether saving the default signature is in progress */
  isSignatureDefaultSaving: boolean;
  /** Resume id used for guided generation requests */
  resumeId: string;
  /** Stored answers from a previous guided generation */
  initialContext: CoverLetterContext | null;
  /** Whether the resume is tailored (has a parent_id) */
  isTailored: boolean;
  /** Additional class names */
  className?: string;
}

type WizardState = 'idle' | 'wizard' | 'generating' | 'done';

export function CoverLetterEditor({
  content,
  onChange,
  onSave,
  isSaving,
  signature,
  onSignatureChange,
  onSignatureSave,
  isSignatureSaving,
  onSignatureSaveDefault,
  isSignatureDefaultSaving,
  resumeId,
  initialContext,
  isTailored,
  className,
}: CoverLetterEditorProps) {
  const { t } = useTranslations();
  // An existing letter always opens in the editor ('done'); the guided wizard is
  // reached from there via "Edit Answers". 'idle' is the empty-content entry.
  const [wizardState, setWizardState] = React.useState<WizardState>(() =>
    content ? 'done' : 'idle'
  );
  const [currentContext, setCurrentContext] = React.useState<CoverLetterContext | null>(
    initialContext
  );
  const [feedbackText, setFeedbackText] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generateError, setGenerateError] = React.useState<string | null>(null);

  const wordCount = content
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const charCount = content.length;

  async function handleGenerate(context: CoverLetterContext) {
    setIsGenerating(true);
    setGenerateError(null);
    setWizardState('generating');
    try {
      const result = await generateCoverLetterGuided(resumeId, { context });
      onChange(result);
      setCurrentContext(context);
      setWizardState('done');
    } catch (err) {
      setGenerateError(
        t('coverLetter.wizard.errors.generateFailed', {
          error: err instanceof Error ? err.message : String(err),
        })
      );
      setWizardState('wizard');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleFeedback() {
    if (!feedbackText.trim()) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const result = await generateCoverLetterGuided(resumeId, {
        context: currentContext ?? undefined,
        feedback: feedbackText,
      });
      onChange(result);
      setFeedbackText('');
    } catch (err) {
      setGenerateError(
        t('coverLetter.wizard.errors.generateFailed', {
          error: err instanceof Error ? err.message : String(err),
        })
      );
    } finally {
      setIsGenerating(false);
    }
  }

  if (wizardState === 'idle') {
    if (!isTailored) {
      return (
        <EmptyState
          className={className}
          title={t('builder.generatePrompt.notAvailableTitle', {
            title: t('coverLetter.title'),
          })}
          description={t('builder.generatePrompt.notAvailableDescription', {
            title: t('coverLetter.title'),
          })}
          action={
            <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
              {t('builder.generatePrompt.goToDashboard')}
            </p>
          }
        />
      );
    }
    return (
      <EmptyState
        className={className}
        title={t('builder.generatePrompt.generateTitle', {
          title: t('coverLetter.title'),
        })}
        description={t('builder.generatePrompt.coverLetterDescription')}
        action={
          <Button onClick={() => setWizardState('wizard')}>
            {t('coverLetter.wizard.actions.generate')}
          </Button>
        }
      />
    );
  }

  if (wizardState === 'wizard') {
    return (
      <div className={cn('flex flex-col', className)}>
        <CoverLetterWizard
          initialContext={currentContext ?? initialContext ?? undefined}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
        {generateError && (
          <p className="px-4 pb-4 font-mono text-xs text-destructive">{generateError}</p>
        )}
      </div>
    );
  }

  if (wizardState === 'generating') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 p-8', className)}>
        <SpinnerGap aria-hidden="true" className="animate-spin" />
        <p className="font-mono text-xs uppercase tracking-wider text-steel">
          {t('coverLetter.wizard.actions.generating')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <PanelHeader
        tone="input"
        level="h3"
        title={t('coverLetter.title')}
        className="mb-0 bg-paper p-4"
      >
        <span className="font-mono text-xs text-steel tabular-nums">
          {t('builder.contentStats.wordsChars', { wordCount, charCount })}
        </span>
        <Button size="sm" onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <SpinnerGap aria-hidden="true" className="animate-spin" />
          ) : (
            <FloppyDisk aria-hidden="true" />
          )}
          {isSaving ? t('common.saving') : t('common.save')}
        </Button>
      </PanelHeader>

      {/* Editor Area */}
      <div className="flex-1 p-4 overflow-hidden">
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
          placeholder={t('coverLetter.editor.placeholder')}
          className="h-full min-h-[400px] p-4 leading-relaxed resize-none"
        />
      </div>

      {/* Signature */}
      <div className="p-4 border-t border-panel bg-paper space-y-2">
        <Label
          htmlFor="cover-letter-signature"
          className="font-mono text-xs uppercase tracking-wider text-ink"
        >
          {t('coverLetter.signature.label')}
        </Label>
        <Textarea
          id="cover-letter-signature"
          value={signature}
          onChange={(e) => onSignatureChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
          placeholder={t('coverLetter.signature.placeholder')}
          className="min-h-[80px] resize-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={onSignatureSave}
            disabled={isSignatureSaving || isSignatureDefaultSaving}
          >
            {isSignatureSaving ? (
              <SpinnerGap aria-hidden="true" className="animate-spin" />
            ) : (
              <FloppyDisk aria-hidden="true" />
            )}
            {isSignatureSaving ? t('common.saving') : t('coverLetter.signature.saveForThisLetter')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onSignatureSaveDefault}
            disabled={isSignatureSaving || isSignatureDefaultSaving}
          >
            {isSignatureDefaultSaving && <SpinnerGap aria-hidden="true" className="animate-spin" />}
            {isSignatureDefaultSaving ? t('common.saving') : t('coverLetter.signature.setDefault')}
          </Button>
        </div>
        <p className="font-mono text-xs text-steel">{t('coverLetter.signature.tip')}</p>
        <p className="font-mono text-xs text-steel">{t('coverLetter.signature.defaultHint')}</p>
      </div>

      {/* Feedback panel */}
      <div className="border-t border-panel">
        <PanelHeader
          tone="input"
          level="h3"
          title={t('coverLetter.wizard.feedback.title')}
          className="mb-0 bg-paper p-4"
        >
          <Button size="sm" variant="ghost" onClick={() => setWizardState('wizard')}>
            {t('coverLetter.wizard.actions.editAnswers')}
          </Button>
        </PanelHeader>
        <div className="p-4 space-y-3">
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
            placeholder={t('coverLetter.wizard.feedback.placeholder')}
            className="min-h-[80px] resize-none"
          />
          <Button
            onClick={handleFeedback}
            disabled={isGenerating || !feedbackText.trim()}
            size="sm"
          >
            {isGenerating && <SpinnerGap aria-hidden="true" className="animate-spin" />}
            {isGenerating
              ? t('coverLetter.wizard.feedback.submitting')
              : t('coverLetter.wizard.feedback.submit')}
          </Button>
          {generateError && <p className="font-mono text-xs text-destructive">{generateError}</p>}
        </div>
      </div>
    </div>
  );
}
