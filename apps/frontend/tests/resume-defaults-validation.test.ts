import { describe, expect, it } from 'vitest';
import {
  getResumeDefaultsErrors,
  hasResumeDefaultsErrors,
  isValidEmail,
} from '@/lib/types/resume-defaults';

describe('isValidEmail', () => {
  it('accepts a well-formed address', () => {
    expect(isValidEmail('jane.doe@example.com')).toBe(true);
  });

  it('rejects an address without a domain dot', () => {
    expect(isValidEmail('jane@localhost')).toBe(false);
  });

  it('rejects an address with whitespace', () => {
    expect(isValidEmail('jane doe@example.com')).toBe(false);
  });

  it('trims surrounding whitespace before checking', () => {
    expect(isValidEmail('  jane@example.com  ')).toBe(true);
  });
});

describe('getResumeDefaultsErrors', () => {
  it('flags a missing name', () => {
    const errors = getResumeDefaultsErrors({
      contact: { name: '   ' },
      education: [],
      projects: [],
    });
    expect(errors.nameRequired).toBe(true);
  });

  it('does not flag email when it is empty', () => {
    const errors = getResumeDefaultsErrors({
      contact: { name: 'Jane' },
      education: [],
      projects: [],
    });
    expect(errors.emailInvalid).toBe(false);
  });

  it('flags an invalid email only when one is present', () => {
    const errors = getResumeDefaultsErrors({
      contact: { name: 'Jane', email: 'not-an-email' },
      education: [],
      projects: [],
    });
    expect(errors.emailInvalid).toBe(true);
  });

  it('reports no errors for a valid name and email', () => {
    const errors = getResumeDefaultsErrors({
      contact: { name: 'Jane', email: 'jane@example.com' },
      education: [],
      projects: [],
    });
    expect(hasResumeDefaultsErrors(errors)).toBe(false);
  });
});
