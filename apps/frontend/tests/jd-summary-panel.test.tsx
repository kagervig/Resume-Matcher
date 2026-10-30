import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JdSummaryPanel } from '@/components/builder/jd-summary-panel';

// Return the key so assertions are deterministic.
vi.mock('@/lib/i18n', () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

const mockFetchJdSummary = vi.fn();
const mockGenerateJdSummary = vi.fn();
vi.mock('@/lib/api/resume', () => ({
  fetchJdSummary: (id: string) => mockFetchJdSummary(id),
  generateJdSummary: (id: string) => mockGenerateJdSummary(id),
}));

const RECORD = {
  summary: {
    summary: 'A senior backend role building Python APIs.',
    core_competencies: ['Backend API design', 'Cloud infrastructure'],
    keywords: ['Python', 'FastAPI'],
  },
  generated_at: '2026-10-20T00:00:00Z',
};

afterEach(() => {
  mockFetchJdSummary.mockReset();
  mockGenerateJdSummary.mockReset();
});

describe('JdSummaryPanel', () => {
  it('shows the empty state with a generate button when no summary is cached', async () => {
    mockFetchJdSummary.mockResolvedValue(null);

    render(<JdSummaryPanel resumeId="r1" />);

    await waitFor(() => expect(screen.getByText('builder.jdMatch.summary.empty')).toBeTruthy());
    expect(screen.getByText('builder.jdMatch.summary.generate')).toBeTruthy();
  });

  it('renders summary, competencies, and keywords after generating', async () => {
    mockFetchJdSummary.mockResolvedValue(null);
    mockGenerateJdSummary.mockResolvedValue(RECORD);

    render(<JdSummaryPanel resumeId="r1" />);
    await waitFor(() => expect(screen.getByText('builder.jdMatch.summary.generate')).toBeTruthy());

    fireEvent.click(screen.getByText('builder.jdMatch.summary.generate'));

    await waitFor(() =>
      expect(screen.getByText('A senior backend role building Python APIs.')).toBeTruthy()
    );
    expect(mockGenerateJdSummary).toHaveBeenCalledWith('r1');
    expect(screen.getByText('Backend API design')).toBeTruthy();
    expect(screen.getByText('Python')).toBeTruthy();
    expect(screen.getByText('FastAPI')).toBeTruthy();
  });

  it('shows an error alert when generation fails', async () => {
    mockFetchJdSummary.mockResolvedValue(null);
    mockGenerateJdSummary.mockRejectedValue(new Error('boom'));

    render(<JdSummaryPanel resumeId="r1" />);
    await waitFor(() => expect(screen.getByText('builder.jdMatch.summary.generate')).toBeTruthy());

    fireEvent.click(screen.getByText('builder.jdMatch.summary.generate'));

    await waitFor(() =>
      expect(screen.getByText('builder.jdMatch.summary.generateFailed')).toBeTruthy()
    );
  });
});
