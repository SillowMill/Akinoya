import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Profile, UserRole } from '../lib/supabase';
import { isFounderEmail } from '../lib/vipTokens';
const FOUNDING_PASS_ID = 'AKN-VIP-2027-X0914';

// ─── File Persistence Paths ───────────────────────────────────────────────────
const DATA_DIR = path.resolve(process.cwd(), 'data');
const TMP_DIR = '/tmp';

const LOCAL_USERS_FILE = path.join(DATA_DIR, 'auth_users.json');
const TMP_USERS_FILE = path.join(TMP_DIR, 'sillow_auth_users.json');

const LOCAL_VOTES_FILE = path.join(DATA_DIR, 'votes_store.json');
const TMP_VOTES_FILE = path.join(TMP_DIR, 'sillow_votes_store.json');

const LOCAL_SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions_store.json');
const TMP_SUBMISSIONS_FILE = path.join(TMP_DIR, 'sillow_submissions_store.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface AuthUserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  salt: string;
  passwordHash: string;
  role: UserRole;
  hasVipPass: boolean;
  vipCodeRedeemed?: string | null;
  subscriptionStatus: string;
  isPioneer: boolean;
  pioneerBadge?: string;
  claimedSector?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoteRecord {
  submissionId: string;
  voters: string[]; // List of voter identifiers (userId or email or voterId)
  baselineVotes?: number;
  votesCount: number;
  authorId?: string | null;
  authorEmail?: string | null;
  authorUsername?: string | null;
  updatedAt: string;
}

// In-memory caches synced to disk
interface AuthStore {
  users: Record<string, AuthUserRecord>; // Keyed by lowercase email
}

interface VoteStore {
  votes: Record<string, VoteRecord>; // Keyed by submissionId
}

export interface SubmissionStore {
  submissions: Record<string, any>; // Keyed by submissionId
}

// Secret for HMAC session token signing
const SESSION_SECRET = process.env.AUTH_SECRET || process.env.STRIPE_SECRET_KEY || 'sillow-mill-akinoya-secure-session-secret-2027';

// ─── Storage Helpers ──────────────────────────────────────────────────────────
function loadUsersStore(): AuthStore {
  const candidates = [LOCAL_USERS_FILE, TMP_USERS_FILE];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.users === 'object') {
          return parsed;
        }
      } catch {}
    }
  }
  return { users: {} };
}

function saveUsersStore(store: AuthStore): void {
  const json = JSON.stringify(store, null, 2);
  const targets = [LOCAL_USERS_FILE, TMP_USERS_FILE];
  for (const file of targets) {
    try {
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, json, 'utf8');
    } catch {}
  }
}

function loadVotesStore(): VoteStore {
  const candidates = [LOCAL_VOTES_FILE, TMP_VOTES_FILE];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.votes === 'object') {
          return parsed;
        }
      } catch {}
    }
  }
  return { votes: {} };
}

function saveVotesStore(store: VoteStore): void {
  const json = JSON.stringify(store, null, 2);
  const targets = [LOCAL_VOTES_FILE, TMP_VOTES_FILE];
  for (const file of targets) {
    try {
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, json, 'utf8');
    } catch {}
  }
}

function loadSubmissionsStore(): SubmissionStore {
  const candidates = [LOCAL_SUBMISSIONS_FILE, TMP_SUBMISSIONS_FILE];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.submissions === 'object') {
          return parsed;
        }
      } catch {}
    }
  }
  return { submissions: {} };
}

function saveSubmissionsStore(store: SubmissionStore): void {
  const json = JSON.stringify(store, null, 2);
  const targets = [LOCAL_SUBMISSIONS_FILE, TMP_SUBMISSIONS_FILE];
  for (const file of targets) {
    try {
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, json, 'utf8');
    } catch {}
  }
}

let _userStore: AuthStore = loadUsersStore();
let _voteStore: VoteStore = loadVotesStore();
let _submissionsStore: SubmissionStore = loadSubmissionsStore();

// ─── Submissions Operations ───────────────────────────────────────────────────
export function saveSubmissionRecord(sub: any): { success: boolean; submission: any } {
  if (!sub || !sub.id) {
    return { success: false, submission: sub };
  }
  _submissionsStore = loadSubmissionsStore();
  _submissionsStore.submissions[sub.id] = sub;
  saveSubmissionsStore(_submissionsStore);

  // Initialize or anchor author in votes store to enforce self-voting prevention permanently
  _voteStore = loadVotesStore();
  const existingVote = _voteStore.votes[sub.id];
  const authorEmail = (sub.authorEmail || sub.humanAnswers?.email || '').trim().toLowerCase();
  const authorUsername = (sub.authorUsername || '').trim().toLowerCase().replace(/^@/, '');
  const authorId = sub.userId || null;

  if (existingVote) {
    if (authorId) existingVote.authorId = authorId;
    if (authorEmail) existingVote.authorEmail = authorEmail;
    if (authorUsername) existingVote.authorUsername = authorUsername;
    existingVote.updatedAt = new Date().toISOString();
    _voteStore.votes[sub.id] = existingVote;
  } else {
    _voteStore.votes[sub.id] = {
      submissionId: sub.id,
      voters: [],
      baselineVotes: sub.id === 'planet-amlemi-genesis-01' ? 3 : 1,
      votesCount: sub.id === 'planet-amlemi-genesis-01' ? 3 : Math.max(1, sub.votesCount || 1),
      authorId,
      authorEmail: authorEmail || null,
      authorUsername: authorUsername || null,
      updatedAt: new Date().toISOString(),
    };
  }
  saveVotesStore(_voteStore);

  return { success: true, submission: sub };
}

export function getAllSubmissionRecords(): any[] {
  _submissionsStore = loadSubmissionsStore();
  return Object.values(_submissionsStore.submissions || {});
}

// ─── Password Cryptography ───────────────────────────────────────────────────
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const derivedHash = crypto.scryptSync(password, salt, 64);
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    return crypto.timingSafeEqual(derivedHash, expectedBuf);
  } catch {
    return false;
  }
}

// ─── Session Token Management ─────────────────────────────────────────────────
export function createSessionToken(userId: string, email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
  const payload = Buffer.from(JSON.stringify({ sub: userId, email, exp })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifySessionToken(token: string): { valid: boolean; userId?: string; email?: string } {
  if (!token || typeof token !== 'string') return { valid: false };
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false };

  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false };
    }
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false }; // Expired
    }
    return { valid: true, userId: data.sub, email: data.email };
  } catch {
    return { valid: false };
  }
}

// ─── User Profile Transformer ─────────────────────────────────────────────────
function recordToProfile(u: AuthUserRecord): Profile {
  return {
    id: u.id,
    first_name: u.firstName,
    last_name: u.lastName,
    full_name: u.fullName,
    email: u.email,
    role: u.role,
    has_vip_pass: u.hasVipPass,
    subscription_status: u.subscriptionStatus,
    vip_code_redeemed: u.vipCodeRedeemed || null,
    is_vip: u.hasVipPass || u.role === 'VIP_GUEST' || u.role === 'CREATOR',
    is_subscriber: u.subscriptionStatus === 'active' || u.role === 'SUBSCRIBER' || u.role === 'ANNUAL_PASS' || u.role === 'CREATOR',
    is_pioneer: u.isPioneer,
    pioneer_badge: u.pioneerBadge || '[PIONEER-2027]',
    claimed_sector: u.claimedSector || null,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
  };
}

// ─── Authentication Operations ────────────────────────────────────────────────
export async function registerUserCredentials(params: {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  role?: UserRole;
  passCode?: string;
}): Promise<{ success: boolean; user?: any; profile?: Profile; sessionToken?: string; error?: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanFirst = params.firstName.trim();
  const cleanLast = (params.lastName || '').trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!params.password || params.password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
  }
  if (!cleanFirst) {
    return { success: false, error: 'First name is required.' };
  }

  _userStore = loadUsersStore();

  if (_userStore.users[cleanEmail]) {
    return { success: false, error: 'An account with this email already exists. Please sign in.' };
  }

  const { salt, hash } = hashPassword(params.password);
  const isFounder = isFounderEmail(cleanEmail);
  const role: UserRole = isFounder ? 'CREATOR' : params.role || 'FREE';
  const hasVipPass = Boolean(isFounder || role === 'VIP_GUEST' || role === 'CREATOR' || params.passCode);
  const now = new Date().toISOString();
  const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  const newRecord: AuthUserRecord = {
    id: userId,
    email: cleanEmail,
    firstName: cleanFirst,
    lastName: cleanLast,
    fullName: `${cleanFirst} ${cleanLast}`.trim(),
    salt,
    passwordHash: hash,
    role,
    hasVipPass,
    vipCodeRedeemed: isFounder ? FOUNDING_PASS_ID : params.passCode || null,
    subscriptionStatus: isFounder ? 'active' : 'inactive',
    isPioneer: true,
    pioneerBadge: '[PIONEER-2027]',
    claimedSector: isFounder ? 'Ämlemi' : null,
    createdAt: now,
    updatedAt: now,
  };

  _userStore.users[cleanEmail] = newRecord;
  saveUsersStore(_userStore);

  const profile = recordToProfile(newRecord);
  const sessionToken = createSessionToken(newRecord.id, newRecord.email);
  const user = {
    id: newRecord.id,
    email: newRecord.email,
    user_metadata: {
      first_name: newRecord.firstName,
      last_name: newRecord.lastName,
      full_name: newRecord.fullName,
    },
  };

  return {
    success: true,
    user,
    profile,
    sessionToken,
  };
}

export async function loginUserCredentials(
  email: string,
  password: string
): Promise<{ success: boolean; user?: any; profile?: Profile; sessionToken?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!password) {
    return { success: false, error: 'Please enter your password.' };
  }

  _userStore = loadUsersStore();
  const existing = _userStore.users[cleanEmail];

  if (!existing) {
    return { success: false, error: 'Invalid email or password.' };
  }

  const isMatch = verifyPassword(password, existing.salt, existing.passwordHash);
  if (!isMatch) {
    return { success: false, error: 'Invalid email or password.' };
  }

  const profile = recordToProfile(existing);
  const sessionToken = createSessionToken(existing.id, existing.email);
  const user = {
    id: existing.id,
    email: existing.email,
    user_metadata: {
      first_name: existing.firstName,
      last_name: existing.lastName,
      full_name: existing.fullName,
    },
  };

  return {
    success: true,
    user,
    profile,
    sessionToken,
  };
}

export async function getUserFromSessionToken(
  token: string
): Promise<{ success: boolean; user?: any; profile?: Profile; error?: string }> {
  const verified = verifySessionToken(token);
  if (!verified.valid || !verified.email) {
    return { success: false, error: 'Invalid or expired session token.' };
  }

  _userStore = loadUsersStore();
  const existing = _userStore.users[verified.email.toLowerCase()];
  if (!existing) {
    return { success: false, error: 'User record not found.' };
  }

  return {
    success: true,
    user: {
      id: existing.id,
      email: existing.email,
      user_metadata: {
        first_name: existing.firstName,
        last_name: existing.lastName,
        full_name: existing.fullName,
      },
    },
    profile: recordToProfile(existing),
  };
}

// ─── Voting & Self-Vote Prevention ────────────────────────────────────────────
export function castSubmissionVote(params: {
  submissionId: string;
  voterId: string;
  voterEmail?: string;
  voterUsername?: string;
  submissionAuthorId?: string;
  submissionAuthorEmail?: string;
  submissionAuthorUsername?: string;
  baseVotes?: number;
}): { success: boolean; newVotesCount: number; hasVoted: boolean; error?: string } {
  const {
    submissionId,
    voterId,
    voterEmail,
    voterUsername,
    submissionAuthorId,
    submissionAuthorEmail,
    submissionAuthorUsername,
    baseVotes,
  } = params;

  if (!submissionId) {
    return { success: false, newVotesCount: 1, hasVoted: false, error: 'Missing submission ID.' };
  }
  if (!voterId) {
    return { success: false, newVotesCount: 1, hasVoted: false, error: 'Voter identification required.' };
  }

  _voteStore = loadVotesStore();
  _submissionsStore = loadSubmissionsStore();

  const storedSub = _submissionsStore.submissions[submissionId];
  const existingVote = _voteStore.votes[submissionId] || {
    submissionId,
    voters: [],
    baselineVotes: submissionId === 'planet-amlemi-genesis-01' ? 3 : 1,
    votesCount: submissionId === 'planet-amlemi-genesis-01' ? 3 : Math.max(1, baseVotes || 1),
    authorId: submissionAuthorId || storedSub?.userId || null,
    authorEmail: submissionAuthorEmail || storedSub?.authorEmail || storedSub?.humanAnswers?.email || null,
    authorUsername: submissionAuthorUsername || storedSub?.authorUsername || null,
    updatedAt: new Date().toISOString(),
  };

  // ─── Strict Self-Vote Prevention ──────────────────────────────────────────
  const cleanVoterEmail = voterEmail?.trim().toLowerCase();
  const cleanAuthorEmail = (
    submissionAuthorEmail ||
    existingVote.authorEmail ||
    storedSub?.authorEmail ||
    storedSub?.humanAnswers?.email ||
    ''
  ).trim().toLowerCase();

  const cleanVoterUser = voterUsername?.trim().toLowerCase().replace(/^@/, '');
  const cleanAuthorUser = (
    submissionAuthorUsername ||
    existingVote.authorUsername ||
    storedSub?.authorUsername ||
    ''
  ).trim().toLowerCase().replace(/^@/, '');

  const effectiveAuthorId = submissionAuthorId || existingVote.authorId || storedSub?.userId;

  const isSelfById = Boolean(effectiveAuthorId && voterId && effectiveAuthorId === voterId);
  const isSelfByEmail = Boolean(cleanVoterEmail && cleanAuthorEmail && cleanVoterEmail === cleanAuthorEmail);
  const isSelfByUsername = Boolean(cleanVoterUser && cleanAuthorUser && cleanVoterUser === cleanAuthorUser);

  if (isSelfById || isSelfByEmail || isSelfByUsername) {
    return {
      success: false,
      newVotesCount: existingVote.votesCount || baseVotes || 1,
      hasVoted: false,
      error: 'Self-voting blocked: You cannot vote for your own world submission.',
    };
  }

  // Define voter match predicate
  const isVoterMatch = (entry: string) => {
    if (!entry) return false;
    if (entry === voterId || entry === `id:${voterId}`) return true;
    if (cleanVoterEmail && (entry === cleanVoterEmail || entry === `email:${cleanVoterEmail}`)) return true;
    return false;
  };

  const hasAlreadyVoted = existingVote.voters.some(isVoterMatch);
  let hasVoted = false;

  if (hasAlreadyVoted) {
    // Un-vote: purge all matching keys for this voter
    existingVote.voters = existingVote.voters.filter((v) => !isVoterMatch(v));
    hasVoted = false;
  } else {
    // Cast vote: add single canonical key for this voter
    const canonicalKey = cleanVoterEmail ? `email:${cleanVoterEmail}` : `id:${voterId}`;
    existingVote.voters.push(canonicalKey);
    hasVoted = true;
  }

  // Calculate clean, deterministic vote count
  const isAmlemi = submissionId === 'planet-amlemi-genesis-01';
  const baseline = isAmlemi ? 3 : (existingVote.baselineVotes || 1);
  existingVote.baselineVotes = baseline;

  const calculatedVotes = baseline + existingVote.voters.length;
  existingVote.votesCount = calculatedVotes;
  existingVote.updatedAt = new Date().toISOString();

  if (submissionAuthorId) existingVote.authorId = submissionAuthorId;
  if (cleanAuthorEmail) existingVote.authorEmail = cleanAuthorEmail;
  if (cleanAuthorUser) existingVote.authorUsername = cleanAuthorUser;

  _voteStore.votes[submissionId] = existingVote;
  saveVotesStore(_voteStore);

  return {
    success: true,
    newVotesCount: calculatedVotes,
    hasVoted,
  };
}

export function getVotesSummary(voterId?: string, voterEmail?: string): {
  votesCountByDossier: Record<string, number>;
  userVotedIds: string[];
} {
  _voteStore = loadVotesStore();
  const cleanVoterEmail = voterEmail?.trim().toLowerCase();

  const isVoterMatch = (entry: string) => {
    if (!entry) return false;
    if (voterId && (entry === voterId || entry === `id:${voterId}`)) return true;
    if (cleanVoterEmail && (entry === cleanVoterEmail || entry === `email:${cleanVoterEmail}`)) return true;
    return false;
  };

  const votesCountByDossier: Record<string, number> = {};
  const userVotedIds: string[] = [];

  for (const [subId, record] of Object.entries(_voteStore.votes)) {
    votesCountByDossier[subId] = record.votesCount;
    if (record.voters.some(isVoterMatch)) {
      userVotedIds.push(subId);
    }
  }

  // Ensure Ämlemi default baseline of at least 3
  if (votesCountByDossier['planet-amlemi-genesis-01'] === undefined) {
    votesCountByDossier['planet-amlemi-genesis-01'] = 3;
  }

  return { votesCountByDossier, userVotedIds };
}
