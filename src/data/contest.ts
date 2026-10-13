import { PlanetSubmission, WizardAnswers } from '../types/contest';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Visual Assets
import planetHeroImg from '../assets/images/planet_akinoya_1790852629401.jpg';
import twilightWorldImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import mushroomValleyImg from '../assets/images/akinoya_mushroom_valley.jpg';
import visualizerThumbnailImg from '../assets/images/visualizer_thumbnail.png';
import heroBgImg from '../assets/images/akinoya_hero_bg.jpg';

const LOCAL_SUBMISSIONS_KEY = 'akinoya_planet_submissions';
const LOCAL_CONTEST_VOTES_KEY = 'akinoya_contest_votes';

export const INITIAL_SUBMISSIONS: PlanetSubmission[] = [
  {
    id: 'PLN-2027-ZEPHYR',
    userId: 'creator-elena',
    authorName: 'Elena Vance',
    authorUsername: 'elena-vance',
    authorAvatarGradient: 'from-cyan-400 via-blue-500 to-indigo-600',
    planetName: 'Planet Zephyria-9',
    atmosphere: 'Hyper-Oxygenated Bioluminescent Jungle',
    flora: 'Giant Resonance Spore Mushrooms (Glowing Violet)',
    fauna: 'Leviathan Plasma-Wings drifting in upper troposphere',
    sonicVibe: 'Deep Modular Sub-Bass & Cinematic ACEScc Synthesizers',
    visualAesthetic: '4K Octane Render Spectral & Volumetric Light Shafts',
    landmark: 'The Obsidian Spire (Infinite Energy Conduit)',
    additionalNotes: 'Sub-surface tunnels carry liquid neon energy that pulses in time with atmospheric pressure waves.',
    generatedLore:
      'Discovered in the twilight belt of Sector 7, Zephyria-9 rotates synchronously with its twin cobalt suns. Its troposphere is alive with ionized bioluminescence, where gargantuan spore canopies filter solar radiation into pure resonant harmonics. Indigenous pilots utilize the Obsidian Spire to recharge quantum navigation drives before deep-space jumps.',
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
    id: 'PLN-2027-AURA',
    userId: 'creator-kaelen',
    authorName: 'Kaelen Voss',
    authorUsername: 'kaelen-voss',
    authorAvatarGradient: 'from-violet-400 via-purple-500 to-fuchsia-600',
    planetName: 'Sector 9 Nexus: Caelum',
    atmosphere: 'Ionized Basalt & Twilight Auroras',
    flora: 'Silicon-Veined Metallic Foliage',
    fauna: 'Silicon-Shelled Crystalline Predators',
    sonicVibe: 'Aggressive Neurofunk Drops & Industrial Metallic Transients',
    visualAesthetic: 'Unreal Engine 5.4 Lumen Neon Cyberpunk Atmosphere',
    landmark: 'Celestial Dyson Ring Fragment hovering at equator',
    additionalNotes: 'Orbital wreckage from the First Collapse has settled into a permanently glowing particle ring.',
    generatedLore:
      'Caelum was forged in the gravitational wake of a collapsed white dwarf. Its crust is woven from magnetic obsidian veins, reacting violent tremors whenever magnetic storms batter the Dyson Ring Fragment. The predatory wildlife feeds directly on static electricity discharges, hunting along crystalline ridges.',
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
    id: 'PLN-2027-CRYO',
    userId: 'creator-sora',
    authorName: 'Sora Takahashi',
    authorUsername: 'sora-t',
    authorAvatarGradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    planetName: 'MyPlanet Glacies-IV',
    atmosphere: 'Sub-Zero Cryo-Methane Glacier Rings',
    flora: 'Floating Aerial Kelp & Hydrogen Blossoms',
    fauna: 'Bioluminescent Hexapod Crawlers in volcanic caverns',
    sonicVibe: 'Glitch Ambient Lo-Fi & Ethereal Tape Saturation',
    visualAesthetic: '35mm Anamorphic Film Grain with ACEScc Color Science',
    landmark: 'The Sunken Cobalt Caldera of Upper Äkinoya',
    additionalNotes: 'Sub-glacial geothermal vents create enclosed tropical biomes under three kilometers of ice.',
    generatedLore:
      'A world perpetually suspended in cryogenic suspension. Beneath its reflective methane oceans lie tectonic thermal chimneys that nurture delicate floating hydrogen blossoms. Explorers describe the acoustic experience as an endless, soothing drone of shifting glacial sheets and binaural hydro-resonance.',
    renders: {
      hero: mushroomValleyImg,
      atmosphere: planetHeroImg,
      ecosystem: heroBgImg,
      landmark: twilightWorldImg,
    },
    votesCount: 47,
    status: 'PUBLISHED',
    createdAt: '2026-10-10',
    votingDeadline: 'June 30, 2027',
  },
];

// Retrieve all stored planet submissions (merged with defaults)
export const getStoredPlanetSubmissions = (): PlanetSubmission[] => {
  if (typeof window === 'undefined') return INITIAL_SUBMISSIONS;
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    if (raw) {
      const parsed: PlanetSubmission[] = JSON.parse(raw);
      // Merge unique by ID
      const existingIds = new Set(parsed.map((p) => p.id));
      const merged = [...parsed, ...INITIAL_SUBMISSIONS.filter((p) => !existingIds.has(p.id))];
      return merged;
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

// Generate high-end AI cinematic lore from wizard answers
export const generatePlanetLore = (answers: WizardAnswers, authorName: string): string => {
  const planetName = answers.planetName || 'Planet Äkinoya Prime';
  const atmo = answers.atmosphere || 'Atmosphere of ionized violet twilight';
  const flora = answers.flora || 'Resonant bioluminescent flora';
  const fauna = answers.fauna || 'Apex plasma fauna roaming high-altitude thermals';
  const vibe = answers.sonicVibe || 'Cinematic analog modular synthesis';
  const visual = answers.visualAesthetic || '4K Octane spectral rendering';
  const landmark = answers.landmark || 'The Ancient Obsidian Spire';
  const notes = answers.additionalNotes ? ` World architect notes specify: "${answers.additionalNotes}"` : '';

  return `Classified by architect ${authorName}, ${planetName} is a high-entropy frontier world situated in the outer rings of the Äkinoya system. Its planetary envelope features ${atmo}, creating an awe-inspiring visual signature rendered with ${visual}.

The surface ecology is defined by ${flora}, which forms a mutualistic symbiotic network alongside ${fauna}. Dominating the equatorial horizon stands ${landmark}, serving as a harmonic anchor point where the world's sonic signature—characterized by ${vibe}—echoes across mountain ranges and baselines.${notes}

This planetary territory is officially registered for the 2027 Äkinoya Lore Governance Council. Community votes cast before June 30 determine whether this sector will be featured in the official Sillow Mill album visualizer and animated storyline.`;
};

// Map wizard inputs to 4 visual render assets
export const resolvePlanetRenders = (_answers: WizardAnswers): PlanetSubmission['renders'] => {
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
