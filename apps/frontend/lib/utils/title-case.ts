/**
 * Common technical acronyms that should be fully upper-cased when a keyword
 * arrives lower-cased (e.g. "api" -> "API"). Compared case-insensitively.
 */
const ACRONYMS = new Set([
  'api',
  'rest',
  'graphql',
  'sql',
  'nosql',
  'html',
  'css',
  'http',
  'https',
  'json',
  'xml',
  'yaml',
  'aws',
  'gcp',
  'ci',
  'cd',
  'ui',
  'ux',
  'ios',
  'php',
  'sdk',
  'cli',
  'tcp',
  'ssh',
  'tls',
  'ssl',
  'orm',
]);

/** Capitalize a single word, leaving the rest of its characters untouched. */
function capitalizeWord(word: string): string {
  if (!word) return word;
  // Preserve words that already carry deliberate casing (e.g. "JavaScript",
  // "iOS") so we only fix the all-lower-case / already-lower-first case.
  if (/[A-Z]/.test(word)) return word;
  if (ACRONYMS.has(word.toLowerCase())) return word.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Smart title case for a skill/keyword. Capitalizes the first letter of each
 * word (words are split on whitespace and "/"), upper-cases known acronyms, and
 * leaves words that already contain an upper-case letter unchanged.
 */
export function toTitleCase(value: string): string {
  return value
    .split(/(\s+|\/)/)
    .map((token) => (/^\s+$/.test(token) || token === '/' ? token : capitalizeWord(token)))
    .join('')
    .trim();
}
