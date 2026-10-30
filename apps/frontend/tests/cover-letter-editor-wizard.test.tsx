import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CoverLetterEditor } from '@/components/builder/cover-letter-editor';
import type { CoverLetterContext } from '@/lib/api/resume';
import { generateCoverLetterGuided } from '@/lib/api/resume';

vi.mock('@/lib/i18n', () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    messages: {
      coverLetter: {
        wizard: {
          questions: {
            formatting: {
              fonts: ['Georgia', 'Arial'],
              fontSizes: ['11pt', '12pt'],
            },
          },
        },
      },
    },
  }),
}));

vi.mock('@/lib/api/resume', () => ({
  generateCoverLetterGuided: vi.fn(),
}));

const CONTEXT: CoverLetterContext = {
  company_connection: 'c',
  hero_achievement: 'h',
  missing_link: 'm',
  career_narrative: 'n',
  font_style: 'Georgia',
  font_size: '11pt',
  job_title: 'Engineer',
  company_name: 'Acme',
};

function renderEditor(overrides: Partial<React.ComponentProps<typeof CoverLetterEditor>> = {}) {
  return render(
    <CoverLetterEditor
      content=""
      onChange={vi.fn()}
      onSave={vi.fn()}
      isSaving={false}
      signature=""
      onSignatureChange={vi.fn()}
      onSignatureSave={vi.fn()}
      isSignatureSaving={false}
      onSignatureSaveDefault={vi.fn()}
      isSignatureDefaultSaving={false}
      resumeId="resume-1"
      initialContext={null}
      isTailored
      {...overrides}
    />
  );
}

describe('CoverLetterEditor wizard', () => {
  beforeEach(() => {
    vi.mocked(generateCoverLetterGuided).mockReset();
  });

  it('renders the idle generate button when content is empty', () => {
    renderEditor();
    expect(
      screen.getByRole('button', { name: 'coverLetter.wizard.actions.generate' })
    ).toBeInTheDocument();
  });

  it('shows the tailor-first guidance and no generate button when not tailored', () => {
    renderEditor({ isTailored: false });
    expect(screen.getByText('builder.generatePrompt.notAvailableTitle')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'coverLetter.wizard.actions.generate' })
    ).not.toBeInTheDocument();
  });

  it('transitions to the wizard when the generate button is clicked', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'coverLetter.wizard.actions.generate' }));
    expect(screen.getByText('coverLetter.wizard.title')).toBeInTheDocument();
    expect(
      screen.getByText('coverLetter.wizard.questions.companyConnection.label')
    ).toBeInTheDocument();
  });

  it('transitions to the done state after a successful generation', async () => {
    vi.mocked(generateCoverLetterGuided).mockResolvedValue('Cover letter text');
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'coverLetter.wizard.actions.generate' }));
    // The wizard submit button carries the same label key as the idle button.
    fireEvent.click(screen.getByRole('button', { name: 'coverLetter.wizard.actions.generate' }));

    await waitFor(() =>
      expect(screen.getByText('coverLetter.wizard.feedback.title')).toBeInTheDocument()
    );
    expect(
      screen.getByPlaceholderText('coverLetter.wizard.feedback.placeholder')
    ).toBeInTheDocument();
  });

  it('regenerates with the typed feedback and stored context', async () => {
    vi.mocked(generateCoverLetterGuided).mockResolvedValue('Revised letter');
    renderEditor({ content: 'Existing letter', initialContext: CONTEXT });

    const feedback = screen.getByPlaceholderText('coverLetter.wizard.feedback.placeholder');
    fireEvent.change(feedback, { target: { value: 'Make paragraph 2 more technical' } });
    fireEvent.click(screen.getByRole('button', { name: 'coverLetter.wizard.feedback.submit' }));

    await waitFor(() => expect(generateCoverLetterGuided).toHaveBeenCalledTimes(1));
    expect(generateCoverLetterGuided).toHaveBeenCalledWith('resume-1', {
      context: CONTEXT,
      feedback: 'Make paragraph 2 more technical',
    });
  });
});
