import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DiffPreviewModal } from '@/components/tailor/diff-preview-modal';
import type {
  ResumeDiffSummary,
  ResumeFieldDiff,
} from '@/components/common/resume_previewer_context';
import { submitRating } from '@/lib/api/usage';

vi.mock('@/lib/i18n', () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/api/usage', () => ({
  submitRating: vi.fn().mockResolvedValue({ request_id: 'req-1', rating: 'good', updated: 1 }),
}));

const diffSummary: ResumeDiffSummary = {
  total_changes: 1,
  skills_added: 1,
  skills_removed: 0,
  descriptions_modified: 0,
  certifications_added: 0,
  high_risk_changes: 0,
};

const detailedChanges: ResumeFieldDiff[] = [
  {
    field_path: 'additional.technicalSkills',
    field_type: 'skill',
    change_type: 'added',
    new_value: 'Go',
    confidence: 'medium',
  },
];

function renderModal(requestId?: string) {
  return render(
    <DiffPreviewModal
      isOpen
      onClose={vi.fn()}
      onReject={vi.fn()}
      onConfirm={vi.fn()}
      diffSummary={diffSummary}
      detailedChanges={detailedChanges}
      requestId={requestId}
    />
  );
}

describe('DiffPreviewModal rating control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render the rating control without a request id', () => {
    renderModal(undefined);
    expect(screen.queryByText('tailor.rating.prompt')).toBeNull();
  });

  it('submits the rating with the request id and shows a confirmed state', async () => {
    renderModal('req-1');
    fireEvent.click(screen.getByText('tailor.rating.good'));

    expect(submitRating).toHaveBeenCalledWith('req-1', 'good');
    await waitFor(() => {
      expect(screen.getByText('tailor.rating.thanks')).toBeTruthy();
    });
  });
});
