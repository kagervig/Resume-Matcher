import type { Education, PersonalInfo, Project } from '@/components/dashboard/resume-component';

/**
 * Static resume content a user saves once in Settings ("Default Resume Content")
 * and that seeds the resume wizard when a new resume is started. Reuses the resume
 * data shapes so the stored values spread straight into `resume_data`.
 */
export interface ResumeDefaults {
  contact: PersonalInfo;
  education: Education[];
  projects: Project[];
}

export const EMPTY_RESUME_DEFAULTS: ResumeDefaults = { contact: {}, education: [], projects: [] };

/** Pragmatic email check: one `@`, a dot in the domain, no whitespace. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export interface ResumeDefaultsErrors {
  /** The full-name field is empty. */
  nameRequired: boolean;
  /** An email was entered but is not a valid address. */
  emailInvalid: boolean;
}

/**
 * Form-level validation: a name is required; an email is validated only when the
 * user typed one (an empty email is allowed). URLs are optional and not enforced.
 */
export function getResumeDefaultsErrors(defaults: ResumeDefaults): ResumeDefaultsErrors {
  const name = defaults.contact.name?.trim() ?? '';
  const email = defaults.contact.email?.trim() ?? '';
  return {
    nameRequired: name.length === 0,
    emailInvalid: email.length > 0 && !isValidEmail(email),
  };
}

export function hasResumeDefaultsErrors(errors: ResumeDefaultsErrors): boolean {
  return errors.nameRequired || errors.emailInvalid;
}
