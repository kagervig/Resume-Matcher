import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PersonalInfoHeader } from '@/components/resume/personal-info-header';
import { getVisibleContacts } from '@/lib/utils/personal-info';
import { getResumePdfUrl } from '@/lib/api/resume';
import {
  DEFAULT_TEMPLATE_SETTINGS,
  type PersonalInfoField,
  type PersonalInfoLayout,
  type PersonalInfoNameStyle,
  type PersonalInfoSettings,
  type TemplateSettings,
} from '@/lib/types/template-settings';
import type { PersonalInfo } from '@/components/dashboard/resume-component';

interface SettingsOverride {
  layout?: PersonalInfoLayout;
  nameStyle?: PersonalInfoNameStyle;
  fields?: Partial<Record<PersonalInfoField, boolean>>;
}

const personalInfo: PersonalInfo = {
  name: 'Jane Doe',
  title: 'Senior Engineer',
  email: 'jane@example.com',
  phone: '555-1234',
  location: 'New York',
  website: 'janedoe.dev',
  linkedin: 'www.linkedin.com/in/jane',
  github: 'https://github.com/jane',
};

const settings = (overrides: SettingsOverride = {}): PersonalInfoSettings => ({
  ...DEFAULT_TEMPLATE_SETTINGS.personalInfo,
  ...overrides,
  fields: { ...DEFAULT_TEMPLATE_SETTINGS.personalInfo.fields, ...overrides.fields },
});

describe('getVisibleContacts', () => {
  it('returns enabled, non-empty contacts in canonical order', () => {
    const contacts = getVisibleContacts(personalInfo, settings().fields);
    expect(contacts.map((c) => c.field)).toEqual([
      'email',
      'phone',
      'location',
      'website',
      'linkedin',
      'github',
    ]);
  });

  it('omits a field that is toggled off', () => {
    const contacts = getVisibleContacts(
      personalInfo,
      settings({ fields: { phone: false } }).fields
    );
    expect(contacts.some((c) => c.field === 'phone')).toBe(false);
  });

  it('omits a field with an empty value even when enabled', () => {
    const contacts = getVisibleContacts({ ...personalInfo, github: '' }, settings().fields);
    expect(contacts.some((c) => c.field === 'github')).toBe(false);
  });

  it('builds mailto/https links and strips the scheme from the label', () => {
    const contacts = getVisibleContacts(personalInfo, settings().fields);
    const email = contacts.find((c) => c.field === 'email');
    const github = contacts.find((c) => c.field === 'github');
    expect(email?.href).toBe('mailto:jane@example.com');
    expect(github?.href).toBe('https://github.com/jane');
    expect(github?.display).toBe('github.com/jane');
  });
});

describe('PersonalInfoHeader', () => {
  it('renders the name and the enabled contacts', () => {
    render(<PersonalInfoHeader personalInfo={personalInfo} settings={settings()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Jane Doe');
    expect(screen.getByText('jane@example.com')).toBeTruthy();
  });

  it('does not render a field that is toggled off', () => {
    render(
      <PersonalInfoHeader
        personalInfo={personalInfo}
        settings={settings({ fields: { email: false } })}
      />
    );
    expect(screen.queryByText('jane@example.com')).toBeNull();
  });

  it('hides the title when the title field is off', () => {
    render(
      <PersonalInfoHeader
        personalInfo={personalInfo}
        settings={settings({ fields: { title: false } })}
      />
    );
    expect(screen.queryByText('Senior Engineer')).toBeNull();
  });

  it('uses the compact name sizing for the "match" name style', () => {
    const { rerender, container } = render(
      <PersonalInfoHeader personalInfo={personalInfo} settings={settings({ nameStyle: 'large' })} />
    );
    const largeClass = container.querySelector('h1')?.className ?? '';
    rerender(
      <PersonalInfoHeader personalInfo={personalInfo} settings={settings({ nameStyle: 'match' })} />
    );
    const matchClass = container.querySelector('h1')?.className ?? '';
    expect(matchClass).not.toBe(largeClass);
  });
});

describe('getResumePdfUrl personal-info params', () => {
  const base: TemplateSettings = {
    ...DEFAULT_TEMPLATE_SETTINGS,
    personalInfo: settings({ layout: 'one-line', nameStyle: 'match', fields: { phone: false } }),
  };

  it('serializes layout, name style, and the enabled fields as CSV', () => {
    const url = getResumePdfUrl('resume-1', base);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('piLayout')).toBe('one-line');
    expect(params.get('piNameStyle')).toBe('match');
    const fields = params.get('piFields')!.split(',');
    expect(fields).toContain('email');
    expect(fields).not.toContain('phone');
  });
});
