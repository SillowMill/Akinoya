import { PlanetSubmission, WizardAnswers } from '../types/contest';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Visual Assets (Sillow Mill 2D Sci-Fi Anime Aesthetics)
import planetHeroImg from '../assets/images/planet_akinoya_1790852629401.jpg';
import exactPlanetImg from '../assets/images/akinoya_exact_planet_1790853678690.jpg';
import twilightWorldImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import mushroomValleyImg from '../assets/images/akinoya_mushroom_valley.jpg';
import visualizerThumbnailImg from '../assets/images/visualizer_thumbnail.png';
import heroBgImg from '../assets/images/akinoya_hero_bg.jpg';
import moodboardImg from '../assets/images/Mood.png';
import mobileBgImg from '../assets/images/akinoya_mobile_bg_1790853703270.jpg';

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

/**
 * Derives official Äkinoya planetary attributes from the 8 human-centric answers.
 */
export const derivePlanetAttributesFromHumanAnswers = (answers: WizardAnswers): WizardAnswers => {
  let name = answers.planetName;
  if (!name || !name.trim()) {
    const rawTokens = [
      answers.colorPalette?.split(' ')[0],
      answers.admiredCreature?.split(' ')[0],
      answers.naturalEnvironment?.split(' ')[0],
    ].filter(Boolean);
    const seed = (rawTokens[0] || 'kinoya').replace(/[^a-zA-Z]/g, '');
    name = formatAkinoyaPlanetName(seed.length > 2 ? seed : 'Äkinoya Prime');
  } else {
    name = formatAkinoyaPlanetName(name);
  }

  const atmosphere =
    answers.atmosphere ||
    `Ionized celestial atmosphere styled with ${answers.colorPalette || 'deep indigo and neon purple'} and serene horizons of ${answers.naturalEnvironment || 'misty mountain ridges'}`;

  const flora =
    answers.flora ||
    `Bioluminescent botanical systems inspired by ${answers.naturalEnvironment || 'ancient rainforests'}, creating peaceful biomes echoing ${answers.relaxation || 'deep relaxation'}`;

  const fauna =
    answers.fauna ||
    `Celestial apex wildlife inspired by the ${answers.admiredCreature || 'noble pack wolf and soaring plasma glider'}, roaming through high-altitude thermals`;

  const sonicVibe =
    answers.sonicVibe ||
    `${answers.creativeExpression || 'Deep analog synthesizers and cinematic ACEScc ambient pads'} vibrating across the planetary crust`;

  const visualAesthetic =
    answers.visualAesthetic ||
    `2D High-End Anime Sci-Fi Cel-Shaded Art (Sillow Mill Aesthetic, Mood.png & akinoya_hero_bg.jpg), palette: ${answers.colorPalette || 'deep indigo and neon purple'}`;

  const landmark =
    answers.landmark ||
    `The Monument of Resilience: An ancient obsidian megastructure commemorating "${answers.resilienceStory || 'forging a creative vision from scratch'}"`;

  const additionalNotes =
    answers.additionalNotes ||
    `Founding Creed & Future Promise: "${answers.futurePromise || 'Never forget that true beauty lies in curiosity and persistence'}". Guided by core philosophy: "${answers.lifePhilosophy || 'Harmony between technology and nature'}".`;

  return {
    ...answers,
    planetName: name,
    atmosphere,
    flora,
    fauna,
    sonicVibe,
    visualAesthetic,
    landmark,
    additionalNotes,
  };
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
    flora: 'Giant Resonance Spore Mushrooms (Glowing Violet & Neon Turquoise)',
    fauna: 'Leviathan Plasma-Wings drifting in upper troposphere',
    sonicVibe: 'Deep Modular Sub-Bass & Cinematic ACEScc Synthesizers',
    visualAesthetic: '2D High-End Anime Sci-Fi Cel-Shaded Art (Sillow Mill Aesthetic)',
    landmark: 'The Obsidian Spire (Infinite Energy Conduit)',
    futurePromise: 'Never forget that true beauty lies in curiosity and persistence.',
    additionalNotes: 'Sub-surface tunnels carry liquid neon energy that pulses in time with atmospheric pressure waves.',
    generatedLore:
      'Discovered at the epicenter of the Äkinoya energy sphere, Äkinoya Prime radiates with celestial 2D anime grandeur. Its troposphere is alive with electric blue ionized bioluminescence, where gargantuan spore canopies filter cosmic radiation into pure resonant harmonics. Indigenous pilots utilize the Obsidian Spire to recharge quantum navigation drives before deep-space jumps.',
    renders: {
      hero: planetHeroImg, // 1. Main Orbital (akinoya_hero_bg.jpg style)
      flora: mushroomValleyImg, // 2. Flora (Mood.png panel style)
      fauna: twilightWorldImg, // 3. Fauna
      atmosphere: heroBgImg, // 4. Cockpit / Landing Atmosphere
      landmark: visualizerThumbnailImg, // 5. Landmark / Archival Cover
      ecosystem: mushroomValleyImg,
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
    futurePromise: 'That technology and nature can harmoniously merge.',
    additionalNotes: 'Orbital wreckage from the First Collapse has settled into a permanently glowing cosmic particle ring.',
    generatedLore:
      'Ämlemie is an enigmatic ringed sanctuary framed in the classic 2D anime space vista style of Sillow Mill. Woven with deep cosmic purple hues and bioluminescent neon turquoise, its celestial ring fragment casts permanent twilight across alien valleys where crystalline predators feed on static electrical discharges.',
    renders: {
      hero: exactPlanetImg, // 1. Main Orbital
      flora: twilightWorldImg, // 2. Flora
      fauna: mobileBgImg, // 3. Fauna
      atmosphere: moodboardImg, // 4. Cockpit Atmosphere (Mood.png style)
      landmark: heroBgImg, // 5. Landmark / Archival Cover
      ecosystem: twilightWorldImg,
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
    futurePromise: 'Curiosity is the compass of the stars.',
    additionalNotes: 'Sub-glacial geothermal vents create enclosed tropical bioluminescent biomes matching the expedition cockpit moodboard.',
    generatedLore:
      'Anchored directly in the visual heritage of the Sillow Mill ship cockpit and landing moodboard, Älkan-IV is a lush bioluminescent frontier world. Glowing turquoise mosses and violet spore canopies illuminate misty alien canopies, echoing with the tape-saturated frequencies of lone interstellar explorers.',
    renders: {
      hero: visualizerThumbnailImg, // 1. Main Orbital / Storyboard Hero
      flora: mushroomValleyImg, // 2. Flora
      fauna: twilightWorldImg, // 3. Fauna
      atmosphere: heroBgImg, // 4. Cockpit / Landing Atmosphere
      landmark: planetHeroImg, // 5. Landmark / Archival Cover
      ecosystem: mushroomValleyImg,
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
      if (sub.id === 'PLN-2027-ZEPHYR' || sub.id === 'PLN-2027-AKINOYA-PRIME') {
        return INITIAL_SUBMISSIONS[0];
      }
      if (sub.id === 'PLN-2027-AURA' || sub.id === 'PLN-2027-AMLEMIE') {
        return INITIAL_SUBMISSIONS[1];
      }
      if (sub.id === 'PLN-2027-CRYO' || sub.id === 'PLN-2027-ALKAN-IV') {
        return INITIAL_SUBMISSIONS[2];
      }
      const renders = {
        hero: sub.renders?.hero || planetHeroImg,
        flora: sub.renders?.flora || sub.renders?.ecosystem || mushroomValleyImg,
        fauna: sub.renders?.fauna || twilightWorldImg,
        atmosphere: sub.renders?.atmosphere || heroBgImg,
        landmark: sub.renders?.landmark || visualizerThumbnailImg,
        ecosystem: sub.renders?.ecosystem || sub.renders?.flora || mushroomValleyImg,
      };
      return {
        ...sub,
        planetName: formatAkinoyaPlanetName(sub.planetName),
        renders,
      };
    });

  if (typeof window === 'undefined') return INITIAL_SUBMISSIONS;
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    if (raw) {
      const parsed: PlanetSubmission[] = JSON.parse(raw);
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
    (s) =>
      (userId && s.userId === userId) ||
      (email && s.authorEmail && s.authorEmail.toLowerCase() === email.toLowerCase())
  );
  return match || null;
};

// Generate high-end AI cinematic lore from wizard answers adhering strictly to Sillow Mill aesthetic
export const generatePlanetLore = (answers: WizardAnswers, authorName: string): string => {
  const planetName = formatAkinoyaPlanetName(answers.planetName);
  const color = answers.colorPalette || 'deep cosmic violet and neon turquoise';
  const atmo = answers.atmosphere || 'an atmosphere of ionized violet twilight and electric auroras';
  const flora = answers.flora || 'resonant bioluminescent flora systems and spore canopies';
  const fauna = answers.fauna || 'apex plasma fauna roaming high-altitude thermals';
  const vibe = answers.sonicVibe || 'cinematic analog modular synthesis';
  const visual = answers.visualAesthetic || '2D high-end anime sci-fi concept art (Sillow Mill aesthetic)';
  const landmark = answers.landmark || 'The Ancient Obsidian Spire energy conduit';
  const promise = answers.futurePromise || 'Never forget that true beauty lies in curiosity and persistence.';
  const philosophy = answers.lifePhilosophy || 'harmony between nature and technology';
  const relaxation = answers.relaxation || 'peaceful moments of quiet contemplation';

  return `Classified by world architect ${authorName}, ${planetName} is an official frontier sector situated within the Äkinoya celestial sphere. Anchored strictly in the signature Sillow Mill 2D anime aesthetic (composition referenced from akinoya_hero_bg.jpg and atmospheric panels from Mood.png), its skies radiate with ${color}, framing ${atmo} rendered in exquisite ${visual}.

The planetary ecology thrives through ${flora}, creating sanctuary valleys where explorers recharge their spirits through ${relaxation}. Across the high troposphere roam ${fauna}, while the equatorial meridian is anchored by ${landmark}. Resonating with ${vibe}, the entire sector reflects the architect's core philosophy: "${philosophy}".

FOUNDING CREED & FUTURE PROMISE:
"${promise}"

This planetary territory is officially registered in the 2027 Äkinoya Lore Governance Council. Community votes cast before June 30 determine whether this sector will be featured in the official Sillow Mill animated storyline and soundtrack.`;
};

// Map wizard inputs to 5 visual render assets anchored in Mood.png & akinoya_hero_bg.jpg
export const resolvePlanetRenders = (answers: WizardAnswers): PlanetSubmission['renders'] => {
  const text = `${answers.planetName} ${answers.atmosphere} ${answers.visualAesthetic} ${answers.colorPalette}`.toLowerCase();

  if (text.includes('moodboard') || text.includes('cockpit') || text.includes('green') || text.includes('älkan')) {
    return {
      hero: moodboardImg, // 1. Main Orbital (Mood.png)
      flora: mushroomValleyImg, // 2. Flora
      fauna: twilightWorldImg, // 3. Fauna
      atmosphere: heroBgImg, // 4. Cockpit Atmosphere (akinoya_hero_bg.jpg)
      landmark: planetHeroImg, // 5. Landmark / Archival Cover
      ecosystem: mushroomValleyImg,
    };
  }

  if (text.includes('ring') || text.includes('ämlemie') || text.includes('purple') || text.includes('dyson')) {
    return {
      hero: visualizerThumbnailImg, // 1. Main Orbital
      flora: twilightWorldImg, // 2. Flora
      fauna: heroBgImg, // 3. Fauna
      atmosphere: moodboardImg, // 4. Cockpit Atmosphere (Mood.png)
      landmark: planetHeroImg, // 5. Landmark / Archival Cover
      ecosystem: twilightWorldImg,
    };
  }

  return {
    hero: planetHeroImg, // 1. Main Orbital (akinoya_hero_bg.jpg)
    flora: mushroomValleyImg, // 2. Flora (Mood.png)
    fauna: twilightWorldImg, // 3. Fauna
    atmosphere: heroBgImg, // 4. Cockpit Atmosphere
    landmark: visualizerThumbnailImg, // 5. Landmark / Archival Cover
    ecosystem: mushroomValleyImg,
  };
};

export interface PlanetPhotoCard {
  id: string;
  title: string;
  category: string;
  url: string;
  description: string;
  styleAnchor: string;
}

export const getPlanetPhotoCards = (sub: PlanetSubmission): PlanetPhotoCard[] => {
  return [
    {
      id: 'photo-hero',
      title: 'Main Orbital Planet Render',
      category: '01 · ORBITAL HORIZON',
      url: sub.renders.hero,
      description: `Planetary disc and orbital curvature of ${sub.planetName}. Electric resonance and deep cosmic horizon.`,
      styleAnchor: 'Aesthetic Reference: akinoya_hero_bg.jpg (2D celestial sphere, energy halo, zero photorealistic noise)',
    },
    {
      id: 'photo-flora',
      title: 'Botanical Flora System',
      category: '02 · BOTANICAL BIOME',
      url: sub.renders.flora || sub.renders.ecosystem || sub.renders.atmosphere,
      description: sub.flora,
      styleAnchor: 'Storyboard Reference: Mood.png (Cinematic anime panel, bioluminescent plant life, atmospheric cel-shading)',
    },
    {
      id: 'photo-fauna',
      title: 'Exotic Fauna & Wildlife System',
      category: '03 · FAUNA ECOSYSTEM',
      url: sub.renders.fauna || sub.renders.atmosphere,
      description: sub.fauna,
      styleAnchor: 'Storyboard Reference: Mood.png (Anime creature linework, apex lifeforms drifting through thermals)',
    },
    {
      id: 'photo-atmosphere',
      title: 'Cockpit / Ship Landing Atmosphere Detail',
      category: '04 · COCKPIT ATMOSPHERE',
      url: sub.renders.atmosphere,
      description: sub.atmosphere,
      styleAnchor: 'Aesthetic Reference: Mood.png (Cockpit canopy view, pilot HUD reflections, volumetric light shafts)',
    },
    {
      id: 'photo-landmark',
      title: 'Lore Dossier Cover & Monument',
      category: '05 · LORE DOSSIER COVER',
      url: sub.renders.landmark,
      description: sub.landmark,
      styleAnchor: `Archival Document Cover (Ancient monument, founding promise: "${sub.futurePromise || 'Never forget that true beauty lies in curiosity and persistence'}")`,
    },
  ];
};

// Save a new contest entry permanently to Supabase user_dossiers & localStorage
export const savePlanetSubmission = async (
  submission: PlanetSubmission
): Promise<{ success: boolean; submission: PlanetSubmission; error?: string }> => {
  try {
    const existing = getStoredPlanetSubmissions();
    const updated = [submission, ...existing.filter((s) => s.id !== submission.id)];
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updated));

    // Supabase cloud persistence (user_dossiers table)
    if (isSupabaseConfigured) {
      try {
        await supabase.from('user_dossiers').upsert({
          id: submission.id,
          user_id: submission.userId,
          author_name: submission.authorName,
          author_username: submission.authorUsername,
          author_email: submission.authorEmail,
          author_avatar_gradient: submission.authorAvatarGradient,
          planet_name: submission.planetName,
          atmosphere: submission.atmosphere,
          flora: submission.flora,
          fauna: submission.fauna,
          sonic_vibe: submission.sonicVibe,
          visual_aesthetic: submission.visualAesthetic,
          landmark: submission.landmark,
          additional_notes: submission.additionalNotes,
          human_answers: submission.humanAnswers || {},
          generated_lore: submission.generatedLore,
          renders: submission.renders,
          votes_count: submission.votesCount,
          status: submission.status,
          created_at: submission.createdAt,
        });
      } catch (cloudErr) {
        console.warn('[Contest] user_dossiers cloud sync notice:', cloudErr);
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

  // Sync with Supabase Realtime & DB
  if (isSupabaseConfigured) {
    try {
      if (userId) {
        if (nextVoted) {
          await supabase.from('dossier_votes').insert({ dossier_id: submissionId, user_id: userId });
        } else {
          await supabase.from('dossier_votes').delete().match({ dossier_id: submissionId, user_id: userId });
        }
      }
      // Update votes_count on user_dossiers
      await supabase
        .from('user_dossiers')
        .update({ votes_count: updatedCount })
        .eq('id', submissionId);
    } catch (voteCloudErr) {
      console.warn('[Contest] Vote sync notice:', voteCloudErr);
    }
  }

  return {
    success: true,
    newVotesCount: updatedCount,
    hasVoted: nextVoted,
  };
};

/**
 * Realtime Subscription for Planet Dossiers & Votes
 */
export const subscribeToPlanetSubmissions = (
  onUpdate: (updatedSubmissions: PlanetSubmission[]) => void
) => {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel('realtime_user_dossiers')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_dossiers' },
      () => {
        // Refresh stored submissions
        const fresh = getStoredPlanetSubmissions();
        onUpdate(fresh);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
