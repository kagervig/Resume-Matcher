import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import PrintCoverLetterPage from '@/app/print/cover-letter/[id]/page';

function makeSuccessResponse(overrides: Record<string, unknown> = {}) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        data: {
          cover_letter: 'Dear Hiring Manager,\n\nI am applying for the role.',
          processed_resume: { personalInfo: { name: 'Jane Doe', email: 'jane@example.com' } },
          ...overrides,
        },
      }),
  });
}

describe('print cover letter page', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the error marker when the resume cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const element = await PrintCoverLetterPage({
      params: Promise.resolve({ id: 'missing-id' }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(element);

    expect(container.querySelector('.cover-letter-print')).toBeNull();
    expect(container.querySelector('[data-print-error]')?.textContent?.trim()).not.toBe('');
  });

  it('renders the signature when cover_letter_signature is present', async () => {
    vi.stubGlobal('fetch', makeSuccessResponse({ cover_letter_signature: 'Sincerely,\nJane Doe' }));

    const element = await PrintCoverLetterPage({
      params: Promise.resolve({ id: 'some-id' }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(element);

    const signatureEl = container.querySelector('[style*="white-space: pre-line"]');
    expect(signatureEl?.textContent).toBe('Sincerely,\nJane Doe');
  });

  it('renders without a signature when cover_letter_signature is absent', async () => {
    vi.stubGlobal('fetch', makeSuccessResponse());

    const element = await PrintCoverLetterPage({
      params: Promise.resolve({ id: 'some-id' }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(element);

    expect(container.querySelector('.cover-letter-print')).not.toBeNull();
  });
});
