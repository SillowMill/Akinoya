import { supabase, isSupabaseConfigured } from '../lib/supabase';
import twilightWorldImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import visualizerImg from '../assets/images/visualizer_thumbnail.png';
import mushroomValleyImg from '../assets/images/akinoya_mushroom_valley.jpg';
import planetAkinoyaImg from '../assets/images/planet_akinoya_1790852629401.jpg';
import comicCoverImg from '../assets/images/bingaa_comic_cover.jpg';

export interface ShowcaseItem {
  id: string;
  title: string;
  type: 'AUDIO' | '3D_RENDER' | 'DAW_TEMPLATE' | 'CONCEPT_ART' | 'LORE';
  description: string;
  mediaUrl?: string;
  stats?: { plays?: string; views?: string; downloads?: string };
  tags: string[];
  externalUrl?: string;
}

export interface CreatorProfile {
  id: string;
  username: string;
  fullName: string;
  role: 'CREATOR' | 'ANNUAL_PASS' | 'VIP_GUEST' | 'SUBSCRIBER' | 'FREE';
  isArtist: boolean;
  hasVipPass: boolean;
  vipEdition?: string;
  avatarGradient: string;
  headline: string;
  bio: string;
  location: string;
  joinedDate: string;
  likesCount: number;
  socialLinks: {
    twitter?: string;
    instagram?: string;
    soundcloud?: string;
    spotify?: string;
    artstation?: string;
    website?: string;
  };
  skills: string[];
  showcaseItems: ShowcaseItem[];
}

export interface P2PTransmission {
  id: string;
  senderName: string;
  senderEmail?: string;
  recipientUsername: string;
  subject: string;
  transmissionType: 'Collaboration Proposal' | 'Production Inquiry' | 'Stem Request' | 'General Feedback';
  message: string;
  externalLink?: string;
  timestamp: string;
}

export const INITIAL_CREATORS: CreatorProfile[] = [
  {
    id: 'creator-odi',
    username: 'odi',
    fullName: 'Odi S.',
    role: 'CREATOR',
    isArtist: true,
    hasVipPass: true,
    vipEdition: 'Founders Pass (#0)',
    avatarGradient: 'from-amber-400 via-amber-500 to-amber-700',
    headline: 'Syndicate Founder · World Architect & Audio Director',
    bio: 'Lead audio director, modular synthesizer programmer, and creative lead for Planet Äkinoya. Building reactive audio-visual environments and hardware NFC pass integration.',
    location: 'Planet Äkinoya · Sector 0',
    joinedDate: 'Genesis 2026',
    likesCount: 164,
    socialLinks: {
      soundcloud: 'https://soundcloud.com',
      spotify: 'https://spotify.com',
      twitter: 'https://x.com',
      website: 'https://sillowmill.com',
    },
    skills: ['Modular Synthesis', 'Ableton Live 12', 'Unreal Engine 5', 'Stem Mastering', 'Analog Racks'],
    showcaseItems: [
      {
        id: 'sc-odi-1',
        title: 'Äkinoya Atmospheric Master Suite (24-bit 96kHz)',
        type: 'AUDIO',
        description: 'Complete binaural audio master capturing the twin-star sunset over the ionized basalt dunes.',
        mediaUrl: twilightWorldImg,
        stats: { plays: '1.4k', downloads: '382' },
        tags: ['Audio Master', 'Binaural', 'Hardware Synths'],
      },
      {
        id: 'sc-odi-2',
        title: 'Ionized Spires Visualizer Scene (Octane + Blender)',
        type: '3D_RENDER',
        description: 'Procedural crystal formations reacting to sub-frequency impulses. Volumetric emission passes included.',
        mediaUrl: visualizerImg,
        stats: { views: '2.8k', downloads: '419' },
        tags: ['3D Pipeline', 'Octane Render', 'Audio Reactive'],
      },
      {
        id: 'sc-odi-3',
        title: 'Ableton 12 Analog Saturation & Stem Mixing Rack',
        type: 'DAW_TEMPLATE',
        description: 'Custom parallel saturation chain utilized across all official Äkinoya sound design tracks.',
        mediaUrl: mushroomValleyImg,
        stats: { downloads: '540' },
        tags: ['Ableton 12', 'Mix Rack', 'Analog Saturation'],
      },
    ],
  },
  {
    id: 'creator-elena',
    username: 'elena-vance',
    fullName: 'Elena Vance',
    role: 'ANNUAL_PASS',
    isArtist: true,
    hasVipPass: true,
    vipEdition: 'Edition #014 of 100',
    avatarGradient: 'from-cyan-400 via-teal-500 to-emerald-600',
    headline: 'Cinematic Ambient Composer & Sound Sculptor',
    bio: 'Sculpting cinematic drones, Eurorack modular patches, and deep techno sub-bass. Currently scoring chapter atmospheric themes for Äkinoya Syndicate.',
    location: 'Amsterdam / Berlin',
    joinedDate: 'October 2026',
    likesCount: 128,
    socialLinks: {
      spotify: 'https://spotify.com',
      soundcloud: 'https://soundcloud.com',
      instagram: 'https://instagram.com',
    },
    skills: ['Eurorack Modular', 'Bitwig Studio', 'Granular Synthesis', 'Film Scoring'],
    showcaseItems: [
      {
        id: 'sc-elena-1',
        title: 'Twilight World Ambient Score Vol. 1',
        type: 'AUDIO',
        description: 'Four-part meditative ambient movement driven by resonant Buchla 200e modular oscillations.',
        mediaUrl: twilightWorldImg,
        stats: { plays: '890', downloads: '215' },
        tags: ['Modular', 'Ambient', 'Buchla'],
      },
      {
        id: 'sc-elena-2',
        title: 'Bitwig Granular Texture & Drone Project Template',
        type: 'DAW_TEMPLATE',
        description: 'Session template containing 8 granular samplers feeding into infinite reverberation spaces.',
        mediaUrl: planetAkinoyaImg,
        stats: { downloads: '310' },
        tags: ['Bitwig', 'Granular', 'Drone'],
      },
    ],
  },
  {
    id: 'creator-kaelen',
    username: 'kaelen-voss',
    fullName: 'Kaelen Voss',
    role: 'VIP_GUEST',
    isArtist: true,
    hasVipPass: true,
    vipEdition: 'Edition #042 of 100',
    avatarGradient: 'from-purple-500 via-violet-600 to-indigo-700',
    headline: 'Procedural 3D Environment Artist & Houdini Specialist',
    bio: 'Procedural terrain generators, obsidian crystal shaders, and real-time audio-reactive geometry in Houdini and TouchDesigner.',
    location: 'Tokyo / Remote',
    joinedDate: 'October 2026',
    likesCount: 94,
    socialLinks: {
      artstation: 'https://artstation.com',
      twitter: 'https://x.com',
      website: 'https://sillowmill.com',
    },
    skills: ['Houdini', 'TouchDesigner', 'Blender', 'Geometry Nodes', 'ShaderToy'],
    showcaseItems: [
      {
        id: 'sc-kaelen-1',
        title: 'Obsidian Chasm Procedural Terrain Engine',
        type: '3D_RENDER',
        description: 'Fully procedural Houdini HDA allowing real-time displacement based on low-frequency audio stems.',
        mediaUrl: visualizerImg,
        stats: { views: '1.9k', downloads: '260' },
        tags: ['Houdini', 'Procedural', 'Terrain'],
      },
      {
        id: 'sc-kaelen-2',
        title: 'Bioluminescent Canopy 8K Concept Render',
        type: 'CONCEPT_ART',
        description: 'Detailed concept illustration of the twilight forest fungal blooms under Äkinoya binary moonlight.',
        mediaUrl: mushroomValleyImg,
        stats: { views: '3.1k' },
        tags: ['8K Render', 'Concept Art', 'Lighting'],
      },
    ],
  },
  {
    id: 'creator-sora',
    username: 'sora-t',
    fullName: 'Sora Takahashi',
    role: 'SUBSCRIBER',
    isArtist: false,
    hasVipPass: false,
    avatarGradient: 'from-pink-500 via-rose-600 to-amber-600',
    headline: 'Syndicate Lore Archivist & Visual Researcher',
    bio: 'Cataloging Äkinoya canon lore, star-system astronomical navigation, and archival transmissions from the First Arrival expedition.',
    location: 'Sector 4 Orbital Outpost',
    joinedDate: 'October 2026',
    likesCount: 68,
    socialLinks: {
      twitter: 'https://x.com',
      website: 'https://sillowmill.com',
    },
    skills: ['Worldbuilding', 'Canon Timeline', 'Graphic Design', 'Research'],
    showcaseItems: [
      {
        id: 'sc-sora-1',
        title: 'First Arrival Astronomical Star Chart & Translation Codex',
        type: 'LORE',
        description: 'High-resolution PDF translation codex decrypting ancient alien transmissions found at the southern pole.',
        mediaUrl: comicCoverImg,
        stats: { downloads: '450', views: '1.2k' },
        tags: ['Lore Codex', 'Star Chart', 'Canon PDF'],
      },
    ],
  },
];

const LOCAL_CREATORS_KEY = 'akinoya_creators_directory';
const LOCAL_LIKES_KEY = 'akinoya_portfolio_likes_map';
const LOCAL_P2P_KEY = 'akinoya_p2p_transmissions';

// Retrieve all creators with local modifications and dynamic sorting
export const getStoredCreators = (): CreatorProfile[] => {
  if (typeof window === 'undefined') return INITIAL_CREATORS;
  try {
    const raw = localStorage.getItem(LOCAL_CREATORS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_CREATORS_KEY, JSON.stringify(INITIAL_CREATORS));
      return INITIAL_CREATORS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (err) {
    console.warn('[Creators] Error reading cached creators:', err);
  }
  return INITIAL_CREATORS;
};

// Find single creator by username (case-insensitive)
export const getCreatorByUsername = (username: string): CreatorProfile | null => {
  const clean = username.trim().toLowerCase().replace(/^@/, '');
  const creators = getStoredCreators();
  const found = creators.find((c) => c.username.toLowerCase() === clean);
  return found || null;
};

// Check if current user has liked this creator
export const hasUserLikedCreator = (creatorId: string, userId?: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const key = userId ? `like_${creatorId}_${userId}` : `like_${creatorId}_anon`;
    const mapRaw = localStorage.getItem(LOCAL_LIKES_KEY);
    if (mapRaw) {
      const map = JSON.parse(mapRaw);
      return Boolean(map[key]);
    }
  } catch {}
  return false;
};

// Toggle like for creator with persistent storage & optimistic real-time response
export const toggleCreatorLike = async (
  creatorId: string,
  userId?: string
): Promise<{ success: boolean; newLikeCount: number; isLiked: boolean }> => {
  const currentLiked = hasUserLikedCreator(creatorId, userId);
  const nextLiked = !currentLiked;
  const key = userId ? `like_${creatorId}_${userId}` : `like_${creatorId}_anon`;

  // Update localStorage map
  try {
    const mapRaw = localStorage.getItem(LOCAL_LIKES_KEY);
    const map = mapRaw ? JSON.parse(mapRaw) : {};
    if (nextLiked) {
      map[key] = true;
    } else {
      delete map[key];
    }
    localStorage.setItem(LOCAL_LIKES_KEY, JSON.stringify(map));
  } catch {}

  // Update in creators array
  const creators = getStoredCreators();
  let updatedCount = 0;
  const updatedCreators = creators.map((c) => {
    if (c.id === creatorId) {
      const newCount = Math.max(0, c.likesCount + (nextLiked ? 1 : -1));
      updatedCount = newCount;
      return { ...c, likesCount: newCount };
    }
    return c;
  });

  try {
    localStorage.setItem(LOCAL_CREATORS_KEY, JSON.stringify(updatedCreators));
  } catch {}

  // Attempt Supabase database sync if configured and logged in
  if (isSupabaseConfigured && userId) {
    try {
      if (nextLiked) {
        await supabase
          .from('portfolio_likes')
          .insert({ user_id: userId, profile_id: creatorId });
      } else {
        await supabase
          .from('portfolio_likes')
          .delete()
          .match({ user_id: userId, profile_id: creatorId });
      }
    } catch {}
  }

  return {
    success: true,
    newLikeCount: updatedCount,
    isLiked: nextLiked,
  };
};

// Send P2P transmission / message to creator
export const sendP2PTransmission = async (
  data: Omit<P2PTransmission, 'id' | 'timestamp'>
): Promise<{ success: boolean; transmission: P2PTransmission }> => {
  const transmission: P2PTransmission = {
    ...data,
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(LOCAL_P2P_KEY);
    const list: P2PTransmission[] = raw ? JSON.parse(raw) : [];
    list.unshift(transmission);
    localStorage.setItem(LOCAL_P2P_KEY, JSON.stringify(list));
  } catch {}

  return { success: true, transmission };
};

// Retrieve transmissions for a creator
export const getP2PTransmissionsForCreator = (username: string): P2PTransmission[] => {
  if (typeof window === 'undefined') return [];
  try {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    const raw = localStorage.getItem(LOCAL_P2P_KEY);
    if (!raw) return [];
    const list: P2PTransmission[] = raw ? JSON.parse(raw) : [];
    return list.filter((tx) => tx.recipientUsername.toLowerCase() === clean);
  } catch {
    return [];
  }
};

// Automatically attach contest renders and lore to the user's public portfolio (/creators/[username])
export const attachContestSubmissionToCreator = (
  username: string,
  fullName: string,
  submission: {
    id: string;
    planetName: string;
    generatedLore: string;
    renders: {
      hero: string;
      atmosphere: string;
      ecosystem: string;
      landmark: string;
    };
    authorAvatarGradient?: string;
  }
): void => {
  try {
    const clean = (username || 'user').trim().toLowerCase().replace(/^@/, '');
    const creators = getStoredCreators();
    const existingIndex = creators.findIndex((c) => c.username.toLowerCase() === clean);

    const renderShowcaseItem: ShowcaseItem = {
      id: `sc-contest-render-${submission.id}`,
      title: `${submission.planetName} · 4K Environment Render`,
      type: '3D_RENDER',
      description: `Official Worldbuilding Contest Entry. High-resolution planetary terrain visualization generated with Mill AI.`,
      mediaUrl: submission.renders.hero,
      stats: { views: '1', downloads: '0' },
      tags: ['Contest Entry', 'Worldbuilding', '4K Render'],
    };

    const loreShowcaseItem: ShowcaseItem = {
      id: `sc-contest-lore-${submission.id}`,
      title: `${submission.planetName} · Lore Dossier`,
      type: 'LORE',
      description: submission.generatedLore,
      mediaUrl: submission.renders.atmosphere,
      stats: { views: '1' },
      tags: ['Council Ballot', 'Sector Lore', 'Äkinoya 2027'],
    };

    if (existingIndex >= 0) {
      const target = creators[existingIndex];
      // Filter out previous contest entries if re-attaching
      const filteredItems = target.showcaseItems.filter((i) => !i.id.startsWith('sc-contest-'));
      target.showcaseItems = [renderShowcaseItem, loreShowcaseItem, ...filteredItems];
      creators[existingIndex] = target;
    } else {
      // Create new creator profile for this user
      const newCreator: CreatorProfile = {
        id: `creator-${clean}`,
        username: clean,
        fullName: fullName || clean,
        role: 'CREATOR',
        isArtist: true,
        hasVipPass: true,
        vipEdition: 'Worldbuilding Architect',
        avatarGradient: submission.authorAvatarGradient || 'from-cyan-400 via-blue-500 to-indigo-600',
        headline: `World Architect · Creator of ${submission.planetName}`,
        bio: `Syndicate creator and official worldbuilder for Planet Äkinoya. Participating in the 2027 Community Worldbuilding Contest with ${submission.planetName}.`,
        location: 'Planet Äkinoya · Deep Space Orbit',
        joinedDate: 'Contest 2026',
        likesCount: 1,
        socialLinks: {},
        skills: ['Worldbuilding', 'Planetary Architecture', 'Lore Design'],
        showcaseItems: [renderShowcaseItem, loreShowcaseItem],
      };
      creators.push(newCreator);
    }

    localStorage.setItem(LOCAL_CREATORS_KEY, JSON.stringify(creators));
  } catch (err) {
    console.warn('[creators] Error attaching contest submission:', err);
  }
};
