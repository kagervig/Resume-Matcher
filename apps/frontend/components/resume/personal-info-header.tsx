import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PersonalInfo } from '@/components/dashboard/resume-component';
import type { PersonalInfoSettings } from '@/lib/types/template-settings';
import { getVisibleContacts, type ContactEntry } from '@/lib/utils/personal-info';
import baseStyles from './styles/_base.module.css';
import styles from './styles/personal-info-header.module.css';

interface PersonalInfoHeaderProps {
  personalInfo: PersonalInfo;
  settings: PersonalInfoSettings;
  showContactIcons?: boolean;
  /** Signature name/title utility classes from the host template (e.g. `uppercase`). */
  nameClassName?: string;
  titleClassName?: string;
  /** Separator between inline contacts; templates keep their own glyph. */
  separator?: string;
}

const CONTACT_ICONS: Record<ContactEntry['field'], React.ReactNode> = {
  email: <Mail size={12} />,
  phone: <Phone size={12} />,
  location: <MapPin size={12} />,
  website: <Globe size={12} />,
  linkedin: <Linkedin size={12} />,
  github: <Github size={12} />,
};

/**
 * Shared personal-info header: owns structure (which fields, 1/2/3-column vs
 * one-line, alignment) and name emphasis (large/centered/match), while keeping
 * the `_base.module.css` classes so each template's own CSS still styles it.
 */
export const PersonalInfoHeader: React.FC<PersonalInfoHeaderProps> = ({
  personalInfo,
  settings,
  showContactIcons = false,
  nameClassName,
  titleClassName,
  separator = '·',
}) => {
  const { layout, nameStyle, fields } = settings;
  const contacts = getVisibleContacts(personalInfo, fields);
  const showTitle = fields.title && !!personalInfo.title;
  const isGrid = layout === 'two-line-2col' || layout === 'two-line-3col';
  const isThreeCol = layout === 'two-line-3col';
  const isOneLine = layout === 'one-line';
  const align =
    layout === 'two-line-left' ? 'left' : layout === 'two-line-right' ? 'right' : 'center';

  const nameEl = personalInfo.name && (
    <h1
      className={cn(
        nameStyle === 'match' ? baseStyles['resume-meta'] : baseStyles['resume-name'],
        nameClassName
      )}
    >
      {personalInfo.name}
    </h1>
  );
  const titleEl = showTitle && (
    <span className={cn(baseStyles['resume-title'], baseStyles['resume-meta'], titleClassName)}>
      {personalInfo.title}
    </span>
  );

  const renderContact = (contact: ContactEntry) => (
    <span className="inline-flex items-center gap-1">
      {showContactIcons && CONTACT_ICONS[contact.field]}
      {contact.href ? (
        <a
          href={contact.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseStyles['resume-link']} hover:underline`}
        >
          {contact.display}
        </a>
      ) : (
        <span style={{ color: 'var(--resume-text-primary)' }}>{contact.display}</span>
      )}
    </span>
  );

  // Inline contact row with "·" separators, used by the one- and two-line layouts.
  const inlineContacts = contacts.map((contact, index) => (
    <React.Fragment key={contact.field}>
      {index > 0 && <span className={styles.sep}>{separator}</span>}
      {renderContact(contact)}
    </React.Fragment>
  ));

  if (isOneLine) {
    return (
      <header className={cn(baseStyles['resume-header'], styles.oneLine, 'border-b')}>
        <span className={cn(styles.nameRow)}>
          {nameEl}
          {titleEl && (
            <>
              <span className={styles.sep}>·</span>
              {titleEl}
            </>
          )}
        </span>
        {contacts.length > 0 && <span className={styles.sep}>·</span>}
        <span className={cn(styles.contacts, baseStyles['resume-meta'])}>{inlineContacts}</span>
      </header>
    );
  }

  if (isGrid) {
    return (
      <header
        className={cn(
          baseStyles['resume-header'],
          styles.grid,
          isThreeCol ? styles.grid3 : styles.grid2,
          'border-b'
        )}
      >
        <div className={styles.nameBlockStacked}>
          {nameEl}
          {titleEl}
        </div>
        <div
          className={cn(
            baseStyles['resume-meta'],
            isThreeCol ? styles.contactsColumns2 : styles.contactsColumns
          )}
        >
          {contacts.map((contact) => (
            <div key={contact.field} className={styles.contactStacked}>
              {renderContact(contact)}
            </div>
          ))}
        </div>
      </header>
    );
  }

  // two-line-center / -left / -right
  const alignClass =
    align === 'left'
      ? styles.alignLeft
      : align === 'right'
        ? styles.alignRight
        : styles.alignCenter;
  return (
    <header className={cn(baseStyles['resume-header'], styles.header, alignClass, 'border-b')}>
      <div className={cn(styles.nameRow, nameStyle === 'centered' && styles.nameCentered)}>
        {nameEl}
        {titleEl && (
          <>
            <span className={styles.sep}>·</span>
            {titleEl}
          </>
        )}
      </div>
      <div
        className={cn(
          styles.contacts,
          baseStyles['resume-meta'],
          align === 'center' && styles.contactsCenter,
          align === 'right' && styles.contactsRight
        )}
      >
        {inlineContacts}
      </div>
    </header>
  );
};
