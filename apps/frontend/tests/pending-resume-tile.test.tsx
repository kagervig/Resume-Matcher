import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PendingResumeTile } from '@/components/dashboard/pending-resume-tile';
import { applyResume } from '@/lib/api/tracker';
import type { ResumeListItem } from '@/lib/api/resume';

vi.mock('@/lib/i18n', () => ({
  useTranslations: () => ({ t: (key: string) => key, locale: 'en' }),
}));
vi.mock('@/lib/api/tracker', () => ({ applyResume: vi.fn() }));

const resume: ResumeListItem = {
  resume_id: 'r1',
  title: 'Tailored for Acme',
  filename: 'r1.pdf',
  is_master: false,
  is_default_master: false,
  parent_id: 'm1',
  processing_status: 'ready',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

beforeEach(() => vi.clearAllMocks());

describe('PendingResumeTile "I Applied"', () => {
  it('marks the resume applied and notifies the parent with its id', async () => {
    vi.mocked(applyResume).mockResolvedValue({} as Awaited<ReturnType<typeof applyResume>>);
    const onApplied = vi.fn();
    render(<PendingResumeTile resume={resume} onApplied={onApplied} locale="en" />);

    fireEvent.click(screen.getByRole('button', { name: 'dashboard.iApplied' }));

    await waitFor(() => expect(onApplied).toHaveBeenCalledWith('r1'));
    expect(applyResume).toHaveBeenCalledWith('r1');
  });

  it('shows the targeted job as "{role} @ {company}"', () => {
    render(
      <PendingResumeTile
        resume={{ ...resume, job_role: 'Staff Engineer', job_company: 'Acme Corp' }}
        onApplied={vi.fn()}
        locale="en"
      />
    );
    expect(screen.getByText('Staff Engineer @ Acme Corp')).toBeInTheDocument();
  });

  describe('when the apply call fails', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => errorSpy.mockRestore());

    it('shows an error alert and does not notify the parent', async () => {
      vi.mocked(applyResume).mockRejectedValue(new Error('offline'));
      const onApplied = vi.fn();
      render(<PendingResumeTile resume={resume} onApplied={onApplied} locale="en" />);

      fireEvent.click(screen.getByRole('button', { name: 'dashboard.iApplied' }));

      expect(await screen.findByText('dashboard.iAppliedError')).toBeInTheDocument();
      expect(onApplied).not.toHaveBeenCalled();
    });
  });
});
