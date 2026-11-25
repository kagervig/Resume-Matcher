'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageFrame } from '@/components/ui/page-frame';
import { PageHeader } from '@/components/ui/page-header';
import { useStatusCache } from '@/lib/context/status-cache';
import { useTranslations } from '@/lib/i18n';
import {
  clearResumeWizardDraft,
  readResumeWizardCompletion,
  writeResumeWizardCompletion,
  readResumeWizardDraft,
  writeResumeWizardDraft,
} from '@/lib/utils/resume-wizard-storage';
import { applyResumeDefaults, readResumeDefaults } from '@/lib/utils/resume-defaults-storage';
import {
  createInitialResumeWizardState,
  finalizeResumeWizard,
  postResumeWizardTurn,
  ResumeWizardConflictError,
  type ResumeWizardSection,
  type ResumeWizardState,
} from '@/lib/api';
import { fetchExperienceSuggestions, type ExperienceSuggestions } from '@/lib/api/resume';
import { LivePreview } from './live-preview';
import { QuestionCard } from './question-card';

const MASTER_RESUME_KEY = 'master_resume_id';
/** First section still missing content (matches the backend gap heuristic); falls
 *  back to 'skills' (its additional.* merge is the broadest catch-all). */
function firstGapSection(data: ResumeWizardState['resume_data']): ResumeWizardSection {
  if (!data.workExperience?.length) return 'workExperience';
  if (!data.education?.length) return 'education';
  if (!data.personalProjects?.length) return 'personalProjects';
  return 'skills';
}

export function ResumeWizardPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const { incrementResumes, setHasMasterResume } = useStatusCache();
  const [state, setState] = useState<ResumeWizardState>(() => createInitialResumeWizardState());
  const [answer, setAnswer] = useState('');
  // Structured work-experience inputs; composed into the submitted answer text.
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [suggestions, setSuggestions] = useState<ExperienceSuggestions>({
    companies: [],
    titles: [],
  });
  const [errorKey, setErrorKey] = useState<string | null>(null);
  // The server's own reason for a refused finalize (e.g. the master limit), shown verbatim.
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [createdResumeId, setCreatedResumeId] = useState<string | null>(null);
  const [draftStorageUnavailable, setDraftStorageUnavailable] = useState(false);
  const [showLeaveWithoutDraftDialog, setShowLeaveWithoutDraftDialog] = useState(false);

  useEffect(() => {
    const completedId = readResumeWizardCompletion();
    if (completedId) {
      setCreatedResumeId(completedId);
      setState((current) => ({ ...current, step: 'complete' }));
    } else {
      const saved = readResumeWizardDraft();
      // Layer saved defaults on top of the restored draft (or the fresh initial
      // state). applyResumeDefaults only fills empty slots, so this seeds a new
      // resume without clobbering a draft's content — and, crucially, a stale
      // empty draft from a prior visit no longer blocks defaults from appearing.
      setState((current) => applyResumeDefaults(saved ?? current, readResumeDefaults()));
    }
    setIsLoaded(true);
  }, []);

  // Autocomplete suggestions from the user's own resumes + tracker cards. Best-effort:
  // a failure just leaves the fields as plain text inputs.
  useEffect(() => {
    fetchExperienceSuggestions()
      .then(setSuggestions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoaded || state.step === 'complete') return;
    setDraftStorageUnavailable(!writeResumeWizardDraft(state));
  }, [isLoaded, state]);

  useEffect(() => {
    if (!draftStorageUnavailable) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [draftStorageUnavailable]);

  const sectionLabel = t(`resumeWizard.sections.${state.current_question.section}`);
  const errorMessage = errorDetail ?? (errorKey ? t(errorKey) : null);
  const isWorkExperience =
    state.step === 'question' && state.current_question.section === 'workExperience';
  const hasStructuredInput = jobTitle.trim().length > 0 || company.trim().length > 0;

  // Fold the structured Title/Company into the free-text answer so the server turn
  // flow parses them like any other answer (e.g. "Backend Engineer at Acme. <details>").
  const composeAnswer = (): string => {
    const details = answer.trim();
    if (!isWorkExperience || !hasStructuredInput) return details;
    const lead = [jobTitle.trim(), company.trim()].filter(Boolean).join(' at ');
    return [lead, details].filter(Boolean).join('. ');
  };

  const runTurn = async (
    action: 'answer' | 'skip' | 'back' | 'review',
    errorTranslationKey: string,
    withAnswer: boolean
  ) => {
    setErrorKey(null);
    setErrorDetail(null);
    setIsBusy(true);
    try {
      const response = await postResumeWizardTurn({
        state,
        action,
        ...(withAnswer ? { answer: { text: composeAnswer() } } : {}),
      });
      setState(response.state);
      setAnswer('');
      setJobTitle('');
      setCompany('');
    } catch {
      setErrorKey(errorTranslationKey);
    } finally {
      setIsBusy(false);
    }
  };

  const handleContinue = () => {
    if (isBusy || (answer.trim().length === 0 && !(isWorkExperience && hasStructuredInput))) return;
    void runTurn('answer', 'resumeWizard.errors.turnFailed', true);
  };
  const handleSkip = () => void runTurn('skip', 'resumeWizard.errors.turnFailed', false);
  const handleBack = () => void runTurn('back', 'resumeWizard.errors.turnFailed', false);
  const handleReview = () => void runTurn('review', 'resumeWizard.errors.turnFailed', false);
  const handleKeepAdding = () =>
    setState((current) => ({
      ...current,
      step: 'question',
      // Target the next content gap so the answer actually merges — the `review`
      // section is a no-op in the backend merge and would silently drop the answer.
      current_question: {
        text: t('resumeWizard.keepAddingPrompt'),
        section: firstGapSection(current.resume_data),
      },
    }));

  const handleRetryDraftBackup = () => {
    setDraftStorageUnavailable(!writeResumeWizardDraft(state));
  };

  const handleBackToDashboard = () => {
    if (draftStorageUnavailable) {
      setShowLeaveWithoutDraftDialog(true);
      return;
    }
    router.push('/dashboard');
  };

  const handleFinalize = async () => {
    if (createdResumeId || isBusy) return;
    setErrorKey(null);
    setErrorDetail(null);
    setIsBusy(true);
    let response;
    try {
      response = await finalizeResumeWizard(state);
      if (!response.resume_id) {
        throw new Error('Finalize returned no resume id');
      }
    } catch (err) {
      if (err instanceof ResumeWizardConflictError) setErrorDetail(err.message);
      else setErrorKey('resumeWizard.errors.finalizeFailed');
      setIsBusy(false);
      return;
    }

    const resumeId = response.resume_id;
    setCreatedResumeId(resumeId);
    setDraftStorageUnavailable(false);
    setShowLeaveWithoutDraftDialog(false);
    setState((current) => ({ ...current, step: 'complete' }));
    try {
      if (response.is_default_master) localStorage.setItem(MASTER_RESUME_KEY, response.resume_id);
    } catch {
      // The server commit is authoritative; a blocked browser cache must not
      // turn an acknowledged creation back into a retryable create action.
    }
    if (!clearResumeWizardDraft()) writeResumeWizardCompletion(resumeId);
    try {
      incrementResumes();
      setHasMasterResume(true);
    } catch {
      // Status cache is derived UI state. The created resume remains committed.
    }
    try {
      router.push(`/builder?id=${resumeId}`);
    } catch {
      setErrorKey('resumeWizard.errors.createdNavigationFailed');
    }
    setIsBusy(false);
  };

  const handleOpenCreated = () => {
    if (!createdResumeId) return;
    try {
      router.push(`/builder?id=${createdResumeId}`);
    } catch {
      setErrorKey('resumeWizard.errors.createdNavigationFailed');
    }
  };

  return (
    <PageFrame effect="bitrate" effectIntensity={isBusy ? 'active' : 'idle'}>
      <PageHeader>
        {/* Not PageHeader.Back: leaving must pass the local-backup guard, and Back is a bare Link. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mb-8"
          onClick={handleBackToDashboard}
        >
          <ArrowLeft aria-hidden="true" />
          {t('resumeWizard.actions.backToDashboard')}
        </Button>
        <PageHeader.Title>{t('resumeWizard.title')}</PageHeader.Title>
      </PageHeader>

      <div className="grid gap-6 px-8 py-6 md:px-12 md:py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-4">
          {draftStorageUnavailable && state.step !== 'complete' && (
            <Alert tone="warning" title={t('resumeWizard.draftStorageUnavailable.title')}>
              <p>{t('resumeWizard.draftStorageUnavailable.description')}</p>
              <Button
                type="button"
                variant="warning"
                className="mt-3"
                onClick={handleRetryDraftBackup}
              >
                {t('resumeWizard.actions.retryDraftBackup')}
              </Button>
            </Alert>
          )}

          {errorMessage && (
            <Alert tone="error" title={t('common.error')}>
              {errorMessage}
            </Alert>
          )}

          {state.step === 'complete' && createdResumeId ? (
            <section className="border-2 border-success bg-white p-6 shadow-sw-nested md:p-8">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-success">
                {t('resumeWizard.created.title')}
              </p>
              <p className="mt-3 font-sans text-sm">{t('resumeWizard.created.description')}</p>
              <Button type="button" className="mt-6" onClick={handleOpenCreated}>
                {t('resumeWizard.actions.openCreated')}
              </Button>
            </section>
          ) : (
            <QuestionCard
              step={state.step === 'complete' ? 'review' : state.step}
              question={state.current_question.text}
              section={state.current_question.section}
              sectionLabel={sectionLabel}
              progress={state.progress}
              answer={answer}
              onAnswerChange={setAnswer}
              jobTitle={jobTitle}
              company={company}
              onJobTitleChange={setJobTitle}
              onCompanyChange={setCompany}
              titleSuggestions={suggestions.titles}
              companySuggestions={suggestions.companies}
              canGoBack={state.history.length > 0}
              isBusy={isBusy}
              onContinue={handleContinue}
              onSkip={handleSkip}
              onBack={handleBack}
              onReview={handleReview}
              onFinalize={handleFinalize}
              onKeepAdding={handleKeepAdding}
              warnings={state.warnings}
              isComplete={state.is_complete}
              canFinalize={Boolean(state.resume_data.personalInfo?.name?.trim())}
            />
          )}
        </div>

        <LivePreview resumeData={state.resume_data} inferredSkills={state.inferred_skills} />
      </div>

      <ConfirmDialog
        open={showLeaveWithoutDraftDialog}
        onOpenChange={setShowLeaveWithoutDraftDialog}
        title={t('resumeWizard.leaveWithoutDraft.title')}
        description={t('resumeWizard.leaveWithoutDraft.description')}
        confirmLabel={t('resumeWizard.actions.leaveWithoutSaving')}
        cancelLabel={t('resumeWizard.actions.stay')}
        variant="warning"
        onConfirm={() => router.push('/dashboard')}
      />
    </PageFrame>
  );
}
