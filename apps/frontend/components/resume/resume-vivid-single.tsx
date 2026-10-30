import React from 'react';
import type {
  ResumeData,
  SectionMeta,
  ResumeSectionHeadings,
  ResumeFallbackLabels,
} from '@/components/dashboard/resume-component';
import { getSortedSections } from '@/lib/utils/section-helpers';
import { formatDateRange } from '@/lib/utils';
import {
  DEFAULT_TEMPLATE_SETTINGS,
  type PersonalInfoSettings,
} from '@/lib/types/template-settings';
import { EarlierExperience, splitCondensed } from './earlier-experience';
import { RESUME_SECTION, RESUME_SECTION_TITLE, resumeItem } from './page-break-attrs';
import { useAdditionalGroups } from './use-additional-groups';
import baseStyles from './styles/_base.module.css';
import styles from './styles/vivid.module.css';
import {
  DynamicResumeSectionVivid,
  VividExperienceItem,
  VividHeader,
  VividProjectItem,
  getVividHeadings,
  renderArrowBullets,
  renderContactDetail,
} from './resume-vivid';

interface ResumeVividSingleProps {
  earlierExperienceLabel?: string;
  data: ResumeData;
  showContactIcons?: boolean;
  personalInfoSettings?: PersonalInfoSettings;
  sectionHeadings?: Partial<ResumeSectionHeadings>;
  fallbackLabels?: Partial<ResumeFallbackLabels>;
}

/**
 * Vivid Single Column Resume Template
 *
 * One-column version of Vivid (see resume-vivid.tsx): the same two-tone accent name,
 * monospace title + contact row, accent section headers and arrow (➜) bullets, but every
 * section flows top to bottom in sectionMeta order, so ATS parsers read it in order.
 *
 * What Vivid keeps in its sidebar moves into the flow as compact sections: Skills,
 * Languages, Training & Certifications and Awards at the `additional` position (in the order
 * the ATS round trip expects), Education as an entry, and Links as one line at the end.
 *
 * Two print-text fixes, see vivid.module.css: small caps become real capitals (`*Caps`) and the
 * lighter surname is a solid tint (`nameRestSolid`), so the PDF text layer reads all of it.
 */
export const ResumeVividSingle: React.FC<ResumeVividSingleProps> = ({
  data,
  showContactIcons = false,
  personalInfoSettings = DEFAULT_TEMPLATE_SETTINGS.personalInfo,
  sectionHeadings,
  fallbackLabels,
  earlierExperienceLabel,
}) => {
  const { personalInfo, summary, workExperience, education, personalProjects, additional } = data;

  // Visibility-aware groups; empty array for a group means hidden or no content.
  const { groups: additionalGroups } = useAdditionalGroups(additional, additional?.visibility);
  const additionalGroupMap = Object.fromEntries(additionalGroups.map((g) => [g.key, g.items]));
  const technicalSkills = additionalGroupMap.technicalSkills ?? [];
  const languages = additionalGroupMap.languages ?? [];
  const certificationsTraining = additionalGroupMap.certificationsTraining ?? [];
  const awards = additionalGroupMap.awards ?? [];

  const headings = getVividHeadings(sectionHeadings);
  const sortedSections = getSortedSections(data);

  const titleClass = styles.sectionTitleCaps;
  const roleClass = styles.entryRoleCaps;

  const links = personalInfo
    ? [
        renderContactDetail(
          showContactIcons,
          'LinkedIn',
          personalInfo.linkedin,
          '',
          personalInfoSettings.fields
        ),
        renderContactDetail(
          showContactIcons,
          'GitHub',
          personalInfo.github,
          '',
          personalInfoSettings.fields
        ),
        renderContactDetail(
          showContactIcons,
          'Website',
          personalInfo.website,
          '',
          personalInfoSettings.fields
        ),
      ].filter(Boolean)
    : [];

  const renderSection = (section: SectionMeta) => {
    switch (section.key) {
      case 'personalInfo':
        return null;

      case 'summary':
        if (!summary) return null;
        return (
          <div key={section.id} {...RESUME_SECTION} className={baseStyles['resume-section']}>
            <h3 {...RESUME_SECTION_TITLE} className={titleClass}>
              {section.displayName || headings.summary}
            </h3>
            <p className={`text-justify ${baseStyles['resume-text']}`}>{summary}</p>
          </div>
        );

      case 'workExperience':
        if (!workExperience || workExperience.length === 0) return null;
        return (
          <div key={section.id} {...RESUME_SECTION} className={baseStyles['resume-section']}>
            <h3 {...RESUME_SECTION_TITLE} className={titleClass}>
              {section.displayName || headings.experience}
            </h3>
            <div className={baseStyles['resume-items']}>
              {splitCondensed(workExperience).full.map((exp) => (
                <VividExperienceItem key={exp.id} exp={exp} roleClassName={roleClass} />
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
            <h3 {...RESUME_SECTION_TITLE} className={titleClass}>
              {section.displayName || headings.education}
            </h3>
            <div className={baseStyles['resume-items']}>
              {education.map((edu) => (
                <div key={edu.id} {...resumeItem()} className={baseStyles['resume-item']}>
                  <div className={baseStyles['resume-row-tight']}>
                    <span className={styles.entryCompany}>{edu.institution}</span>
                    {edu.degree && (
                      <>
                        <span className={styles.entrySep}>|</span>
                        <span className={roleClass}>{edu.degree}</span>
                      </>
                    )}
                  </div>
                  {(edu.years || edu.grade) && (
                    <div
                      className={`${baseStyles['resume-row-tight']} ${styles.entryMeta} flex justify-between items-baseline`}
                    >
                      <span>{formatDateRange(edu.years)}</span>
                      {edu.grade && <span>{edu.grade}</span>}
                    </div>
                  )}
                  {edu.description && (
                    <p className={baseStyles['resume-text-xs']}>{edu.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'personalProjects':
        if (!personalProjects || personalProjects.length === 0) return null;
        return (
          <div key={section.id} {...RESUME_SECTION} className={baseStyles['resume-section']}>
            <h3 {...RESUME_SECTION_TITLE} className={titleClass}>
              {section.displayName || headings.projects}
            </h3>
            <div className={baseStyles['resume-items']}>
              {personalProjects.map((project) => (
                <VividProjectItem key={project.id} project={project} roleClassName={roleClass} />
              ))}
            </div>
          </div>
        );

      case 'additional':
        // Same order as the ATS round trip reads: skills, languages, certifications, awards.
        return (
          <React.Fragment key={section.id}>
            {technicalSkills.length > 0 && (
              <div {...RESUME_SECTION} className={baseStyles['resume-section']}>
                <h3 {...RESUME_SECTION_TITLE} className={titleClass}>
                  {headings.skills}
                </h3>
                <p className={baseStyles['resume-text-xs']}>{technicalSkills.join(' • ')}</p>
              </div>
            )}
            {languages.length > 0 && (
              <div {...RESUME_SECTION} className={baseStyles['resume-section']}>
                <h3 {...RESUME_SECTION_TITLE} className={titleClass}>
                  {headings.languages}
                </h3>
                <p className={baseStyles['resume-text-xs']}>{languages.join(' • ')}</p>
              </div>
            )}
            {certificationsTraining.length > 0 && (
              <div {...RESUME_SECTION} className={baseStyles['resume-section']}>
                <h3 {...RESUME_SECTION_TITLE} className={titleClass}>
                  {headings.certifications}
                </h3>
                {renderArrowBullets(certificationsTraining)}
              </div>
            )}
            {awards.length > 0 && (
              <div {...RESUME_SECTION} className={baseStyles['resume-section']}>
                <h3 {...RESUME_SECTION_TITLE} className={titleClass}>
                  {headings.awards}
                </h3>
                {renderArrowBullets(awards)}
              </div>
            )}
          </React.Fragment>
        );

      default:
        if (section.isDefault) return null;
        return (
          <DynamicResumeSectionVivid
            key={section.id}
            sectionMeta={section}
            resumeData={data}
            titleClassName={titleClass}
            roleClassName={roleClass}
          />
        );
    }
  };

  return (
    <>
      <VividHeader
        personalInfo={personalInfo}
        showContactIcons={showContactIcons}
        nameFallback={fallbackLabels?.name}
        nameRestClassName={styles.nameRestSolid}
        fields={personalInfoSettings.fields}
      />

      {sortedSections.map((section) => renderSection(section))}

      {links.length > 0 && (
        <div {...RESUME_SECTION} className={baseStyles['resume-section']}>
          <h3 {...RESUME_SECTION_TITLE} className={titleClass}>
            {headings.links}
          </h3>
          <div
            className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${baseStyles['resume-meta-sm']}`}
          >
            {links.map((link, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span className={styles.entrySep}>•</span>}
                {link}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ResumeVividSingle;
