import React from 'react';
import { Github, ExternalLink } from 'lucide-react';
import type {
  ResumeData,
  SectionMeta,
  AdditionalSectionLabels,
} from '@/components/dashboard/resume-component';
import {
  DEFAULT_TEMPLATE_SETTINGS,
  type PersonalInfoSettings,
} from '@/lib/types/template-settings';
import { PersonalInfoHeader } from './personal-info-header';
import { getSortedSections } from '@/lib/utils/section-helpers';
import { formatDateRange } from '@/lib/utils';
import { DescriptionList } from './description-list';
import { TagList } from './tag-list';
import { EarlierExperience, splitCondensed } from './earlier-experience';
import { RESUME_SECTION, RESUME_SECTION_TITLE, resumeItem } from './page-break-attrs';
import { useAdditionalGroups } from './use-additional-groups';
import baseStyles from './styles/_base.module.css';
import styles from './styles/modern.module.css';

interface ResumeModernProps {
  earlierExperienceLabel?: string;
  data: ResumeData;
  showContactIcons?: boolean;
  personalInfoSettings?: PersonalInfoSettings;
  additionalSectionLabels?: Partial<AdditionalSectionLabels>;
}

/**
 * Modern Resume Template
 *
 * Single-column layout with user-selectable accent colors.
 * Features colored section headers with underline and decorative name underline.
 * ATS-compatible: all visual elements are real DOM text nodes.
 *
 * Section order: Determined by sectionMeta ordering
 */
export const ResumeModern: React.FC<ResumeModernProps> = ({
  data,
  showContactIcons = false,
  personalInfoSettings = DEFAULT_TEMPLATE_SETTINGS.personalInfo,
  additionalSectionLabels,
  earlierExperienceLabel,
}) => {
  const { personalInfo, summary, workExperience, education, personalProjects, additional } = data;

  // Get sorted visible sections
  const sortedSections = getSortedSections(data);

  // Render a section based on its key
  const renderSection = (section: SectionMeta) => {
    switch (section.key) {
      case 'personalInfo':
        // Personal info is the header - handled separately
        return null;

      case 'summary':
        if (!summary) return null;
        return (
          <div key={section.id} {...RESUME_SECTION} className={baseStyles['resume-section']}>
            <h3 {...RESUME_SECTION_TITLE} className={styles['section-title-accent']}>
              {section.displayName}
            </h3>
            <p className={`text-justify ${baseStyles['resume-text']}`}>{summary}</p>
          </div>
        );

      case 'workExperience':
        if (!workExperience || workExperience.length === 0) return null;
        return (
          <div key={section.id} {...RESUME_SECTION} className={baseStyles['resume-section']}>
            <h3 {...RESUME_SECTION_TITLE} className={styles['section-title-accent']}>
              {section.displayName}
            </h3>
            <div className={baseStyles['resume-items']}>
              {splitCondensed(workExperience).full.map((exp) => (
                <div
                  key={exp.id}
                  {...resumeItem(exp.description)}
                  className={baseStyles['resume-item']}
                >
                  <div
                    className={`flex justify-between items-baseline ${baseStyles['resume-row-tight']}`}
                  >
                    <h4 className={baseStyles['resume-item-title']}>{exp.title}</h4>
                    <span className={`${baseStyles['resume-date']} ml-4`}>
                      {formatDateRange(exp.years)}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between items-center ${baseStyles['resume-row']} ${baseStyles['resume-item-subtitle']}`}
                  >
                    <span>{exp.company}</span>
                    {exp.location && <span>{exp.location}</span>}
                  </div>
                  <DescriptionList items={exp.description} styles={exp.descriptionStyles} />
                </div>
              ))}
              {splitCondensed(workExperience).condensed.length > 0 && (
                <EarlierExperience
                  items={splitCondensed(workExperience).condensed}
                  label={earlierExperienceLabel}
                />
              )}
            </div>
          </div>
        );

      case 'personalProjects':
        if (!personalProjects || personalProjects.length === 0) return null;
        return (
          <div key={section.id} {...RESUME_SECTION} className={baseStyles['resume-section']}>
            <h3 {...RESUME_SECTION_TITLE} className={styles['section-title-accent']}>
              {section.displayName}
            </h3>
            <div className={baseStyles['resume-items']}>
              {personalProjects.map((project) => (
                <div
                  key={project.id}
                  {...resumeItem(project.description)}
                  className={baseStyles['resume-item']}
                >
                  <div
                    className={`flex justify-between items-baseline ${baseStyles['resume-row-tight']}`}
                  >
                    <div className="flex items-baseline gap-2">
                      <h4 className={baseStyles['resume-item-title']}>{project.name}</h4>
                      {(project.github || project.website) && (
                        <span className="flex gap-1.5">
                          {project.github && (
                            <a
                              href={
                                project.github.startsWith('http')
                                  ? project.github
                                  : `https://${project.github}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className={baseStyles['resume-link-pill']}
                            >
                              <Github size={10} />
                              {project.github
                                .replace(/^https?:\/\//, '')
                                .replace(/^www\./, '')
                                .replace(/\/$/, '')}
                            </a>
                          )}
                          {project.website && (
                            <a
                              href={
                                project.website.startsWith('http')
                                  ? project.website
                                  : `https://${project.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className={baseStyles['resume-link-pill']}
                            >
                              <ExternalLink size={10} />
                              {project.website
                                .replace(/^https?:\/\//, '')
                                .replace(/^www\./, '')
                                .replace(/\/$/, '')}
                            </a>
                          )}
                        </span>
                      )}
                    </div>
                    {project.years && (
                      <span className={`${baseStyles['resume-date']} ml-4`}>
                        {formatDateRange(project.years)}
                      </span>
                    )}
                  </div>
                  {project.role && (
                    <div
                      className={`${baseStyles['resume-row']} ${baseStyles['resume-item-subtitle']}`}
                    >
                      <span>{project.role}</span>
                    </div>
                  )}
                  <DescriptionList items={project.description} styles={project.descriptionStyles} />
                </div>
              ))}
            </div>
          </div>
        );

      case 'education':
        if (!education || education.length === 0) return null;
        return (
          <div key={section.id} {...RESUME_SECTION} className={baseStyles['resume-section']}>
            <h3 {...RESUME_SECTION_TITLE} className={styles['section-title-accent']}>
              {section.displayName}
            </h3>
            <div className={baseStyles['resume-items']}>
              {education.map((edu) => (
                <div key={edu.id} {...resumeItem()} className={baseStyles['resume-item']}>
                  <div
                    className={`flex justify-between items-baseline ${baseStyles['resume-row-tight']}`}
                  >
                    <h4 className={baseStyles['resume-item-title']}>{edu.institution}</h4>
                    <span className={`${baseStyles['resume-date']} ml-4`}>
                      {formatDateRange(edu.years)}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between ${baseStyles['resume-item-subtitle']} ${baseStyles['resume-row-tight']}`}
                  >
                    <span>{edu.degree}</span>
                    {edu.grade && (
                      <span className={`${baseStyles['resume-date']} ml-4 shrink-0`}>
                        {edu.grade}
                      </span>
                    )}
                  </div>
                  {edu.description && (
                    <p className={baseStyles['resume-text-sm']}>{edu.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'additional':
        if (!additional) return null;
        return (
          <AdditionalSection
            key={section.id}
            additional={additional}
            displayName={section.displayName}
            labels={additionalSectionLabels}
          />
        );

      default:
        // Custom section - render using DynamicResumeSection
        if (!section.isDefault) {
          return (
            <DynamicResumeSectionModern key={section.id} sectionMeta={section} resumeData={data} />
          );
        }
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Header Section - Centered Layout (always first) */}
      {personalInfo && (
        <PersonalInfoHeader
          personalInfo={personalInfo}
          settings={personalInfoSettings}
          showContactIcons={showContactIcons}
          nameClassName="tracking-tight uppercase"
          titleClassName="tracking-wide uppercase"
        />
      )}

      {/* Render sections in order based on sectionMeta */}
      {sortedSections
        .filter((section) => section.key !== 'personalInfo')
        .map((section) => renderSection(section))}
    </div>
  );
};

/**
 * Additional info section (skills, languages, certifications, awards)
 */
const AdditionalSection: React.FC<{
  additional: ResumeData['additional'];
  displayName?: string;
  labels?: Partial<AdditionalSectionLabels>;
}> = ({ additional, displayName = 'Technical Skills', labels }) => {
  const { groups, showSubLabels, hasContent } = useAdditionalGroups(
    additional,
    additional?.visibility
  );

  if (!hasContent) return null;

  const mergedLabels: AdditionalSectionLabels = {
    technicalSkills: labels?.technicalSkills ?? 'Technical Skills:',
    languages: labels?.languages ?? 'Languages:',
    certifications: labels?.certifications ?? 'Certifications:',
    awards: labels?.awards ?? 'Awards:',
  };

  const labelsByKey: Record<string, string> = {
    technicalSkills: mergedLabels.technicalSkills,
    languages: mergedLabels.languages,
    certificationsTraining: mergedLabels.certifications,
    awards: mergedLabels.awards,
  };

  return (
    <div {...RESUME_SECTION} className={baseStyles['resume-section']}>
      <h3 {...RESUME_SECTION_TITLE} className={styles['section-title-accent']}>
        {displayName}
      </h3>
      <div className={`${baseStyles['resume-stack']} ${baseStyles['resume-text-sm']}`}>
        {groups.map((group) =>
          showSubLabels ? (
            <div key={group.key} {...resumeItem()} className="flex items-baseline">
              <span className="font-bold w-32 shrink-0">{labelsByKey[group.key]}</span>
              <TagList items={group.items} />
            </div>
          ) : (
            <div key={group.key} {...resumeItem()}>
              <TagList items={group.items} />
            </div>
          )
        )}
      </div>
    </div>
  );
};

/**
 * Dynamic section wrapper for Modern template
 * Uses accent-colored section titles
 */
const DynamicResumeSectionModern: React.FC<{
  sectionMeta: SectionMeta;
  resumeData: ResumeData;
}> = ({ sectionMeta, resumeData }) => {
  // Get the custom section data
  const customSection = resumeData.customSections?.[sectionMeta.key];

  if (!customSection) return null;

  // Check if section has content
  const hasContent = (() => {
    switch (sectionMeta.sectionType) {
      case 'text':
        return Boolean(customSection.text?.trim());
      case 'itemList':
        return Boolean(customSection.items?.length);
      case 'stringList':
        return Boolean(customSection.strings?.length);
      default:
        return false;
    }
  })();

  if (!hasContent) return null;

  return (
    <div {...RESUME_SECTION} className={baseStyles['resume-section']}>
      <h3 {...RESUME_SECTION_TITLE} className={styles['section-title-accent']}>
        {sectionMeta.displayName}
      </h3>
      {renderDynamicContent(sectionMeta.sectionType, customSection)}
    </div>
  );
};

/**
 * Render dynamic section content based on type
 */
function renderDynamicContent(
  sectionType: SectionMeta['sectionType'],
  customSection: NonNullable<ResumeData['customSections']>[string]
) {
  switch (sectionType) {
    case 'text':
      if (!customSection.text?.trim()) return null;
      return <p className={`text-justify ${baseStyles['resume-text']}`}>{customSection.text}</p>;

    case 'itemList':
      if (!customSection.items?.length) return null;
      return (
        <div className={baseStyles['resume-items']}>
          {customSection.items.map((item) => (
            <div
              key={item.id}
              {...resumeItem(item.description)}
              className={baseStyles['resume-item']}
            >
              <div
                className={`flex justify-between items-baseline ${baseStyles['resume-row-tight']}`}
              >
                <h4 className={baseStyles['resume-item-title']}>{item.title}</h4>
                {item.years && (
                  <span className={`${baseStyles['resume-meta-sm']} shrink-0 ml-4`}>
                    {formatDateRange(item.years)}
                  </span>
                )}
              </div>
              {(item.subtitle || item.location) && (
                <div
                  className={`flex justify-between items-center ${baseStyles['resume-row']} ${baseStyles['resume-meta']}`}
                >
                  {item.subtitle && <span>{item.subtitle}</span>}
                  {item.location && <span>{item.location}</span>}
                </div>
              )}
              <DescriptionList items={item.description} styles={item.descriptionStyles} />
            </div>
          ))}
        </div>
      );

    case 'stringList':
      if (!customSection.strings?.length) return null;
      return <div className={baseStyles['resume-text-sm']}>{customSection.strings.join(', ')}</div>;

    default:
      return null;
  }
}

export default ResumeModern;
