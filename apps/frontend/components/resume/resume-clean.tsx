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
import styles from './styles/clean.module.css';

interface ResumeCleanProps {
  earlierExperienceLabel?: string;
  data: ResumeData;
  showContactIcons?: boolean;
  personalInfoSettings?: PersonalInfoSettings;
  additionalSectionLabels?: Partial<AdditionalSectionLabels>;
}

/**
 * Clean Resume Template
 *
 * Minimal modern sans layout: centered light-weight name, a single pipe-separated
 * contact line, large understated gray UPPERCASE section headers with a thin rule,
 * and single-line entries (COMPANY | Role on the left, Location | Dates on the right).
 *
 * Single-typeface design: all text inherits `--body-font` (sans by default), so the
 * Body Font control drives the whole template. ATS-safe (all text is real DOM nodes).
 *
 * Section order: Determined by sectionMeta ordering.
 */
export const ResumeClean: React.FC<ResumeCleanProps> = ({
  data,
  showContactIcons = false,
  personalInfoSettings = DEFAULT_TEMPLATE_SETTINGS.personalInfo,
  additionalSectionLabels,
  earlierExperienceLabel,
}) => {
  const { personalInfo, summary, workExperience, education, personalProjects, additional } = data;

  const sortedSections = getSortedSections(data);

  // Single-line entry header: COMPANY | Role (left), Location | Dates (right).
  const renderEntryHeader = (
    primary?: string,
    role?: string,
    location?: string,
    dates?: string
  ) => {
    const meta = [location, dates ? formatDateRange(dates) : undefined].filter(Boolean).join(' | ');
    return (
      <div
        className={`flex justify-between items-baseline gap-3 ${baseStyles['resume-row-tight']}`}
      >
        <span className="min-w-0">
          <span className={styles.entryCompany}>{primary}</span>
          {role && (
            <>
              <span className={styles.sep}>|</span>
              <span className={styles.entryRole}>{role}</span>
            </>
          )}
        </span>
        {meta && <span className={styles.entryMeta}>{meta}</span>}
      </div>
    );
  };

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
                  {renderEntryHeader(exp.company, exp.title, exp.location, exp.years)}
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
                    className={`flex justify-between items-baseline gap-3 ${baseStyles['resume-row-tight']}`}
                  >
                    <span className="flex items-baseline gap-2 min-w-0">
                      <span className={styles.entryCompany}>{project.name}</span>
                      {project.role && (
                        <>
                          <span className={styles.sep}>|</span>
                          <span className={styles.entryRole}>{project.role}</span>
                        </>
                      )}
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
                    </span>
                    {project.years && (
                      <span className={styles.entryMeta}>{formatDateRange(project.years)}</span>
                    )}
                  </div>
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
            <h3 {...RESUME_SECTION_TITLE} className={styles.sectionTitle}>
              {section.displayName}
            </h3>
            <div className={baseStyles['resume-items']}>
              {education.map((edu) => (
                <div key={edu.id} {...resumeItem()} className={baseStyles['resume-item']}>
                  {renderEntryHeader(edu.institution, edu.degree, undefined, edu.years)}
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
            <DynamicResumeSectionClean
              key={section.id}
              sectionMeta={section}
              resumeData={data}
              renderBullets={renderBullets}
              renderEntryHeader={renderEntryHeader}
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
          separator=" | "
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
 * Bold inline label followed by comma-joined items, one line per category.
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
            {showSubLabels && <span className={styles.skillLabel}>{labelsByKey[group.key]}</span>}{' '}
            {group.items.join(', ')}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Dynamic (custom) section wrapper for the Clean template.
 */
const DynamicResumeSectionClean: React.FC<{
  sectionMeta: SectionMeta;
  resumeData: ResumeData;
  renderBullets: (items?: string[], pointStyles?: ('bullet' | 'plain')[]) => React.ReactNode;
  renderEntryHeader: (
    primary?: string,
    role?: string,
    location?: string,
    dates?: string
  ) => React.ReactNode;
}> = ({ sectionMeta, resumeData, renderBullets, renderEntryHeader }) => {
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
              {renderEntryHeader(item.title, item.subtitle, item.location, item.years)}
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

export default ResumeClean;
