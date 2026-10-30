import type { AdditionalInfo } from '@/components/dashboard/resume-component';

export type AdditionalGroupKey =
  | 'technicalSkills'
  | 'languages'
  | 'certificationsTraining'
  | 'awards';

export interface AdditionalGroup {
  key: AdditionalGroupKey;
  items: string[];
}

export interface AdditionalGroupsResult {
  groups: AdditionalGroup[];
  /** True when ≥2 groups are visible+non-empty; drives sub-label rendering. */
  showSubLabels: boolean;
  hasContent: boolean;
}

function cleanItems(raw: string[] | undefined): string[] {
  return (raw ?? []).filter(
    (item): item is string => typeof item === 'string' && item.trim() !== ''
  );
}

/** technicalSkills is always visible; optional groups follow the visibility map.
 *  When the map is absent, a group is visible iff it's non-empty (legacy behaviour). */
function isGroupVisible(
  key: AdditionalGroupKey,
  items: string[],
  visibility: AdditionalInfo['visibility']
): boolean {
  if (key === 'technicalSkills') return true;
  if (visibility === undefined || visibility === null) return items.length > 0;
  return visibility[key as keyof NonNullable<AdditionalInfo['visibility']>] ?? false;
}

/** Returns the ordered, filtered groups plus a sub-label flag.
 *  Call from any template or form that renders the additional section. */
export function useAdditionalGroups(
  additional: AdditionalInfo | undefined,
  visibility: AdditionalInfo['visibility']
): AdditionalGroupsResult {
  const technicalSkills = cleanItems(additional?.technicalSkills);
  const languages = cleanItems(additional?.languages);
  const certificationsTraining = cleanItems(additional?.certificationsTraining);
  const awards = cleanItems(additional?.awards);

  const candidates: AdditionalGroup[] = [
    { key: 'technicalSkills', items: technicalSkills },
    { key: 'languages', items: languages },
    { key: 'certificationsTraining', items: certificationsTraining },
    { key: 'awards', items: awards },
  ];

  const groups = candidates.filter(
    (g) => g.items.length > 0 && isGroupVisible(g.key, g.items, visibility)
  );

  return {
    groups,
    showSubLabels: groups.length >= 2,
    hasContent: groups.length > 0,
  };
}
