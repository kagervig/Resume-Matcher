import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dropdown } from '@/components/ui/dropdown';

vi.mock('@/lib/i18n', () => ({ useTranslations: () => ({ t: (key: string) => key }) }));

const OPTIONS = [
  { id: 'anthropic/claude', label: 'Claude 3.7 Sonnet' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'google/gemini', label: 'Gemini 2.0 Flash' },
];

function Harness() {
  const [value, setValue] = useState('');
  return <Dropdown label="Model" options={OPTIONS} value={value} onChange={setValue} searchable />;
}

describe('searchable Dropdown', () => {
  afterEach(cleanup);

  const open = () => fireEvent.click(screen.getByRole('button'));

  it('filters options by the typed query', () => {
    render(<Harness />);
    open();
    expect(screen.getByText('GPT-4o')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('common.search'), { target: { value: 'claude' } });

    expect(screen.getByText('Claude 3.7 Sonnet')).toBeTruthy();
    expect(screen.queryByText('GPT-4o')).toBeNull();
  });

  it('shows a no-results message when nothing matches', () => {
    render(<Harness />);
    open();
    fireEvent.change(screen.getByLabelText('common.search'), { target: { value: 'zzz' } });
    expect(screen.getByText('common.noResults')).toBeTruthy();
  });

  it('selects the first match on Enter in the search box', () => {
    render(<Harness />);
    open();
    const search = screen.getByLabelText('common.search');
    fireEvent.change(search, { target: { value: 'gpt' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(screen.getByRole('button', { name: /GPT-4o/ })).toBeTruthy();
  });
});
