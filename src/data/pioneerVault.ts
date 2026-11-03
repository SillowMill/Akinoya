/**
 * PIONEER VAULT & LOUNGE — SINGLE SOURCE OF TRUTH
 * ------------------------------------------------
 * This is the ONLY file Odi needs to edit to run the Pioneer Lounge (asynchronous, ~1 hour/week).
 *
 * WEEKLY ROUTINE (≈ 1 hour):
 *   1. Review new #community-feedback submissions and pin 1–3 standouts in FEATURED_FEEDBACK.
 *   2. (Optional) Add a short note to ANNOUNCEMENTS.
 *
 * MONTHLY DROP (once per month):
 *   1. Upload the files (Drive / Dropbox / etc.) and paste the share link into the matching
 *      DROP_SCHEDULE entry (`downloadUrl`). The drop goes live automatically on `releaseDate`.
 *   2. Add one entry to ANNOUNCEMENTS.
 *
 * No real-time moderation, no 24/7 chat. Quality over quantity.
 */

export const PIONEER_MEMBERSHIP = {
  name: 'Pioneer Membership',
  pricePerYear: 60,
  pricePerMonthEquivalent: 5,
  launchDate: '2027-01-09',
};

export const LOUNGE_WELCOME = {
  title: 'Welcome to the Pioneer Lounge',
  message:
    'The Pioneer Community is an exclusive lounge, not a busy chatbox. Here we drop quality over quantity, every month.',
  rules: [
    'One curated drop per month: acapellas, presets, breakdowns, concept art and listening sessions.',
    'Share your remixes and creations in #community-feedback. One submission per day keeps the signal high.',
    'Odi reviews submissions weekly and pins standout work. No real-time chat, no notification spam.',
    'Respect the work: downloads are for personal and remix use only, not for resale.',
  ],
};

export type LoungeChannelId = 'announcements' | 'the-vault' | 'community-feedback';

export const LOUNGE_CHANNELS: { id: LoungeChannelId; name: string; description: string }[] = [
  {
    id: 'announcements',
    name: 'announcements',
    description: 'Official drops and updates from Odi Selis',
  },
  {
    id: 'the-vault',
    name: 'the-vault',
    description: 'Direct downloads: acapellas, presets and art books',
  },
  {
    id: 'community-feedback',
    name: 'community-feedback',
    description: 'Share your own remixes and creations',
  },
];

/* ─────────────────────────── PRICING (THE VAULT) ─────────────────────────── */

export interface VaultProduct {
  id: string;
  name: string;
  subtitle?: string;
  /** Display range for non-members, e.g. "€ 19.99 – € 24.99" */
  priceRangeLabel: string;
  /** Typical separate price used in the value-stack comparison */
  listPrice: number;
  memberLabel: string;
  memberNote?: string;
  /** Digital products count towards the "bought separately" total */
  isDigital: boolean;
  kind: 'audio' | 'production' | 'artbook' | 'comic';
}

export const VAULT_PRODUCTS: VaultProduct[] = [
  {
    id: 'vocal-acapella-remix-pack',
    name: 'Vocal Acapella & Remix Pack',
    subtitle: 'Studio Acapellas of the whole "Dream of Akainoya" tracklist.',
    priceRangeLabel: '€ 19.99 – € 24.99',
    listPrice: 22.99,
    memberLabel: 'FREE',
    memberNote: 'Included',
    isDigital: true,
    kind: 'audio',
  },
  {
    id: 'production-workflow-assets',
    name: '2D Visualizer Production & Logic Pro Assets',
    subtitle: 'Visualizer workflow, vocal chain & Logic Pro template',
    priceRangeLabel: '€ 29.99 – € 39.99',
    listPrice: 34.99,
    memberLabel: 'FREE',
    memberNote: 'Included',
    isDigital: true,
    kind: 'production',
  },
  {
    id: 'digital-art-book',
    name: 'Digital Art Book & Storyboard PDF',
    priceRangeLabel: '€ 9.99 – € 14.99',
    listPrice: 12.99,
    memberLabel: 'FREE',
    memberNote: 'Digital download',
    isDigital: true,
    kind: 'artbook',
  },
  {
    id: 'bingaa-comic-physical',
    name: "The Comic 'Bingäa' (Physical)",
    priceRangeLabel: '€ 14.99',
    listPrice: 14.99,
    memberLabel: '€ 14.99',
    memberNote: '+ Exclusive Signed Bookmark',
    isDigital: false,
    kind: 'comic',
  },
];

export const getSeparateDigitalTotal = (): number =>
  VAULT_PRODUCTS.filter((p) => p.isDigital).reduce((sum, p) => sum + p.listPrice, 0);

export const formatEuro = (value: number): string =>
  `€ ${value.toFixed(2)}`;

/* ─────────────────────── CONTENT ROTATION (MONTHLY DROPS) ─────────────────────── */

export interface PioneerDrop {
  id: string;
  month: number;
  title: string;
  description: string;
  /** ISO date (YYYY-MM-DD). The drop unlocks automatically for members from this date. */
  releaseDate: string;
  kind: 'audio' | 'video' | 'art' | 'session';
  /** Paste the share link here when the files are ready. Leave empty until then. */
  downloadUrl?: string;
  /** Optional: internal Drive Vault folder to open instead of an external link */
  vaultFolderId?: string;
}

export const DROP_SCHEDULE: PioneerDrop[] = [
  {
    id: 'drop-01-acapella-pack',
    month: 1,
    title: 'Vocal Acapella Pack',
    description: 'Dry and wet acapellas of Track 1 & 2 from the EP, ready to remix.',
    releaseDate: '2027-01-09',
    kind: 'audio',
    vaultFolderId: 'folder-03',
  },
  {
    id: 'drop-02-workflow-breakdown',
    month: 2,
    title: 'Workflow Breakdown Screencast',
    description: '10-minute screencast: vocal chains and synth presets, including the preset files.',
    releaseDate: '2027-02-09',
    kind: 'video',
  },
  {
    id: 'drop-03-concept-art',
    month: 3,
    title: 'Early Concept Art & Unreleased Sketches',
    description: 'First look at concept art and sketches from the follow-up comic.',
    releaseDate: '2027-03-09',
    kind: 'art',
  },
  {
    id: 'drop-04-listening-session',
    month: 4,
    title: 'Pioneer-Only Listening Session',
    description: 'Exclusive listening session or demo leak, for Pioneers only.',
    releaseDate: '2027-04-09',
    kind: 'session',
  },
];

export const isDropLive = (drop: PioneerDrop, now: Date = new Date()): boolean =>
  now.getTime() >= new Date(`${drop.releaseDate}T00:00:00`).getTime();

/* ───────────────────────────── ANNOUNCEMENTS ───────────────────────────── */

export interface LoungeAnnouncement {
  id: string;
  date: string;
  title: string;
  body: string;
  pinned?: boolean;
}

export const ANNOUNCEMENTS: LoungeAnnouncement[] = [
  {
    id: 'ann-launch',
    date: '2027-01-09',
    title: 'The Pioneer Lounge opens on January 9, 2027',
    body:
      'Pioneer Membership (€60/year) unlocks the complete Vault: the Vocal Acapella & Remix Pack, all Production & Workflow Assets and the Digital Art Book. Plus one new drop every month.',
    pinned: true,
  },
];

/* ─────────────────────────── FEATURED FEEDBACK ─────────────────────────── */

export interface FeaturedFeedback {
  id: string;
  author: string;
  title: string;
  url: string;
  note?: string;
}

/** Odi pins standout community remixes/creations here during the weekly review. */
export const FEATURED_FEEDBACK: FeaturedFeedback[] = [];
