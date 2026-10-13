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

export const MOCK_PLANET_IDS = new Set([
  'PLN-2027-AKINOYA-PRIME',
  'PLN-2027-AMLEMIE',
  'PLN-2027-ALKAN-IV',
  'PLN-2027-ASPER-7',
  'PLN-2027-ATHERIS-IX',
  'PLN-2027-AVORIA-DELTA',
  'PLN-2027-ZEPHYR',
  'PLN-2027-AURA',
  'PLN-2027-CRYO',
]);

export const INITIAL_SUBMISSIONS: PlanetSubmission[] = [];

// Retrieve all stored planet submissions (purges obsolete mocks and enforces Ä rule)
export const getStoredPlanetSubmissions = (): PlanetSubmission[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    if (raw) {
      const parsed: PlanetSubmission[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((p) => p && p.id && !MOCK_PLANET_IDS.has(p.id))
          .map((sub) => ({
            ...sub,
            planetName: formatAkinoyaPlanetName(sub.planetName),
            renders: {
              hero: sub.renders?.hero || planetHeroImg,
              flora: sub.renders?.flora || sub.renders?.ecosystem || mushroomValleyImg,
              fauna: sub.renders?.fauna || twilightWorldImg,
              atmosphere: sub.renders?.atmosphere || heroBgImg,
              landmark: sub.renders?.landmark || visualizerThumbnailImg,
              ecosystem: sub.renders?.ecosystem || sub.renders?.flora || mushroomValleyImg,
            },
          }));
      }
    }
  } catch (err) {
    console.warn('[Contest] Error reading stored submissions:', err);
  }
  return [];
};

/**
 * Asynchronously fetches live submissions from Supabase user_dossiers
 */
export const fetchPlanetSubmissions = async (): Promise<PlanetSubmission[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('user_dossiers')
        .select('*')
        .order('votes_count', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const live: PlanetSubmission[] = data.map((d: any) => ({
          id: d.id,
          userId: d.user_id,
          authorName: d.author_name || 'Anonymous Creator',
          authorUsername: d.author_username || 'creator',
          authorEmail: d.author_email || '',
          authorAvatarGradient: d.author_avatar_gradient || 'from-amber-400 to-amber-600',
          planetName: formatAkinoyaPlanetName(d.planet_name),
          atmosphere: d.atmosphere || '',
          flora: d.flora || '',
          fauna: d.fauna || '',
          sonicVibe: d.sonic_vibe || '',
          visualAesthetic: d.visual_aesthetic || '',
          landmark: d.landmark || '',
          additionalNotes: d.additional_notes || '',
          humanAnswers: d.human_answers || {},
          generatedLore: d.generated_lore || '',
          renders: d.renders || {
            hero: planetHeroImg,
            flora: mushroomValleyImg,
            fauna: twilightWorldImg,
            atmosphere: heroBgImg,
            landmark: visualizerThumbnailImg,
            ecosystem: mushroomValleyImg,
          },
          votesCount: d.votes_count || 1,
          status: (d.status as any) || 'PUBLISHED',
          createdAt: d.created_at || new Date().toISOString(),
          votingDeadline: 'June 30, 2027',
        }));

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(live));
          } catch {}
        }
        return live;
      }
    } catch (err) {
      console.warn('[Contest] fetchPlanetSubmissions exception:', err);
    }
  }

  return getStoredPlanetSubmissions();
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

export const fetchUserContestSubmission = async (userId?: string, email?: string): Promise<PlanetSubmission | null> => {
  const localMatch = getUserContestSubmission(userId, email);
  if (localMatch) return localMatch;

  if (isSupabaseConfigured && (userId || email)) {
    try {
      let query = supabase.from('user_dossiers').select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (email) {
        query = query.ilike('author_email', email);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        const sub: PlanetSubmission = {
          id: data.id,
          userId: data.user_id,
          authorName: data.author_name || 'Anonymous Creator',
          authorUsername: data.author_username || 'creator',
          authorEmail: data.author_email || '',
          authorAvatarGradient: data.author_avatar_gradient || 'from-amber-400 to-amber-600',
          planetName: formatAkinoyaPlanetName(data.planet_name),
          atmosphere: data.atmosphere || '',
          flora: data.flora || '',
          fauna: data.fauna || '',
          sonicVibe: data.sonic_vibe || '',
          visualAesthetic: data.visual_aesthetic || '',
          landmark: data.landmark || '',
          additionalNotes: data.additional_notes || '',
          humanAnswers: data.human_answers || {},
          generatedLore: data.generated_lore || '',
          renders: data.renders || {},
          votesCount: data.votes_count || 1,
          status: (data.status as any) || 'PUBLISHED',
          createdAt: data.created_at || new Date().toISOString(),
          votingDeadline: 'June 30, 2027',
        };
        try {
          const existing = getStoredPlanetSubmissions();
          const updated = [sub, ...existing.filter((s) => s.id !== sub.id)];
          localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updated));
        } catch {}
        return sub;
      }
    } catch (err) {
      console.warn('[Contest] fetchUserContestSubmission exception:', err);
    }
  }

  return null;
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

export interface PlanetComment {
  id: string;
  planetId: string;
  authorName: string;
  authorUsername: string;
  text: string;
  createdAt: string;
}

export const getPlanetComments = (planetId: string): PlanetComment[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`akinoya_planet_comments_${planetId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: `comm-1-${planetId}`,
      planetId,
      authorName: 'Akinoya Lore Scout',
      authorUsername: 'lorescout',
      text: 'The atmospheric resonance in this sector feels straight out of the Sillow Mill pilot episode! Voted +1.',
      createdAt: '2 hours ago',
    },
    {
      id: `comm-2-${planetId}`,
      planetId,
      authorName: 'Nova Architect',
      authorUsername: 'nova_arch',
      text: 'Exquisite color palette. The bioluminescent flora composition is incredible.',
      createdAt: '5 hours ago',
    },
  ];
};

export const addPlanetComment = (
  planetId: string,
  comment: Omit<PlanetComment, 'id' | 'createdAt'>
): PlanetComment[] => {
  const existing = getPlanetComments(planetId);
  const newComment: PlanetComment = {
    ...comment,
    id: `comm-${Date.now()}`,
    createdAt: 'Just now',
  };
  const updated = [newComment, ...existing];
  try {
    localStorage.setItem(`akinoya_planet_comments_${planetId}`, JSON.stringify(updated));
  } catch {}
  return updated;
};
