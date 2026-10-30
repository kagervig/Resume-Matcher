import React from 'react';
import { Github, ExternalLink } from 'lucide-react';
import {
  DEFAULT_TEMPLATE_SETTINGS,
  type PersonalInfoSettings,
} from '@/lib/types/template-settings';
import { PersonalInfoHeader } from './personal-info-header';
import type {
  ResumeData,
  SectionMeta,
  AdditionalSectionLabels,
} from '@/components/dashboard/resume-component';
import { getSortedSections } from '@/lib/utils/section-helpers';
import { formatDateRange } from '@/lib/utils';
import { DescriptionList } from './description-list';
import { EarlierExperience, splitCondensed } from './earlier-experience';
import { RESUME_SECTION, RESUME_SECTION_TITLE, resumeItem } from './page-break-attrs';
import { useAdditionalGroups } from './use-additional-groups';
import baseStyles from './styles/_base.module.css';
import styles from './styles/latex.module.css';

interface ResumeLatexProps {
  earlierExperienceLabel?: string;
  data: ResumeData;
  showContactIcons?: boolean;
  personalInfoSettings?: PersonalInfoSettings;
  additionalSectionLabels?: Partial<AdditionalSectionLabels>;
}

/**
 * LaTeX Resume Template
 *
 * Classic serif academic layout reminiscent of the popular LaTeX résumé templates:
 * centered small-caps name, Title-Case section headers with a full-width rule, and
 * company-first two-line entries (company + dates, then italic role + location).
 *
 * Single-typeface design: all text inherits `--header-font` (serif by default), so the
 * Header Font control drives the whole template. ATS-safe (all text is real DOM nodes).
 *
 * Section order: Determined by sectionMeta ordering.
 */
export const ResumeLatex: React.FC<ResumeLatexProps> = ({
  data,
  showContactIcons = false,
  personalInfoSettings = DEFAULT_TEMPLATE_SETTINGS.personalInfo,
  additionalSectionLabels,
  earlierExperienceLabel,
}) => {
  const { personalInfo, summary, workExperience, education, personalProjects, additional } = data;

  const sortedSections = getSortedSections(data);

  // Company-first entry header: bold company / bold dates, then italic role / italic location.
  const renderEntryHeader = (
    primary?: string,
    dates?: string,
    secondary?: string,
    location?: string
  ) => (
    <>
      <div className={`flex justify-between items-baseline ${baseStyles['resume-row-tight']}`}>
        <span className={styles.entryPrimary}>{primary}</span>
        {dates && <span className={`${styles.entryDates} ml-4`}>{formatDateRange(dates)}</span>}
      </div>
      {(secondary || location) && (
        <div className={`flex justify-between items-baseline ${baseStyles['resume-row']}`}>
          {secondary && <span className={styles.entrySecondary}>{secondary}</span>}
          {location && <span className={`${styles.entrySecondary} ml-4`}>{location}</span>}
        </div>
      )}
    </>
  );

  const renderBullets = (items?: string[], pointStyles?: ('bullet' | 'plain')[]) => (
    <DescriptionList items={items} styles={pointStyles} />
  );

  const renderSection = (section: SectionMeta) => {
    switch (section.key) {
      case 'personalInfo':
        return null;

      case 'summary':
        if (!summary) return null;
        return (
          <div key={section.id} {...RESUME_SECTION} className={baseStyles['resume-section']}>
            <h3 {...RESUME_SECTION_TITLE} className={styles.sectionTitle}>
              {section.displayName}
            </h3>
            <p className={`text-justify ${baseStyles['resume-text']}`}>{summary}</p>
          </div>
        );

      case 'workExperience':
        if (!workExperience || workExperience.length === 0) return null;
        return (
          <div key={section.id} {...RESUME_SECTION} className={baseStyles['resume-section']}>
            <h3 {...RESUME_SECTION_TITLE} className={styles.sectionTitle}>
              {section.displayName}
            </h3>
            <div className={baseStyles['resume-items']}>
              {splitCondensed(workExperience).full.map((exp) => (
                <div
                  key={exp.id}
                  {...resumeItem(exp.description)}
                  className={baseStyles['resume-item']}
                >
                  {renderEntryHeader(exp.company, exp.years, exp.title, exp.location)}
                  {renderBullets(exp.description, exp.descriptionStyles)}
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
            <h3 {...RESUME_SECTION_TITLE} className={styles.sectionTitle}>
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
                      <span className={styles.entryPrimary}>{project.name}</span>
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
                      <span className={`${styles.entryDates} ml-4`}>
                        {formatDateRange(project.years)}
                      </span>
                    )}
                  </div>
                  {project.role && (
                    <div className={baseStyles['resume-row']}>
                      <span className={styles.entrySecondary}>{project.role}</span>
                    </div>
                  )}
                  {renderBullets(project.description, project.descriptionStyles)}
                </div>
              ))}
            </div>
          </div>
        );

      case 'education':
        if (!education || education.length === 0) return null;
        return (
          <div key={section.id} {...RESUME_SECTION} className={baseStyles['resume-section']}>
            <h3 {...RESUME_SECTION_TITLE} className={styles.sectionTitle}>
              {section.displayName}
            </h3>
            <div className={baseStyles['resume-items']}>
              {education.map((edu) => (
                <div key={edu.id} {...resumeItem()} className={baseStyles['resume-item']}>
                  {renderEntryHeader(edu.institution, edu.years, edu.degree)}
                  {edu.grade && (
                    <p className={`${baseStyles['resume-date']} text-right`}>{edu.grade}</p>
                  )}
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
        if (!section.isDefault) {
          return (
            <DynamicResumeSectionLatex
              key={section.id}
              sectionMeta={section}
              resumeData={data}
              renderBullets={renderBullets}
            />
          );
        }
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {personalInfo && (
        <PersonalInfoHeader
          personalInfo={personalInfo}
          settings={personalInfoSettings}
          showContactIcons={showContactIcons}
          nameClassName={styles.name}
          titleClassName={styles.tagline}
        />
      )}

      {sortedSections
        .filter((section) => section.key !== 'personalInfo')
        .map((section) => renderSection(section))}
    </div>
  );
};

/**
 * Additional info section (skills, languages, certifications, awards).
 * Bold inline category label followed by comma-joined items, one line per category.
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
      <h3 {...RESUME_SECTION_TITLE} className={styles.sectionTitle}>
        {displayName}
      </h3>
      <div className={`${baseStyles['resume-stack']} ${baseStyles['resume-text-sm']}`}>
        {groups.map((group) => (
          <div key={group.key} {...resumeItem()}>
            {showSubLabels && <span className="font-bold">{labelsByKey[group.key]}</span>}{' '}
            {group.items.join(', ')}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Dynamic (custom) section wrapper for the LaTeX template.
 */
const DynamicResumeSectionLatex: React.FC<{
  sectionMeta: SectionMeta;
  resumeData: ResumeData;
  renderBullets: (items?: string[], pointStyles?: ('bullet' | 'plain')[]) => React.ReactNode;
}> = ({ sectionMeta, resumeData, renderBullets }) => {
  const customSection = resumeData.customSections?.[sectionMeta.key];
  if (!customSection) return null;

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
      <h3 {...RESUME_SECTION_TITLE} className={styles.sectionTitle}>
        {sectionMeta.displayName}
      </h3>
      {sectionMeta.sectionType === 'text' && customSection.text?.trim() && (
        <p className={`text-justify ${baseStyles['resume-text']}`}>{customSection.text}</p>
      )}
      {sectionMeta.sectionType === 'itemList' && customSection.items?.length ? (
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
                <span className={styles.entryPrimary}>{item.title}</span>
                {item.years && (
                  <span className={`${styles.entryDates} ml-4`}>{formatDateRange(item.years)}</span>
                )}
              </div>
              {(item.subtitle || item.location) && (
                <div className={`flex justify-between items-baseline ${baseStyles['resume-row']}`}>
                  {item.subtitle && <span className={styles.entrySecondary}>{item.subtitle}</span>}
                  {item.location && (
                    <span className={`${styles.entrySecondary} ml-4`}>{item.location}</span>
                  )}
                </div>
              )}
              {renderBullets(item.description, item.descriptionStyles)}
            </div>
          ))}
        </div>
      ) : null}
      {sectionMeta.sectionType === 'stringList' && customSection.strings?.length ? (
        <div className={baseStyles['resume-text-sm']}>{customSection.strings.join(', ')}</div>
      ) : null}
    </div>
  );
};

export default ResumeLatex;
