/**
 * Cover Letter Print Page
 *
 * This page renders a cover letter for PDF generation.
 * Uses the same API fetch pattern as the resume print page.
 */

import { API_BASE } from '@/lib/api/client';
import { translate } from '@/lib/i18n/server';
import { resolveLocale } from '@/lib/i18n/locale';

const PAGE_DIMENSIONS = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 215.9, height: 279.4 },
} as const;

type PageSize = 'A4' | 'LETTER';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    pageSize?: string;
    lang?: string;
    font?: string;
    fontSize?: string;
  }>;
};

const SAFE_FONTS = ['Georgia', 'Arial', 'Calibri', 'Times New Roman', 'Garamond'] as const;
type SafeFont = (typeof SAFE_FONTS)[number];

const SAFE_FONT_SIZES = ['10.5pt', '11pt', '11.5pt', '12pt'] as const;
type SafeFontSize = (typeof SAFE_FONT_SIZES)[number];

// Whitelist font params so a malicious URL cannot inject arbitrary CSS values.
function parseSafeFont(value: string | undefined): SafeFont {
  return (SAFE_FONTS as readonly string[]).includes(value ?? '') ? (value as SafeFont) : 'Georgia';
}

function parseSafeFontSize(value: string | undefined): SafeFontSize {
  return (SAFE_FONT_SIZES as readonly string[]).includes(value ?? '')
    ? (value as SafeFontSize)
    : '11pt';
}

interface PersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
}

interface CoverLetterData {
  coverLetter: string;
  personalInfo: PersonalInfo;
  signature: string;
}

async function fetchCoverLetterData(resumeId: string): Promise<CoverLetterData> {
  const res = await fetch(`${API_BASE}/resumes?resume_id=${encodeURIComponent(resumeId)}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load resume (status ${res.status}).`);
  }
  const payload = (await res.json()) as {
    data: {
      cover_letter?: string;
      cover_letter_signature?: string;
      processed_resume?: {
        personalInfo?: PersonalInfo;
      };
    };
  };

  return {
    coverLetter: payload.data.cover_letter || '',
    personalInfo: payload.data.processed_resume?.personalInfo || {},
    signature: payload.data.cover_letter_signature ?? '',
  };
}

function parsePageSize(value: string | undefined): PageSize {
  if (value === 'A4' || value === 'LETTER') {
    return value;
  }
  return 'A4';
}

export default async function PrintCoverLetterPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const pageSize = parsePageSize(resolvedSearchParams?.pageSize);
  const pageDims = PAGE_DIMENSIONS[pageSize];
  const locale = resolveLocale(resolvedSearchParams?.lang);
  const resolvedFont = parseSafeFont(resolvedSearchParams?.font);
  const resolvedFontSize = parseSafeFontSize(resolvedSearchParams?.fontSize);

  // Fetch cover letter data from API (same pattern as resume)
  let coverLetterData: CoverLetterData;
  try {
    coverLetterData = await fetchCoverLetterData(resolvedParams.id);
  } catch (error) {
    // Marker the PDF renderer waits for, so a load failure fails fast.
    console.error('Failed to load cover letter:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return <div data-print-error="cover-letter-unavailable">Cover letter unavailable</div>;
  }
  const { coverLetter, personalInfo, signature } = coverLetterData;

  // Standard cover letter margins
  const margins = { top: 25, right: 25, bottom: 25, left: 25 };

  // Get today's date formatted
  // oxlint-disable-next-line react/purity -- server component, rendered once per request
  const today = new Date().toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const nameFallback = translate(locale, 'resume.defaults.name');

  // Split cover letter into paragraphs
  const paragraphs = coverLetter
    .split(/\n\n+/)
    .flatMap((p) => p.split('\n'))
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div
      className="cover-letter-print bg-white"
      style={{
        width: `${pageDims.width}mm`,
        minHeight: `${pageDims.height}mm`,
        padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`,
        boxSizing: 'border-box',
        fontFamily: `${resolvedFont}, serif`,
        color: '#000000',
      }}
    >
      {/* Header - Personal Info */}
      <header
        style={{
          marginBottom: '8mm',
          paddingBottom: '4mm',
          borderBottom: '2px solid #000',
        }}
      >
        <h1
          style={{
            fontSize: '18pt',
            fontWeight: 'bold',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {personalInfo.name || nameFallback}
        </h1>
        <div
          style={{
            marginTop: '2mm',
            fontSize: '9pt',
            color: '#666',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4mm',
          }}
        >
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
          {personalInfo.linkedin && <span>{personalInfo.linkedin}</span>}
        </div>
      </header>

      {/* Date */}
      <div
        style={{
          marginBottom: '8mm',
          fontSize: '10pt',
          color: '#666',
        }}
      >
        {today}
      </div>

      {/* Body */}
      <div style={{ lineHeight: '1.6' }}>
        {paragraphs.length > 0 ? (
          paragraphs.map((para, idx) => (
            <p
              key={idx}
              style={{
                fontSize: resolvedFontSize,
                margin: '0 0 4mm 0',
                textAlign: 'justify',
              }}
            >
              {para}
            </p>
          ))
        ) : (
          <p style={{ fontSize: resolvedFontSize, color: '#999' }}>
            {translate(locale, 'coverLetter.print.emptyContent')}
          </p>
        )}
      </div>

      {/* Signature */}
      {signature && (
        <div style={{ marginTop: '8mm' }}>
          <p style={{ fontSize: resolvedFontSize, whiteSpace: 'pre-line' }}>{signature}</p>
        </div>
      )}
    </div>
  );
}
