/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Strict profanity, hate speech, racial slurs, explicit violence, and vulgarity filter
 * for world and sector naming in the Sillow Mill — Äkinoya universe.
 */

// Normalized blocked patterns (lowercase, stripped of spaces and common leetspeak substitutions)
const BLOCKED_TERMS: string[] = [
  // Racial slurs & hate speech
  'nigger',
  'nigga',
  'nigg',
  'nig',
  'kike',
  'spic',
  'chink',
  'gook',
  'wetback',
  'faggot',
  'fag',
  'dyke',
  'tranny',
  'shemale',
  'retard',
  'tard',
  'coon',
  'darkie',
  'paki',
  'raghead',
  'towelhead',
  'mongoloid',
  'kaffir',
  'jap',
  'zipperhead',
  'whitepower',
  'whitesupremacy',
  'aryan',
  'antisemit',
  'antisemitic',
  'holocaust',
  'gaschamber',
  'zyklon',
  'swastika',
  'neo-nazi',
  'neonazi',
  'nazi',
  'hitler',
  'goebbels',
  'himmler',
  'gestapo',
  'ss-totenkopf',
  'ku-klux-klan',
  'kukluxklan',
  'kkk',

  // Explicit violence, terrorism, abuse
  'killall',
  'genocide',
  'murder',
  'rapist',
  'rape',
  'suicide',
  'jihadist',
  'terrorist',
  'terrorism',
  'behead',
  'massacre',
  'schoolshooter',
  'pedophile',
  'paedophile',
  'pedo',
  'childporn',
  'cp',
  'molest',
  'infanticide',

  // Vulgarity & explicit sexual terms
  'fuck',
  'fucker',
  'motherfucker',
  'fucking',
  'cunt',
  'bitch',
  'whore',
  'slut',
  'dick',
  'dickhead',
  'cock',
  'cocksucker',
  'pussy',
  'tits',
  'boobs',
  'boobies',
  'asshole',
  'bastard',
  'twat',
  'wanker',
  'porn',
  'porno',
  'pornhub',
  'blowjob',
  'handjob',
  'cumshot',
  'cum',
  'semen',
  'masturbat',
  'ejaculat',
  'dildo',
  'vagina',
  'penis',
  'anal',
  'anus',
  'shit',
  'bullshit',
  'shitty',
  'dipshit',
];

/**
 * Normalizes input string to defeat common leetspeak and obfuscation tricks:
 * e.g., 'n1gg3r' -> 'nigger', 'f u c k' -> 'fuck', 'h!tl3r' -> 'hitler'
 */
function normalizeText(text: string): string {
  let cleaned = text.toLowerCase().trim();

  // Common leetspeak substitutions
  cleaned = cleaned
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/8/g, 'b')
    .replace(/3/g, 'e')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/\|/g, 'i')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/7/g, 't')
    .replace(/\+/g, 't');

  return cleaned;
}

export interface NameValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a world name for strict adherence to community standards,
 * politeness, creativity, and elegance.
 */
export function validatePlanetName(name: string): NameValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Please enter a name for your planet to begin worldbuilding.',
    };
  }

  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: 'Planet designation must be at least 2 characters long.',
    };
  }

  if (trimmed.length > 36) {
    return {
      isValid: false,
      error: 'Planet designation must not exceed 36 characters.',
    };
  }

  // Check normalized text
  const normalized = normalizeText(trimmed);
  const condensed = normalized.replace(/[^a-z]/g, '');

  for (const term of BLOCKED_TERMS) {
    // Exact word boundary or contained in stripped string
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(normalized) || condensed.includes(term)) {
      return {
        isValid: false,
        error:
          'Please choose a respectful, creative, and elegant name for your world. Inappropriate language, offensive terms, and hate speech are strictly prohibited.',
      };
    }
  }

  return { isValid: true };
}
