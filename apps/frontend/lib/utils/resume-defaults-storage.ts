import type { Education, PersonalInfo, Project } from '@/components/dashboard/resume-component';
import type { ResumeWizardState } from '@/lib/api/resume-wizard';
import { EMPTY_RESUME_DEFAULTS, type ResumeDefaults } from '@/lib/types/resume-defaults';

export const RESUME_DEFAULTS_STORAGE_KEY = 'resume_defaults';
export const RESUME_DEFAULTS_SCHEMA_VERSION = 1;

interface ResumeDefaultsEnvelope {
  schemaVersion: typeof RESUME_DEFAULTS_SCHEMA_VERSION;
  defaults: ResumeDefaults;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Years may arrive as a number from an older or hand-edited payload. */
function yearsValue(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : stringValue(value);
}

function normalizeContact(value: unknown): PersonalInfo {
  const contact = isRecord(value) ? value : {};
  return {
    name: stringValue(contact.name),
    title: stringValue(contact.title),
    email: stringValue(contact.email),
    phone: stringValue(contact.phone),
    location: stringValue(contact.location),
    website: stringValue(contact.website),
    linkedin: stringValue(contact.linkedin),
    github: stringValue(contact.github),
  };
}

/** Assign stable sequential ids so entries spread straight into `resume_data.education`. */
function normalizeEducation(value: unknown): Education[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!isRecord(entry)) return [];
    return [
      {
        id: index + 1,
        institution: stringValue(entry.institution),
        degree: stringValue(entry.degree),
        years: yearsValue(entry.years),
        grade: stringValue(entry.grade),
        description: stringValue(entry.description),
      },
    ];
  });
}

/** Pair non-empty description rows with their styles; unset styles default to a bullet. */
function descriptionRows(
  value: unknown,
  styles: unknown
): { description: string[]; descriptionStyles: ('plain' | 'bullet')[] } {
  const rows = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
  const rawStyles = Array.isArray(styles) ? styles : [];
  const paired = rows.flatMap((row, index) =>
    typeof row === 'string' && row.trim()
      ? [
          {
            text: row.trim(),
            style: rawStyles[index] === 'plain' ? ('plain' as const) : ('bullet' as const),
          },
        ]
      : []
  );
  return {
    description: paired.map((row) => row.text),
    descriptionStyles: paired.map((row) => row.style),
  };
}

/** Assign stable sequential ids so entries spread straight into `resume_data.personalProjects`. */
function normalizeProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!isRecord(entry)) return [];
    return [
      {
        id: index + 1,
        name: stringValue(entry.name),
        role: stringValue(entry.role),
        years: yearsValue(entry.years),
        github: stringValue(entry.github),
        website: stringValue(entry.website),
        ...descriptionRows(entry.description, entry.descriptionStyles),
      },
    ];
  });
}

function normalizeDefaults(value: unknown): ResumeDefaults {
  if (!isRecord(value)) return EMPTY_RESUME_DEFAULTS;
  return {
    contact: normalizeContact(value.contact),
    education: normalizeEducation(value.education),
    projects: normalizeProjects(value.projects),
  };
}

export function readResumeDefaults(): ResumeDefaults {
  try {
    const raw = localStorage.getItem(RESUME_DEFAULTS_STORAGE_KEY);
    if (!raw) return EMPTY_RESUME_DEFAULTS;
    const parsed = JSON.parse(raw) as unknown;
    if (isRecord(parsed) && 'schemaVersion' in parsed) {
      if (parsed.schemaVersion !== RESUME_DEFAULTS_SCHEMA_VERSION) return EMPTY_RESUME_DEFAULTS;
      return normalizeDefaults(parsed.defaults);
    }
    return normalizeDefaults(parsed);
  } catch {
    return EMPTY_RESUME_DEFAULTS;
  }
}

/**
 * Fill empty slots of a wizard state from saved defaults: set a contact field
 * only when the state's own value is blank, and adopt a default list only when
 * the state's own list is empty. Because it only fills gaps, it is safe to layer
 * over any draft — it never clobbers content the user already entered, and a
 * per-resume edit never writes back to the stored defaults.
 */
export function applyResumeDefaults(
  state: ResumeWizardState,
  defaults: ResumeDefaults
): ResumeWizardState {
  const personalInfo: PersonalInfo = { ...state.resume_data.personalInfo };
  for (const [key, value] of Object.entries(defaults.contact)) {
    const field = key as keyof PersonalInfo;
    const current = personalInfo[field];
    if (typeof value === 'string' && value.trim() && !(current && current.trim())) {
      personalInfo[field] = value;
    }
  }
  const hasEducation = (state.resume_data.education ?? []).length > 0;
  const hasProjects = (state.resume_data.personalProjects ?? []).length > 0;
  return {
    ...state,
    resume_data: {
      ...state.resume_data,
      personalInfo,
      education:
        !hasEducation && defaults.education.length
          ? defaults.education
          : state.resume_data.education,
      personalProjects:
        !hasProjects && defaults.projects.length
          ? defaults.projects
          : state.resume_data.personalProjects,
    },
  };
}

export function writeResumeDefaults(defaults: ResumeDefaults): boolean {
  const envelope: ResumeDefaultsEnvelope = {
    schemaVersion: RESUME_DEFAULTS_SCHEMA_VERSION,
    defaults: normalizeDefaults(defaults),
  };
  try {
    localStorage.setItem(RESUME_DEFAULTS_STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}
