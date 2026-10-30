/**
 * Modern Deedy resume template.
 *
 * Layout inspired by "Modern-Deedy" by Abdullah Arif (Apache-2.0), a one-page,
 * single-column fork of Deedy styled like Jake's resume. This is an independent HTML/CSS
 * recreation of that look; none of the original LaTeX source is used.
 */
import React from 'react';
import { ExternalLink } from 'lucide-react';
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
import styles from './styles/modern-deedy.module.css';

interface ResumeModernDeedyProps {
  earlierExperienceLabel?: string;
  data: ResumeData;
  showContactIcons?: boolean;
  personalInfoSettings?: PersonalInfoSettings;
  additionalSectionLabels?: Partial<AdditionalSectionLabels>;
}

type PointStyles = ('bullet' | 'plain')[];

const stripScheme = (url: string) =>
  url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');

const toHref = (url: string) => (/^(https?:)?\/\//.test(url) ? url : `https://${url}`);

/** Meta text on the right of an entry header: "City, ST | Mon YYYY - Mon YYYY". */
const joinMeta = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' | ');

/**
 * Modern Deedy
 *
 * Dense one-page, single-column layout set in Lato: a centred regular-weight name over a
 * single " | " separated contact line, light grey uppercase section headings with no
 * rule, and compact one-line entry headers (bold caps name, small uppercase role, right-aligned
 * place and dates). Everything is real DOM text, so the PDF text layer reads in order.
 *
 * Section order: Determined by sectionMeta ordering.
 */
export const ResumeModernDeedy: React.FC<ResumeModernDeedyProps> = ({
  data,
  showContactIcons = false,
  personalInfoSettings = DEFAULT_TEMPLATE_SETTINGS.personalInfo,
  additionalSectionLabels,
  earlierExperienceLabel,
}) => {
  const { personalInfo, summary, workExperience, education, personalProjects, additional } = data;

  const sortedSections = getSortedSections(data);

  const renderBullets = (items?: string[], pointStyles?: PointStyles) => (
    <DescriptionList
      items={items}
      styles={pointStyles}
      textClassName={styles.bullets}
      markerClassName={styles.marker}
    />
  );

  /** COMPANY | Role on the left; "Place | Dates" on the right. */
  const renderEntryHeader = (
    primary?: string,
    secondary?: string,
    location?: string,
    dates?: string
  ) => {
    const meta = joinMeta(location, dates ? formatDateRange(dates) : undefined);
    return (
      <div className={styles.entryRow}>
        <span className={styles.entryLead}>
          <span className={styles.entryName}>{primary}</span>
          {primary && secondary && <span className={styles.pipe}> | </span>}
          {secondary && <span className={styles.smallCaps}>{secondary}</span>}
        </span>
        {meta && <span className={styles.entryMeta}>{meta}</span>}
      </div>
    );
  };

  const renderProjectLink = (url: string) => (
    <a
      href={toHref(url)}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.linkIcon}
      aria-label={stripScheme(url)}
    >
      <ExternalLink size={11} aria-hidden="true" />
    </a>
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
            <p className={styles.bodyText}>{summary}</p>
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
                  <div className={styles.entryRow}>
                    <span className={styles.entryLead}>
                      <span className={styles.degree}>{edu.degree}</span>
                    </span>
                    {edu.years && (
                      <span className={styles.entryMeta}>{formatDateRange(edu.years)}</span>
                    )}
                  </div>
                  {edu.institution && <div className={styles.smallCaps}>{edu.institution}</div>}
                  {edu.grade && <div className={`${styles.entryMeta} text-right`}>{edu.grade}</div>}
                  {edu.description && <div className={styles.bodyText}>{edu.description}</div>}
                </div>
              ))}
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
                  <div className={styles.entryRow}>
                    <span className={styles.entryLead}>
                      <span className={styles.entryName}>{project.name}</span>
                      {project.website && renderProjectLink(project.website)}
                      {project.github && renderProjectLink(project.github)}
                    </span>
                    {(project.role || project.years) && (
                      <span className={styles.entryMeta}>
                        {project.role && <span className={styles.smallCaps}>{project.role}</span>}
                        {project.role && project.years && <span> | </span>}
                        {project.years && formatDateRange(project.years)}
                      </span>
                    )}
                  </div>
                  {renderBullets(project.description, project.descriptionStyles)}
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
            <DynamicResumeSectionModernDeedy
              key={section.id}
              sectionMeta={section}
              resumeData={data}
              renderEntryHeader={renderEntryHeader}
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
 * One "Label: a, b, c" line per category with a bold label. The comma separators are real
 * text so an ATS reads "Python, Java, Go".
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
      <div className={styles.skills}>
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
 * Dynamic (custom) section wrapper for the Modern Deedy template.
 */
const DynamicResumeSectionModernDeedy: React.FC<{
  sectionMeta: SectionMeta;
  resumeData: ResumeData;
  renderEntryHeader: (
    primary?: string,
    secondary?: string,
    location?: string,
    dates?: string
  ) => React.ReactNode;
  renderBullets: (items?: string[], pointStyles?: PointStyles) => React.ReactNode;
}> = ({ sectionMeta, resumeData, renderEntryHeader, renderBullets }) => {
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
        <p className={styles.bodyText}>{customSection.text}</p>
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
        <div className={styles.skills}>{customSection.strings.join(', ')}</div>
      ) : null}
    </div>
  );
};

export default ResumeModernDeedy;
