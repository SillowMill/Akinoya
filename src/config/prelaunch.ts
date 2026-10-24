/**
 * EMERGENCY FAL.AI COST PROTECTION — client-side pre-launch lock (fail-closed).
 *
 * While locked, no component sends image / video / SFX generation requests at all.
 * Questionnaire answers are still saved (Supabase/local + Pre-Launch Google Sheet)
 * and users see the standard pre-launch message.
 *
 * Re-enable only together with the server switch:
 *   client: VITE_FAL_GENERATION_ENABLED=true   server: FAL_GENERATION_ENABLED=true
 * (The server kill switch in src/server/falKillSwitch.ts is the authoritative guard.)
 */
export const PRELAUNCH_GENERATION_LOCKED =
  String((import.meta as any).env?.VITE_FAL_GENERATION_ENABLED || '').trim().toLowerCase() !== 'true';

export const PRELAUNCH_MESSAGE = 'Your world will be available on the ninth of January.';
