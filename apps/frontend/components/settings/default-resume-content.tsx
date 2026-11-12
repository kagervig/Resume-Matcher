'use client';

import { useEffect, useState } from 'react';
import {
  IdentificationCard,
  ListBullets,
  Plus,
  SpinnerGap,
  TextAlignLeft,
  Trash,
} from '@phosphor-icons/react';
import type { Education, PersonalInfo, Project } from '@/components/dashboard/resume-component';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, labelClass } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { useTranslations } from '@/lib/i18n';
import {
  getResumeDefaultsErrors,
  hasResumeDefaultsErrors,
  type ResumeDefaults,
} from '@/lib/types/resume-defaults';
import { alignDescriptionStyles, toggleDescriptionStyle } from '@/lib/utils/description-styles';
import { readResumeDefaults, writeResumeDefaults } from '@/lib/utils/resume-defaults-storage';

type ContactField = keyof PersonalInfo;
type EducationField = keyof Omit<Education, 'id'>;
type ProjectField = 'name' | 'role' | 'years' | 'github' | 'website';

function emptyEducation(id: number): Education {
  return { id, institution: '', degree: '', years: '', grade: '', description: '' };
}

function emptyProject(id: number): Project {
  return {
    id,
    name: '',
    role: '',
    years: '',
    github: '',
    website: '',
    description: [''],
    descriptionStyles: ['bullet'],
  };
}

/**
 * Settings section for global default resume content. Contact details and education
 * are stored in localStorage (via resume-defaults-storage) and seed the resume wizard
 * when a new resume is started, so a user doesn't retype them each time.
 */
export function DefaultResumeContent() {
  const { t } = useTranslations();
  const [contact, setContact] = useState<PersonalInfo>({});
  const [education, setEducation] = useState<Education[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const defaults = readResumeDefaults();
    setContact(defaults.contact);
    setEducation(defaults.education);
    setProjects(defaults.projects);
  }, []);

  const errors = getResumeDefaultsErrors({ contact, education, projects });

  // Editing invalidates the "saved" confirmation and any shown validation state.
  const markDirty = () => {
    setSaved(false);
    setShowErrors(false);
  };

  const setContactField = (field: ContactField, value: string) => {
    markDirty();
    setContact((current) => ({ ...current, [field]: value }));
  };

  const setEducationField = (id: number, field: EducationField, value: string) => {
    markDirty();
    setEducation((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  };

  const addEducation = () => {
    markDirty();
    setEducation((current) => {
      const nextId = current.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
      return [...current, emptyEducation(nextId)];
    });
  };

  const removeEducation = (id: number) => {
    markDirty();
    setEducation((current) => current.filter((entry) => entry.id !== id));
  };

  const setProjectField = (id: number, field: ProjectField, value: string) => {
    markDirty();
    setProjects((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  };

  // Each description point is its own field, matching the builder's projects form.
  const setProjectPoint = (id: number, index: number, value: string) => {
    markDirty();
    setProjects((current) =>
      current.map((entry) => {
        if (entry.id !== id) return entry;
        const description = [...(entry.description ?? [])];
        description[index] = value;
        return { ...entry, description };
      })
    );
  };

  const addProjectPoint = (id: number) => {
    markDirty();
    setProjects((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              description: [...(entry.description ?? []), ''],
              descriptionStyles: [...(entry.descriptionStyles ?? []), 'bullet'],
            }
          : entry
      )
    );
  };

  const removeProjectPoint = (id: number, index: number) => {
    markDirty();
    setProjects((current) =>
      current.map((entry) => {
        if (entry.id !== id) return entry;
        const description = [...(entry.description ?? [])];
        description.splice(index, 1);
        const descriptionStyles = alignDescriptionStyles(
          entry.description,
          entry.descriptionStyles
        );
        descriptionStyles.splice(index, 1);
        return { ...entry, description, descriptionStyles };
      })
    );
  };

  const toggleProjectPointStyle = (id: number, index: number) => {
    markDirty();
    setProjects((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              descriptionStyles: toggleDescriptionStyle(
                entry.description,
                entry.descriptionStyles,
                index
              ),
            }
          : entry
      )
    );
  };

  const addProject = () => {
    markDirty();
    setProjects((current) => {
      const nextId = current.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
      return [...current, emptyProject(nextId)];
    });
  };

  const removeProject = (id: number) => {
    markDirty();
    setProjects((current) => current.filter((entry) => entry.id !== id));
  };

  const handleSave = () => {
    if (hasResumeDefaultsErrors(errors)) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    const defaults: ResumeDefaults = { contact, education, projects };
    const ok = writeResumeDefaults(defaults);
    setSaving(false);
    setSaved(ok);
    if (!ok) setShowErrors(false);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 border-b border-panel-hover pb-2">
        <IdentificationCard className="w-4 h-4" />
        <h2 className="font-serif text-xl font-bold text-ink text-balance">
          {t('settings.defaults.title')}
        </h2>
      </div>

      <p className="text-sm text-ink-soft">{t('settings.defaults.description')}</p>

      <div className="space-y-4 border border-ink bg-white p-4 shadow-sw-nested">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-steel">
          {t('settings.defaults.contactHeading')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="defaults-name">{t('settings.defaults.fields.name')}</Label>
            <Input
              id="defaults-name"
              value={contact.name ?? ''}
              onChange={(e) => setContactField('name', e.target.value)}
              aria-invalid={showErrors && errors.nameRequired}
              aria-describedby={
                showErrors && errors.nameRequired ? 'defaults-name-error' : undefined
              }
            />
            {showErrors && errors.nameRequired && (
              <p
                id="defaults-name-error"
                role="alert"
                className="font-mono text-xs text-destructive"
              >
                {t('settings.defaults.errors.nameRequired')}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaults-email">{t('settings.defaults.fields.email')}</Label>
            <Input
              id="defaults-email"
              type="email"
              value={contact.email ?? ''}
              onChange={(e) => setContactField('email', e.target.value)}
              aria-invalid={showErrors && errors.emailInvalid}
              aria-describedby={
                showErrors && errors.emailInvalid ? 'defaults-email-error' : undefined
              }
            />
            {showErrors && errors.emailInvalid && (
              <p
                id="defaults-email-error"
                role="alert"
                className="font-mono text-xs text-destructive"
              >
                {t('settings.defaults.errors.emailInvalid')}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaults-phone">{t('settings.defaults.fields.phone')}</Label>
            <Input
              id="defaults-phone"
              value={contact.phone ?? ''}
              onChange={(e) => setContactField('phone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaults-location">{t('settings.defaults.fields.location')}</Label>
            <Input
              id="defaults-location"
              value={contact.location ?? ''}
              onChange={(e) => setContactField('location', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaults-linkedin">{t('settings.defaults.fields.linkedin')}</Label>
            <Input
              id="defaults-linkedin"
              value={contact.linkedin ?? ''}
              onChange={(e) => setContactField('linkedin', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaults-portfolio">{t('settings.defaults.fields.portfolio')}</Label>
            <Input
              id="defaults-portfolio"
              value={contact.github ?? ''}
              onChange={(e) => setContactField('github', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 border border-ink bg-white p-4 shadow-sw-nested">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-steel">
          {t('settings.defaults.educationHeading')}
        </h3>

        {education.length === 0 ? (
          <p className="font-mono text-xs text-steel">{t('settings.defaults.education.empty')}</p>
        ) : (
          <ul className="space-y-4">
            {education.map((entry) => (
              <li key={entry.id} className="space-y-4 border border-ink p-4 shadow-sw-nested">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`defaults-edu-institution-${entry.id}`}>
                      {t('settings.defaults.education.institution')}
                    </Label>
                    <Input
                      id={`defaults-edu-institution-${entry.id}`}
                      value={entry.institution ?? ''}
                      onChange={(e) => setEducationField(entry.id, 'institution', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`defaults-edu-degree-${entry.id}`}>
                      {t('settings.defaults.education.degree')}
                    </Label>
                    <Input
                      id={`defaults-edu-degree-${entry.id}`}
                      value={entry.degree ?? ''}
                      onChange={(e) => setEducationField(entry.id, 'degree', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`defaults-edu-years-${entry.id}`}>
                      {t('settings.defaults.education.years')}
                    </Label>
                    <Input
                      id={`defaults-edu-years-${entry.id}`}
                      value={entry.years ?? ''}
                      onChange={(e) => setEducationField(entry.id, 'years', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`defaults-edu-grade-${entry.id}`}>
                      {t('settings.defaults.education.grade')}
                    </Label>
                    <Input
                      id={`defaults-edu-grade-${entry.id}`}
                      value={entry.grade ?? ''}
                      onChange={(e) => setEducationField(entry.id, 'grade', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`defaults-edu-details-${entry.id}`}>
                    {t('settings.defaults.education.details')}
                  </Label>
                  <Textarea
                    id={`defaults-edu-details-${entry.id}`}
                    rows={2}
                    value={entry.description ?? ''}
                    onChange={(e) => setEducationField(entry.id, 'description', e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeEducation(entry.id)}
                >
                  <Trash aria-hidden="true" />
                  {t('settings.defaults.education.remove')}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Button type="button" variant="outline" size="sm" onClick={addEducation}>
          <Plus aria-hidden="true" />
          {t('settings.defaults.education.add')}
        </Button>
      </div>

      <div className="space-y-4 border border-ink bg-white p-4 shadow-sw-nested">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-steel">
          {t('settings.defaults.projectsHeading')}
        </h3>

        {projects.length === 0 ? (
          <p className="font-mono text-xs text-steel">{t('settings.defaults.projects.empty')}</p>
        ) : (
          <ul className="space-y-4">
            {projects.map((entry) => (
              <li key={entry.id} className="space-y-4 border border-ink p-4 shadow-sw-nested">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`defaults-proj-name-${entry.id}`}>
                      {t('settings.defaults.projects.name')}
                    </Label>
                    <Input
                      id={`defaults-proj-name-${entry.id}`}
                      value={entry.name ?? ''}
                      onChange={(e) => setProjectField(entry.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`defaults-proj-role-${entry.id}`}>
                      {t('settings.defaults.projects.role')}
                    </Label>
                    <Input
                      id={`defaults-proj-role-${entry.id}`}
                      value={entry.role ?? ''}
                      onChange={(e) => setProjectField(entry.id, 'role', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`defaults-proj-years-${entry.id}`}>
                      {t('settings.defaults.projects.years')}
                    </Label>
                    <Input
                      id={`defaults-proj-years-${entry.id}`}
                      value={entry.years ?? ''}
                      onChange={(e) => setProjectField(entry.id, 'years', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`defaults-proj-github-${entry.id}`}>
                      {t('settings.defaults.projects.github')}
                    </Label>
                    <Input
                      id={`defaults-proj-github-${entry.id}`}
                      value={entry.github ?? ''}
                      onChange={(e) => setProjectField(entry.id, 'github', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`defaults-proj-website-${entry.id}`}>
                      {t('settings.defaults.projects.website')}
                    </Label>
                    <Input
                      id={`defaults-proj-website-${entry.id}`}
                      value={entry.website ?? ''}
                      onChange={(e) => setProjectField(entry.id, 'website', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={labelClass}>
                      {t('builder.genericItemForm.fields.descriptionPoints')}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addProjectPoint(entry.id)}
                    >
                      <Plus aria-hidden="true" />
                      {t('builder.genericItemForm.actions.addPoint')}
                    </Button>
                  </div>
                  {entry.description?.length ? (
                    <ul className="space-y-2">
                      {entry.description.map((point, index) => {
                        const style =
                          entry.descriptionStyles?.[index] === 'plain' ? 'plain' : 'bullet';
                        return (
                          <li key={index} className="flex gap-2">
                            <Input
                              value={point}
                              onChange={(e) => setProjectPoint(entry.id, index, e.target.value)}
                              placeholder={t('builder.forms.projects.placeholders.description')}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => toggleProjectPointStyle(entry.id, index)}
                              aria-label={t('builder.genericItemForm.actions.togglePointStyle')}
                              title={t('builder.genericItemForm.actions.togglePointStyle')}
                            >
                              {style === 'plain' ? (
                                <TextAlignLeft aria-hidden="true" />
                              ) : (
                                <ListBullets aria-hidden="true" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeProjectPoint(entry.id, index)}
                              aria-label={t('a11y.removeDescription')}
                              title={t('a11y.removeDescription')}
                            >
                              <Trash aria-hidden="true" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeProject(entry.id)}
                >
                  <Trash aria-hidden="true" />
                  {t('settings.defaults.projects.remove')}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Button type="button" variant="outline" size="sm" onClick={addProject}>
          <Plus aria-hidden="true" />
          {t('settings.defaults.projects.add')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <SpinnerGap aria-hidden="true" className="animate-spin" />
              {t('common.saving')}
            </>
          ) : (
            t('settings.defaults.save')
          )}
        </Button>
        {saved && (
          <StatusIndicator tone="ready" live={false}>
            {t('settings.defaults.saved')}
          </StatusIndicator>
        )}
      </div>
    </section>
  );
}
