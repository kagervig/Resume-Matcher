'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PanelHeader } from '@/components/ui/panel-header';
import { Textarea } from '@/components/ui/textarea';
import { Minus, Plus, SpinnerGap } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n';
import type { CoverLetterContext } from '@/lib/api/resume';

export interface CoverLetterWizardProps {
  /** Pre-fill answers from a previous generation */
  initialContext?: Partial<CoverLetterContext>;
  /** Called with the collected answers when the user submits */
  onGenerate: (context: CoverLetterContext) => void;
  /** Whether a generation request is in flight */
  isGenerating: boolean;
  /** Additional class names */
  className?: string;
}

const DEFAULT_CONTEXT: CoverLetterContext = {
  company_connection: '',
  hero_achievement: '',
  missing_link: '',
  career_narrative: '',
  font_style: 'Georgia',
  font_size: '11pt',
  job_title: '',
  company_name: '',
};

const SELECT_CLASS = 'border border-ink rounded-none bg-white px-2 py-1 font-mono text-sm';
const INPUT_CLASS = 'border border-ink rounded-none bg-white px-3 py-2 text-sm w-full';
const QUESTION_LABEL_CLASS = 'font-mono text-xs uppercase tracking-wider text-ink';

export function CoverLetterWizard({
  initialContext,
  onGenerate,
  isGenerating,
  className,
}: CoverLetterWizardProps) {
  const { t, messages } = useTranslations();
  const [context, setContext] = React.useState<CoverLetterContext>({
    ...DEFAULT_CONTEXT,
    ...initialContext,
  });

  const wizard = messages.coverLetter.wizard;
  const fonts = wizard.questions.formatting.fonts;
  const fontSizes = wizard.questions.formatting.fontSizes;

  const setField = <K extends keyof CoverLetterContext>(field: K, value: CoverLetterContext[K]) =>
    setContext((prev) => ({ ...prev, [field]: value }));

  // Move the selected size one step through the allowed list, clamped to its ends.
  const stepFontSize = (current: string, delta: number): string => {
    const index = fontSizes.indexOf(current);
    const base = index === -1 ? fontSizes.indexOf('11pt') : index;
    const next = Math.min(fontSizes.length - 1, Math.max(0, base + delta));
    return fontSizes[next];
  };

  const renderTextQuestion = (
    field: 'company_connection' | 'hero_achievement' | 'missing_link' | 'career_narrative',
    key: 'companyConnection' | 'heroAchievement' | 'missingLink' | 'careerNarrative'
  ) => {
    const inputId = `cover-letter-wizard-${field}`;
    return (
      <div className="space-y-2">
        <Label htmlFor={inputId} className={QUESTION_LABEL_CLASS}>
          {t(`coverLetter.wizard.questions.${key}.label`)}
        </Label>
        <p className="font-mono text-xs text-steel">
          {t(`coverLetter.wizard.questions.${key}.question`)}
        </p>
        <Textarea
          id={inputId}
          value={context[field]}
          onChange={(e) => setField(field, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
          placeholder={t(`coverLetter.wizard.questions.${key}.placeholder`)}
          className="min-h-[80px] resize-none"
        />
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <PanelHeader
        tone="input"
        level="h3"
        title={t('coverLetter.wizard.title')}
        className="mb-0 bg-paper p-4"
      />
      <div className="p-4 space-y-6">
        <p className="font-mono text-xs text-steel">{t('coverLetter.wizard.subtitle')}</p>

        {renderTextQuestion('company_connection', 'companyConnection')}
        {renderTextQuestion('hero_achievement', 'heroAchievement')}
        {renderTextQuestion('missing_link', 'missingLink')}
        {renderTextQuestion('career_narrative', 'careerNarrative')}

        {/* Formatting */}
        <div className="space-y-2">
          <Label className={QUESTION_LABEL_CLASS}>
            {t('coverLetter.wizard.questions.formatting.label')}
          </Label>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label htmlFor="cover-letter-wizard-font" className={QUESTION_LABEL_CLASS}>
                {t('coverLetter.wizard.questions.formatting.fontLabel')}
              </Label>
              <select
                id="cover-letter-wizard-font"
                value={context.font_style}
                onChange={(e) => setField('font_style', e.target.value)}
                className={SELECT_CLASS}
              >
                {fonts.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label id="cover-letter-wizard-font-size" className={QUESTION_LABEL_CLASS}>
                {t('coverLetter.wizard.questions.formatting.fontSizeLabel')}
              </Label>
              <div
                className="flex items-center gap-1"
                role="group"
                aria-labelledby="cover-letter-wizard-font-size"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={`${t('coverLetter.wizard.questions.formatting.fontSizeLabel')} −`}
                  onClick={() => setField('font_size', stepFontSize(context.font_size, -1))}
                  disabled={fontSizes.indexOf(context.font_size) <= 0}
                >
                  <Minus aria-hidden="true" />
                </Button>
                <span className="font-mono text-sm w-14 text-center text-ink tabular-nums">
                  {context.font_size}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={`${t('coverLetter.wizard.questions.formatting.fontSizeLabel')} +`}
                  onClick={() => setField('font_size', stepFontSize(context.font_size, 1))}
                  disabled={fontSizes.indexOf(context.font_size) >= fontSizes.length - 1}
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Reference line */}
        <div className="space-y-2">
          <Label className={QUESTION_LABEL_CLASS}>
            {t('coverLetter.wizard.questions.referenceLine.label')}
          </Label>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="cover-letter-wizard-job-title" className={QUESTION_LABEL_CLASS}>
                {t('coverLetter.wizard.questions.referenceLine.jobTitleLabel')}
              </Label>
              <input
                id="cover-letter-wizard-job-title"
                type="text"
                value={context.job_title}
                onChange={(e) => setField('job_title', e.target.value)}
                placeholder={t('coverLetter.wizard.questions.referenceLine.jobTitlePlaceholder')}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cover-letter-wizard-company-name" className={QUESTION_LABEL_CLASS}>
                {t('coverLetter.wizard.questions.referenceLine.companyNameLabel')}
              </Label>
              <input
                id="cover-letter-wizard-company-name"
                type="text"
                value={context.company_name}
                onChange={(e) => setField('company_name', e.target.value)}
                placeholder={t('coverLetter.wizard.questions.referenceLine.companyNamePlaceholder')}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>

        <Button onClick={() => onGenerate(context)} disabled={isGenerating} className="w-full">
          {isGenerating && <SpinnerGap aria-hidden="true" className="animate-spin" />}
          {isGenerating
            ? t('coverLetter.wizard.actions.generating')
            : t('coverLetter.wizard.actions.generate')}
        </Button>
      </div>
    </div>
  );
}
