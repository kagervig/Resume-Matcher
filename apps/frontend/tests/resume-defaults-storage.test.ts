import { afterEach, describe, expect, it } from 'vitest';
import { EMPTY_RESUME_DEFAULTS } from '@/lib/types/resume-defaults';
import { createInitialResumeWizardState } from '@/lib/api/resume-wizard';
import {
  applyResumeDefaults,
  readResumeDefaults,
  writeResumeDefaults,
  RESUME_DEFAULTS_STORAGE_KEY,
} from '@/lib/utils/resume-defaults-storage';

afterEach(() => localStorage.clear());

describe('resume defaults storage', () => {
  it('round-trips saved contact, education and projects through localStorage', () => {
    writeResumeDefaults({
      contact: { name: 'Jane Doe', email: 'jane@example.com', location: 'Toronto' },
      education: [
        {
          id: 99,
          institution: 'U of T',
          degree: 'BSc',
          years: '2020',
          grade: '3.9 GPA',
          description: '',
        },
      ],
      projects: [
        {
          id: 5,
          name: 'Resume Matcher',
          role: 'Maintainer',
          years: '2024',
          github: 'https://github.com/x',
          website: '',
          description: ['Built the tracker', 'Shipped PDF export'],
        },
      ],
    });

    const restored = readResumeDefaults();
    expect(restored.contact.name).toBe('Jane Doe');
    expect(restored.education).toHaveLength(1);
    expect(restored.education[0]).toMatchObject({
      institution: 'U of T',
      degree: 'BSc',
      grade: '3.9 GPA',
    });
    expect(restored.projects).toHaveLength(1);
    expect(restored.projects[0]).toMatchObject({
      name: 'Resume Matcher',
      description: ['Built the tracker', 'Shipped PDF export'],
      descriptionStyles: ['bullet', 'bullet'],
    });
  });

  it('returns empty defaults when nothing is stored', () => {
    expect(readResumeDefaults()).toEqual(EMPTY_RESUME_DEFAULTS);
  });

  it('returns empty defaults for corrupt JSON', () => {
    localStorage.setItem(RESUME_DEFAULTS_STORAGE_KEY, '{not valid json');
    expect(readResumeDefaults()).toEqual(EMPTY_RESUME_DEFAULTS);
  });

  it('normalizes education ids to a stable sequence', () => {
    localStorage.setItem(
      RESUME_DEFAULTS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        defaults: {
          contact: {},
          education: [{ institution: 'A', years: 2021 }, { institution: 'B' }],
        },
      })
    );
    const restored = readResumeDefaults();
    expect(restored.education.map((e) => e.id)).toEqual([1, 2]);
    expect(restored.education[0].years).toBe('2021');
  });

  it('drops empty project description rows and defaults their styles to bullet', () => {
    localStorage.setItem(
      RESUME_DEFAULTS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        defaults: {
          contact: {},
          education: [],
          projects: [{ name: 'X', years: 2022, description: ['', 'Real row', '  '] }],
        },
      })
    );
    const restored = readResumeDefaults();
    expect(restored.projects[0]).toMatchObject({
      id: 1,
      years: '2022',
      description: ['Real row'],
      descriptionStyles: ['bullet'],
    });
  });
});

describe('applyResumeDefaults', () => {
  it('seeds non-empty contact fields, education and projects onto a fresh wizard state', () => {
    const seeded = applyResumeDefaults(createInitialResumeWizardState(), {
      contact: { name: 'Jane Doe', email: '', location: 'Toronto' },
      education: [{ id: 1, institution: 'U of T', degree: 'BSc', years: '2020', description: '' }],
      projects: [{ id: 1, name: 'Resume Matcher', description: ['Did a thing'] }],
    });

    expect(seeded.resume_data.personalInfo?.name).toBe('Jane Doe');
    expect(seeded.resume_data.personalInfo?.location).toBe('Toronto');
    // An empty default leaves the state's own (empty) value untouched.
    expect(seeded.resume_data.personalInfo?.email).toBe('');
    expect(seeded.resume_data.education).toHaveLength(1);
    expect(seeded.resume_data.personalProjects).toHaveLength(1);
  });

  it('keeps the state lists when there are no default entries', () => {
    const initial = createInitialResumeWizardState();
    const seeded = applyResumeDefaults(initial, { contact: {}, education: [], projects: [] });
    expect(seeded.resume_data.education).toEqual(initial.resume_data.education);
    expect(seeded.resume_data.personalProjects).toEqual(initial.resume_data.personalProjects);
  });

  it('does not clobber a non-empty state list or an already-set contact field', () => {
    const state = createInitialResumeWizardState();
    state.resume_data.personalInfo = { name: 'Grace Hopper' };
    state.resume_data.education = [{ id: 1, institution: 'Yale', degree: 'PhD', years: '1934' }];

    const seeded = applyResumeDefaults(state, {
      contact: { name: 'Default Name', email: 'd@example.com' },
      education: [{ id: 9, institution: 'Default U', degree: 'BSc', years: '2000' }],
      projects: [{ id: 1, name: 'Default Project', description: ['x'] }],
    });

    // Existing name kept; empty email filled from defaults.
    expect(seeded.resume_data.personalInfo?.name).toBe('Grace Hopper');
    expect(seeded.resume_data.personalInfo?.email).toBe('d@example.com');
    // Existing education kept (not replaced); empty projects filled.
    expect(seeded.resume_data.education).toHaveLength(1);
    expect(seeded.resume_data.education?.[0].institution).toBe('Yale');
    expect(seeded.resume_data.personalProjects).toHaveLength(1);
    expect(seeded.resume_data.personalProjects?.[0].name).toBe('Default Project');
  });
});
