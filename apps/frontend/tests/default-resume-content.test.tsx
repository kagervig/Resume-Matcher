import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DefaultResumeContent } from '@/components/settings/default-resume-content';
import { readResumeDefaults } from '@/lib/utils/resume-defaults-storage';

// Real English messages, so a missing locale key (which renders as the key) fails here too.
vi.mock('@/lib/context/language-context', () => ({
  useLanguage: () => ({ uiLanguage: 'en' }),
}));

afterEach(() => localStorage.clear());

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save Defaults' }));

describe('DefaultResumeContent', () => {
  it('blocks saving and shows an error when the name is empty', () => {
    render(<DefaultResumeContent />);
    save();
    expect(screen.getByText('Full name is required.')).toBeInTheDocument();
    expect(readResumeDefaults().contact.name ?? '').toBe('');
  });

  it('shows an error for an invalid email', () => {
    render(<DefaultResumeContent />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    save();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('persists valid defaults to storage and confirms the save', () => {
    render(<DefaultResumeContent />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('City / Location'), { target: { value: 'Toronto' } });
    save();

    const stored = readResumeDefaults();
    expect(stored.contact.name).toBe('Jane Doe');
    expect(stored.contact.email).toBe('jane@example.com');
    expect(stored.contact.location).toBe('Toronto');
    expect(screen.getByText('Defaults saved')).toBeInTheDocument();
  });

  it('adds and stores an education entry', () => {
    render(<DefaultResumeContent />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Jane Doe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Education' }));
    fireEvent.change(screen.getByLabelText('School / Institution'), {
      target: { value: 'University of Toronto' },
    });
    fireEvent.change(screen.getByLabelText('Grade / GPA'), { target: { value: '3.9 GPA' } });
    save();

    const stored = readResumeDefaults();
    expect(stored.education).toHaveLength(1);
    expect(stored.education[0].institution).toBe('University of Toronto');
    expect(stored.education[0].grade).toBe('3.9 GPA');
  });

  it('stores each project description point from its own field', () => {
    render(<DefaultResumeContent />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Jane Doe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Project' }));
    fireEvent.change(screen.getByLabelText('Project Name'), {
      target: { value: 'Resume Matcher' },
    });

    // A new project starts with one empty point; add a second and fill both.
    const points = () => screen.getAllByPlaceholderText('Project detail...');
    fireEvent.change(points()[0], { target: { value: 'Built the tracker' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Point' }));
    fireEvent.change(points()[1], { target: { value: 'Shipped PDF export' } });
    save();

    const stored = readResumeDefaults();
    expect(stored.projects).toHaveLength(1);
    expect(stored.projects[0].name).toBe('Resume Matcher');
    expect(stored.projects[0].description).toEqual(['Built the tracker', 'Shipped PDF export']);
  });

  it('removes a single project description point, keeping the rest', () => {
    render(<DefaultResumeContent />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Jane Doe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Project' }));
    const points = () => screen.getAllByPlaceholderText('Project detail...');
    fireEvent.change(points()[0], { target: { value: 'Keep me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Point' }));
    fireEvent.change(points()[1], { target: { value: 'Drop me' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove this line' })[1]);
    save();

    expect(readResumeDefaults().projects[0].description).toEqual(['Keep me']);
  });
});
