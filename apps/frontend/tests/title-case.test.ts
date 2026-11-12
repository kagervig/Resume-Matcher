import { describe, expect, it } from 'vitest';
import { toTitleCase } from '@/lib/utils/title-case';

describe('toTitleCase', () => {
  it('capitalizes a single lower-case word', () => {
    expect(toTitleCase('python')).toBe('Python');
  });

  it('capitalizes each word in a phrase', () => {
    expect(toTitleCase('machine learning')).toBe('Machine Learning');
  });

  it('upper-cases known acronyms', () => {
    expect(toTitleCase('rest api')).toBe('REST API');
    expect(toTitleCase('sql')).toBe('SQL');
  });

  it('preserves words that already carry deliberate casing', () => {
    expect(toTitleCase('JavaScript')).toBe('JavaScript');
    expect(toTitleCase('iOS')).toBe('iOS');
  });

  it('capitalizes around a slash and keeps the separator', () => {
    expect(toTitleCase('ci/cd')).toBe('CI/CD');
  });

  it('collapses surrounding whitespace via trim', () => {
    expect(toTitleCase('  data analysis  ')).toBe('Data Analysis');
  });

  it('returns an empty string unchanged', () => {
    expect(toTitleCase('')).toBe('');
  });
});
