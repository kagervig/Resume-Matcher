import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ATSScore } from '@/components/common/resume_previewer_context';
import { ATSScoreCard } from '@/components/tailor/ats-score-card';

// Real English messages, so the add/added aria-labels resolve to final strings
// (and each keyword gets a distinct accessible name via {keyword} substitution).
vi.mock('@/lib/context/language-context', () => ({
  useLanguage: () => ({ uiLanguage: 'en' }),
}));

afterEach(cleanup);

const score: ATSScore = {
  overall_score: 72,
  sub_scores: { keyword_match: 60, skills_coverage: 70, section_completeness: 90 },
  missing_keywords: ['react', 'typescript'],
  injectable_keywords: [],
  recommendations: [],
};

describe('ATSScoreCard add-to-skills tags', () => {
  it('renders missing keywords as buttons and reports the clicked keyword', () => {
    const onAddKeyword = vi.fn();
    render(<ATSScoreCard atsScore={score} onAddKeyword={onAddKeyword} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add react to skills' }));
    expect(onAddKeyword).toHaveBeenCalledWith('react');
  });

  it('renders an already-added keyword as a disabled tag that does not fire', () => {
    const onAddKeyword = vi.fn();
    render(
      <ATSScoreCard
        atsScore={score}
        onAddKeyword={onAddKeyword}
        addedKeywords={new Set(['react'])}
      />
    );

    const added = screen.getByRole('button', { name: 'react is already in your skills' });
    expect(added).toBeDisabled();
    fireEvent.click(added);
    expect(onAddKeyword).not.toHaveBeenCalled();
  });

  it('renders plain, non-interactive tags when no handler is provided', () => {
    render(<ATSScoreCard atsScore={score} />);

    expect(screen.queryByRole('button', { name: /Add react to skills/ })).toBeNull();
    expect(screen.getByText('react')).toBeInTheDocument();
  });
});
