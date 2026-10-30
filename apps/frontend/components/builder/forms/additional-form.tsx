'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import type { AdditionalInfo, AdditionalVisibility } from '@/components/dashboard/resume-component';
import { useTranslations } from '@/lib/i18n';

interface AdditionalFormProps {
  data: AdditionalInfo;
  onChange: (data: AdditionalInfo) => void;
}

const OPTIONAL_GROUPS = ['languages', 'certificationsTraining', 'awards'] as const;
type OptionalGroup = (typeof OPTIONAL_GROUPS)[number];

function isGroupVisible(
  key: OptionalGroup,
  visibility: AdditionalVisibility | null | undefined
): boolean {
  // Persisted resumes may carry an explicit null, not just undefined.
  if (visibility === null || visibility === undefined) return false;
  return visibility[key] ?? false;
}

function setGroupVisible(
  key: OptionalGroup,
  value: boolean,
  visibility: AdditionalVisibility | null | undefined
): AdditionalVisibility {
  return { ...visibility, [key]: value };
}

export const AdditionalForm: React.FC<AdditionalFormProps> = ({ data, onChange }) => {
  const { t } = useTranslations();

  const handleSkillsChange = (value: string) => {
    // Split by newlines only. Blank/whitespace lines are preserved while editing
    // so pressing Enter creates a new line (issue #763); consumers filter empty
    // entries at render time, and the backend drops them on save.
    onChange({ ...data, technicalSkills: value.split('\n') });
  };

  const handleGroupChange = (key: OptionalGroup, value: string) => {
    onChange({ ...data, [key]: value.split('\n') });
  };

  const handleToggle = (key: OptionalGroup, checked: boolean) => {
    onChange({
      ...data,
      visibility: setGroupVisible(key, checked, data.visibility),
    });
  };

  // Explicitly allow Enter key to create newlines (prevent form submission interference)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
    }
  };

  const groupConfig: Record<
    OptionalGroup,
    { labelKey: string; placeholderKey: string; ariaKey: string }
  > = {
    languages: {
      labelKey: 'resume.additional.languages',
      placeholderKey: 'builder.additionalForm.placeholders.languages',
      ariaKey: 'resume.additional.languages',
    },
    certificationsTraining: {
      labelKey: 'resume.additional.certifications',
      placeholderKey: 'builder.additionalForm.placeholders.certifications',
      ariaKey: 'resume.additional.certifications',
    },
    awards: {
      labelKey: 'resume.additional.awards',
      placeholderKey: 'builder.additionalForm.placeholders.awards',
      ariaKey: 'resume.additional.awards',
    },
  };

  return (
    <div className="space-y-4">
      <p className="font-mono text-xs uppercase tracking-wider text-ink">
        {t('builder.additionalForm.instructions')}
      </p>
      <Textarea
        id="technicalSkills"
        aria-label={t('resume.additional.technicalSkills')}
        value={data.technicalSkills?.join('\n') ?? ''}
        onChange={(e) => handleSkillsChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('builder.additionalForm.placeholders.technicalSkills')}
        className="min-h-[120px]"
      />
      {OPTIONAL_GROUPS.map((key) => {
        const config = groupConfig[key];
        const visible = isGroupVisible(key, data.visibility);
        return (
          <div key={key} className="space-y-2">
            <ToggleSwitch
              checked={visible}
              onCheckedChange={(checked) => handleToggle(key, checked)}
              label={t(config.labelKey)}
              description={t('builder.additionalForm.toggleDescription')}
              variant="inline"
            />
            {visible && (
              <Textarea
                id={key}
                aria-label={t(config.ariaKey)}
                value={(data[key] as string[] | undefined)?.join('\n') ?? ''}
                onChange={(e) => handleGroupChange(key, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t(config.placeholderKey)}
                className="min-h-[80px]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
