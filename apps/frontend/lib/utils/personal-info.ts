import type { PersonalInfo } from '@/components/dashboard/resume-component';
import type { PersonalInfoField } from '@/lib/types/template-settings';

/** One resolved contact entry ready to render. `href` null means plain text. */
export interface ContactEntry {
  field: Exclude<PersonalInfoField, 'title'>;
  /** Stable label used for icon lookup and ATS-friendly link text. */
  label: 'Email' | 'Phone' | 'Location' | 'Website' | 'LinkedIn' | 'GitHub';
  value: string;
  href: string | null;
  /** Display text (protocol/`www.` stripped for URL-like fields). */
  display: string;
}

const LINK_FIELDS = new Set<PersonalInfoField>(['website', 'linkedin', 'github']);

const ORDER: {
  field: ContactEntry['field'];
  label: ContactEntry['label'];
  prefix: string;
}[] = [
  { field: 'email', label: 'Email', prefix: 'mailto:' },
  { field: 'phone', label: 'Phone', prefix: 'tel:' },
  { field: 'location', label: 'Location', prefix: '' },
  { field: 'website', label: 'Website', prefix: '' },
  { field: 'linkedin', label: 'LinkedIn', prefix: '' },
  { field: 'github', label: 'GitHub', prefix: '' },
];

function resolve(
  field: ContactEntry['field'],
  label: ContactEntry['label'],
  prefix: string,
  value: string
): ContactEntry {
  if (LINK_FIELDS.has(field)) {
    // URL fields are always links; add a scheme if the user omitted one, and
    // show the host without the scheme/`www.` prefix.
    const href = /^(https?:)?\/\//.test(value) ? value : `https://${value}`;
    const display = value.replace(/^https?:\/\//, '').replace(/^www\./, '');
    return { field, label, value, href, display };
  }
  // email → mailto:, phone → tel:, location → plain text.
  return { field, label, value, href: prefix ? prefix + value : null, display: value };
}

/**
 * The contact entries to render, in canonical order: a field appears only when
 * it is both toggled on and has a non-empty value. Pure — shared by the header
 * component and the two-column sidebar templates so field toggles behave the same.
 */
export function getVisibleContacts(
  personalInfo: PersonalInfo,
  fields: Record<PersonalInfoField, boolean>
): ContactEntry[] {
  const entries: ContactEntry[] = [];
  for (const { field, label, prefix } of ORDER) {
    if (!fields[field]) continue;
    const value = (personalInfo[field] ?? '').trim();
    if (!value) continue;
    entries.push(resolve(field, label, prefix, value));
  }
  return entries;
}
