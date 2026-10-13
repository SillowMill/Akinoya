import { PlanetSubmission, WizardAnswers } from '../types/contest';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Visual Assets (Sillow Mill 2D Sci-Fi Anime Aesthetics)
import planetHeroImg from '../assets/images/planet_akinoya_1790852629401.jpg';
import twilightWorldImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import mushroomValleyImg from '../assets/images/akinoya_mushroom_valley.jpg';
import visualizerThumbnailImg from '../assets/images/visualizer_thumbnail.png';
import heroBgImg from '../assets/images/akinoya_hero_bg.jpg';
import moodboardImg from '../assets/images/Mood.png';

const LOCAL_SUBMISSIONS_KEY = 'akinoya_planet_submissions';
const LOCAL_CONTEST_VOTES_KEY = 'akinoya_contest_votes';

/**
 * Enforces the mandatory Äkinoya planetary naming rule:
 * All planet names must start with 'Ä' (e.g. Ämlemie, Älkan, Ämero, Äkinoya Prime).
 * Automatically converts or prepends 'Ä' if missing (e.g. Xyris -> Äxyris).
 */
export const formatAkinoyaPlanetName = (rawName?: string): string => {
  if (!rawName || !rawName.trim()) return 'Äkinoya Prime';
  let clean = rawName.trim();
  // Strip redundant English prefixes
  clean = clean.replace(/^(Planet|MyPlanet|Sector\s*\d*|World)\s+/i, '');
  if (!clean) return 'Äkinoya Prime';

  // If already starts with Ä or ä
  if (clean.startsWith('Ä') || clean.startsWith('ä')) {
    return 'Ä' + clean.slice(1);
  }

  // If starts with A or a (without umlaut)
  if (/^[Aa]/.test(clean)) {
    return 'Ä' + clean.slice(1);
  }

  // Prepend Ä (e.g. Xyris -> Äxyris, Mero -> Ämero)
  if (/^[A-Z][a-z0-9]/.test(clean)) {
    return 'Ä' + clean.charAt(0).toLowerCase() + clean.slice(1);
  }

  return 'Ä' + clean;
};

export const INITIAL_SUBMISSIONS: PlanetSubmission[] = [
  {
    id: 'PLN-2027-AKINOYA-PRIME',
    userId: 'creator-elena',
    authorName: 'Elena Vance',
    authorUsername: 'elena-vance',
    authorAvatarGradient: 'from-cyan-400 via-blue-500 to-indigo-600',
    planetName: 'Äkinoya Prime',
    atmosphere: 'Electric Blue Ionized Resonance & Icy Silhouette Ring',
    flora: 'Giant Resonance Spore Mushrooms (Glowing Violet)',
    fauna: 'Leviathan Plasma-Wings drifting in upper troposphere',
    sonicVibe: 'Deep Modular Sub-Bass & Cinematic ACEScc Synthesizers',
    visualAesthetic: '2D High-End Anime Sci-Fi Cel-Shaded Art (Sillow Mill Aesthetic)',
    landmark: 'The Obsidian Spire (Infinite Energy Conduit)',
    additionalNotes: 'Sub-surface tunnels carry liquid neon energy that pulses in time with atmospheric pressure waves.',
    generatedLore:
      'Discovered at the epicenter of the Äkinoya energy sphere, Äkinoya Prime radiates with celestial 2D anime grandeur. Its troposphere is alive with electric blue ionized bioluminescence, where gargantuan spore canopies filter cosmic radiation into pure resonant harmonics. Indigenous pilots utilize the Obsidian Spire to recharge quantum navigation drives before deep-space jumps.',
    renders: {
      hero: planetHeroImg,
      atmosphere: twilightWorldImg,
      ecosystem: mushroomValleyImg,
      landmark: visualizerThumbnailImg,
    },
    votesCount: 88,
    status: 'FINALIST',
    createdAt: '2026-10-08',
    votingDeadline: 'June 30, 2027',
  },
  {
    id: 'PLN-2027-AMLEMIE',
    userId: 'creator-kaelen',
    authorName: 'Kaelen Voss',
    authorUsername: 'kaelen-voss',
    authorAvatarGradient: 'from-violet-400 via-purple-500 to-fuchsia-600',
    planetName: 'Ämlemie',
    atmosphere: 'Cosmic 2D Space Vista & Deep Purple Orbital Rings',
    flora: 'Silicon-Veined Metallic Foliage & Star-Pollen Canopy',
    fauna: 'Silicon-Shelled Crystalline Predators & Void Gliders',
    sonicVibe: 'Aggressive Neurofunk Drops & Industrial Metallic Transients',
    visualAesthetic: '2D Cel-Shaded Cosmic Anime Concept Art (Sillow Mill House Style)',
    landmark: 'Celestial Dyson Ring Fragment hovering at equator',
    additionalNotes: 'Orbital wreckage from the First Collapse has settled into a permanently glowing cosmic particle ring.',
    generatedLore:
      'Ämlemie is an enigmatic ringed sanctuary framed in the classic 2D anime space vista style of Sillow Mill. Woven with deep cosmic purple hues and bioluminescent neon turquoise, its celestial ring fragment casts permanent twilight across alien valleys where crystalline predators feed on static electrical discharges.',
    renders: {
      hero: visualizerThumbnailImg,
      atmosphere: heroBgImg,
      ecosystem: twilightWorldImg,
      landmark: planetHeroImg,
    },
    votesCount: 64,
    status: 'PUBLISHED',
    createdAt: '2026-10-09',
    votingDeadline: 'June 30, 2027',
  },
  {
    id: 'PLN-2027-ALKAN-IV',
    userId: 'creator-sora',
    authorName: 'Sora Takahashi',
    authorUsername: 'sora-t',
    authorAvatarGradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    planetName: 'Älkan-IV',
    atmosphere: 'Bioluminescent Neon Forest & Canopy Atmosphere',
    flora: 'Floating Aerial Kelp, Hydrogen Blossoms & Spore Trees',
    fauna: 'Bioluminescent Hexapod Crawlers in cockpit view valleys',
    sonicVibe: 'Glitch Ambient Lo-Fi & Ethereal Tape Saturation',
    visualAesthetic: '2D Sillow Mill Cockpit Moodboard Style & Cel-Shaded Neon',
    landmark: 'The Sunken Cobalt Caldera of Upper Äkinoya',
    additionalNotes: 'Sub-glacial geothermal vents create enclosed tropical bioluminescent biomes matching the expedition cockpit moodboard.',
    generatedLore:
      'Anchored directly in the visual heritage of the Sillow Mill ship cockpit and landing moodboard, Älkan-IV is a lush bioluminescent frontier world. Glowing turquoise mosses and violet spore canopies illuminate misty alien canopies, echoing with the tape-saturated frequencies of lone interstellar explorers.',
    renders: {
      hero: moodboardImg,
      atmosphere: mushroomValleyImg,
      ecosystem: twilightWorldImg,
      landmark: planetHeroImg,
    },
    votesCount: 47,
    status: 'PUBLISHED',
    createdAt: '2026-10-10',
    votingDeadline: 'June 30, 2027',
  },
];

// Retrieve all stored planet submissions (merged with defaults and sanitized with Ä rule)
export const getStoredPlanetSubmissions = (): PlanetSubmission[] => {
  const sanitize = (list: PlanetSubmission[]): PlanetSubmission[] =>
    list.map((sub) => {
      // Migrate legacy default IDs if present
      if (sub.id === 'PLN-2027-ZEPHYR') {
        return INITIAL_SUBMISSIONS[0];
      }
      if (sub.id === 'PLN-2027-AURA') {
        return INITIAL_SUBMISSIONS[1];
      }
      if (sub.id === 'PLN-2027-CRYO') {
        return INITIAL_SUBMISSIONS[2];
      }
      return {
        ...sub,
        planetName: formatAkinoyaPlanetName(sub.planetName),
      };
    });

  if (typeof window === 'undefined') return INITIAL_SUBMISSIONS;
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    if (raw) {
      const parsed: PlanetSubmission[] = JSON.parse(raw);
      // Merge unique by ID
      const existingIds = new Set(parsed.map((p) => p.id));
      const merged = [...parsed, ...INITIAL_SUBMISSIONS.filter((p) => !existingIds.has(p.id))];
      return sanitize(merged);
    }
  } catch (err) {
    console.warn('[Contest] Error reading stored submissions:', err);
  }
  return INITIAL_SUBMISSIONS;
};

// Check if a specific user already has a golden ticket submission
export const getUserContestSubmission = (userId?: string, email?: string): PlanetSubmission | null => {
  if (!userId && !email) return null;
  const submissions = getStoredPlanetSubmissions();
  const match = submissions.find(
    (s) => (userId && s.userId === userId) || (email && s.authorEmail && s.authorEmail.toLowerCase() === email.toLowerCase())
  );
  return match || null;
};

// Generate high-end AI cinematic lore from wizard answers adhering strictly to Sillow Mill aesthetic
export const generatePlanetLore = (answers: WizardAnswers, authorName: string): string => {
  const planetName = formatAkinoyaPlanetName(answers.planetName);
  const atmo = answers.atmosphere || 'Atmosphere of ionized violet twilight';
  const flora = answers.flora || 'Resonant bioluminescent flora';
  const fauna = answers.fauna || 'Apex plasma fauna roaming high-altitude thermals';
  const vibe = answers.sonicVibe || 'Cinematic analog modular synthesis';
  const visual = answers.visualAesthetic || '2D high-end anime sci-fi concept art (Sillow Mill aesthetic)';
  const landmark = answers.landmark || 'The Ancient Obsidian Spire';
  const notes = answers.additionalNotes ? ` World architect notes specify: "${answers.additionalNotes}"` : '';

  return `Classified by architect ${authorName}, ${planetName} is a high-entropy frontier world situated in the outer rings of the Äkinoya system. Rendered strictly in the signature Sillow Mill 2D anime aesthetic with bioluminescent neon turquoise and deep cosmic purple hues, its planetary envelope features ${atmo}, creating an awe-inspiring visual signature rendered with ${visual}.

The surface ecology is defined by ${flora}, which forms a mutualistic symbiotic network alongside ${fauna}. Dominating the equatorial horizon stands ${landmark}, serving as a harmonic anchor point where the world's sonic signature—characterized by ${vibe}—echoes across mountain ranges and baselines.${notes}

This planetary territory is officially registered for the 2027 Äkinoya Lore Governance Council. Community votes cast before June 30 determine whether this sector will be featured in the official Sillow Mill album visualizer and animated storyline.`;
};

// Map wizard inputs to 4 visual render assets anchored in Sillow Mill 2D style
export const resolvePlanetRenders = (answers: WizardAnswers): PlanetSubmission['renders'] => {
  const text = `${answers.planetName} ${answers.atmosphere} ${answers.visualAesthetic} ${answers.landmark}`.toLowerCase();

  if (text.includes('moodboard') || text.includes('cockpit') || text.includes('forest') || text.includes('älkan')) {
    return {
      hero: moodboardImg,
      atmosphere: mushroomValleyImg,
      ecosystem: twilightWorldImg,
      landmark: planetHeroImg,
    };
  }

  if (text.includes('ring') || text.includes('ämlemie') || text.includes('space') || text.includes('dyson')) {
    return {
      hero: visualizerThumbnailImg,
      atmosphere: heroBgImg,
      ecosystem: twilightWorldImg,
      landmark: planetHeroImg,
    };
  }

  return {
    hero: planetHeroImg,
    atmosphere: twilightWorldImg,
    ecosystem: mushroomValleyImg,
    landmark: visualizerThumbnailImg,
  };
};

// Save a new contest entry
export const savePlanetSubmission = async (
  submission: PlanetSubmission
): Promise<{ success: boolean; submission: PlanetSubmission; error?: string }> => {
  try {
    const existing = getStoredPlanetSubmissions();
    const updated = [submission, ...existing.filter((s) => s.id !== submission.id)];
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updated));

    // Optional Supabase cloud persistence
    if (isSupabaseConfigured) {
      try {
        await supabase.from('planet_submissions').upsert({
          id: submission.id,
          user_id: submission.userId,
          author_name: submission.authorName,
          author_username: submission.authorUsername,
          author_email: submission.authorEmail,
          planet_name: submission.planetName,
          atmosphere: submission.atmosphere,
          flora: submission.flora,
          fauna: submission.fauna,
          sonic_vibe: submission.sonicVibe,
          visual_aesthetic: submission.visualAesthetic,
          landmark: submission.landmark,
          additional_notes: submission.additionalNotes,
          generated_lore: submission.generatedLore,
          votes_count: submission.votesCount,
          status: submission.status,
          created_at: submission.createdAt,
        });
      } catch (cloudErr) {
        console.warn('[Contest] Cloud sync deferred:', cloudErr);
      }
    }

    return { success: true, submission };
  } catch (err: any) {
    console.error('[Contest] Failed to save submission:', err);
    return { success: false, submission, error: err?.message || 'Save error' };
  }
};

// Check if user has voted on a submission
export const hasUserVotedOnSubmission = (submissionId: string, userId?: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const key = userId ? `vote_${submissionId}_${userId}` : `vote_${submissionId}_anon`;
    const raw = localStorage.getItem(LOCAL_CONTEST_VOTES_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      return Boolean(map[key]);
    }
  } catch {}
  return false;
};

// Toggle community vote on a planet submission
export const togglePlanetSubmissionVote = async (
  submissionId: string,
  userId?: string
): Promise<{ success: boolean; newVotesCount: number; hasVoted: boolean }> => {
  const currentVoted = hasUserVotedOnSubmission(submissionId, userId);
  const nextVoted = !currentVoted;
  const key = userId ? `vote_${submissionId}_${userId}` : `vote_${submissionId}_anon`;

  try {
    const mapRaw = localStorage.getItem(LOCAL_CONTEST_VOTES_KEY);
    const map = mapRaw ? JSON.parse(mapRaw) : {};
    if (nextVoted) {
      map[key] = true;
    } else {
      delete map[key];
    }
    localStorage.setItem(LOCAL_CONTEST_VOTES_KEY, JSON.stringify(map));
  } catch {}

  const submissions = getStoredPlanetSubmissions();
  let updatedCount = 0;
  const updatedSubmissions = submissions.map((sub) => {
    if (sub.id === submissionId) {
      const nextCount = Math.max(0, sub.votesCount + (nextVoted ? 1 : -1));
      updatedCount = nextCount;
      return { ...sub, votesCount: nextCount, hasVoted: nextVoted };
    }
    return sub;
  });

  try {
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updatedSubmissions));
  } catch {}

  // Sync with Supabase if online
  if (isSupabaseConfigured && userId) {
    try {
      if (nextVoted) {
        await supabase
          .from('planet_submission_votes')
          .insert({ submission_id: submissionId, user_id: userId });
      } else {
        await supabase
          .from('planet_submission_votes')
          .delete()
          .match({ submission_id: submissionId, user_id: userId });
      }
    } catch {}
  }

  return {
    success: true,
    newVotesCount: updatedCount,
    hasVoted: nextVoted,
  };
};
