import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Copy,
  Check,
  ArrowLeft,
  AudioWaveform,
  AlertCircle,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { useVipAccess, setDeviceSession } from '../context/VipAccessContext';
import {
  useHolderName,
  getHolderName,
  saveHolderName,
  sanitizeHolderName,
  setExplicitVipRouteActive,
  isValidPassId,
  HOLDER_NAME_MAX_LENGTH,
} from '../utils/holder';

interface AkinoyaPassportVerificationProps {
  tokenIdFromRoute?: string;
  onNavigateHome: () => void;
  onOpenVisualizerHub?: () => void;
}

export const AkinoyaPassportVerification: React.FC<AkinoyaPassportVerificationProps> = ({
  tokenIdFromRoute,
  onNavigateHome,
  onOpenVisualizerHub,
}) => {
  const { unlockVip } = useVipAccess();

  // First-scan claim flow: a holder name is mandatory before the pass is activated
  const holderName = useHolderName();
  const isClaimed = holderName.length > 0;
  const [claimInput, setClaimInput] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const claimNameValid = sanitizeHolderName(claimInput).length > 0;

  // Extract query params: token / id, enc (NTAG 424 DNA dynamic cipher), claim (transfer key)
  const [queryParams, setQueryParams] = useState<{
    token: string;
    enc: string | null;
    cmac: string | null;
    claim: string | null;
  }>(() => {
    if (typeof window === 'undefined') {
      return { token: 'AKN-VIP-2027-X0914', enc: null, cmac: null, claim: null };
    }
    const params = new URLSearchParams(window.location.search);
    const pathToken = window.location.pathname.replace(/^\/verify\/?/, '').replace(/\/+$/, '').trim();
    const token =
      tokenIdFromRoute ||
      pathToken ||
      params.get('token') ||
      params.get('id') ||
      params.get('pass') ||
      'AKN-VIP-2027-X0914';

    return {
      token: token.toUpperCase().replace(/^#/, ''),
      enc: params.get('enc'),
      cmac: params.get('cmac'),
      claim: params.get('claim'),
    };
  });

  const activeToken = queryParams.token || 'AKN-VIP-2027-X0914';

  // Verification state from server
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [isDnaAuthentic, setIsDnaAuthentic] = useState<boolean>(false);
  const [dnaError, setDnaError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('VERIFIED');

  // Pass details
  const [passData, setPassData] = useState<{
    tokenId: string;
    edition: string;
    editionNumber: number;
    sector: string;
    issueDate: string;
    coordinates: string;
    ownerName: string;
    ownerEmail: string | null;
    registeredAt: string | null;
  }>({
    tokenId: `#${activeToken}`,
    edition: '1 of 100',
    editionNumber: 1,
    sector: 'Sector 04 (Leuven Origin)',
    issueDate: '09.01.2027',
    coordinates: "RA 04h 35m / +16° 30'",
    ownerName: 'Founding Holder',
    ownerEmail: null,
    registeredAt: null,
  });

  // UI helpers
  const [copiedToken, setCopiedToken] = useState(false);

  // Registration Form state (inline)
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  // Execute verification against server-side NTAG 424 DNA engine
  const executeVerification = async (token: string, enc: string | null, cmac: string | null) => {
    setIsValidating(true);
    setDnaError(null);

    // Validate the Pass ID parameter
    if (!isValidPassId(token)) {
      setIsDnaAuthentic(false);
      setStatusText('INVALID PASS ID');
      setDnaError('This Pass ID is not recognized. Please use an authentic Äkinoya NFC pass link.');
      soundManager.playError();
      setIsValidating(false);
      return;
    }

    try {
      const res = await fetch('/api/nfc/verify-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          enc: enc || undefined,
          cmac: cmac || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        setIsDnaAuthentic(Boolean(data.isAuthentic));
        setStatusText(data.isAuthentic ? 'AUTHENTIC' : 'VERIFIED');

        if (data.pass) {
          setPassData(data.pass);
          if (data.pass.ownerName) setRegName(data.pass.ownerName);
          if (data.pass.ownerEmail) setRegEmail(data.pass.ownerEmail);
        }

        // Grant persistent VIP access only once the pass is claimed (holder name bound).
        // First-time scans unlock via the mandatory claim form below.
        if (getHolderName()) {
          setExplicitVipRouteActive(true);
          setDeviceSession(token);
          unlockVip(token);
        }
        soundManager.playUnlockChime();

        if (data.isAuthentic) {
          confetti({
            particleCount: 50,
            spread: 50,
            origin: { y: 0.5 },
            colors: ['#22d3ee', '#34d399', '#ffffff'],
          });
        }
      } else {
        // Validation failed or cloned transmission detected!
        setIsDnaAuthentic(false);
        setStatusText('INVALID / CLONED');
        setDnaError(data.message || 'Invalid or cloned transmission detected.');
        soundManager.playError();
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setIsDnaAuthentic(false);
      setStatusText('OFFLINE / RE-TRY');
      setDnaError('Cryptographic gateway unreachable. Please re-try.');
      soundManager.playError();
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    executeVerification(activeToken, queryParams.enc, queryParams.cmac);
  }, [activeToken, queryParams.enc, queryParams.cmac]);

  // Copy token ID
  const handleCopyToken = () => {
    navigator.clipboard?.writeText?.(passData.tokenId);
    setCopiedToken(true);
    soundManager.playTone(880, 0.08);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Submit Holder Registration
  const handleRegisterHolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setRegError('Please provide your name or handle.');
      return;
    }

    setIsRegistering(true);
    setRegError(null);
    soundManager.playTone(660, 0.08);

    try {
      const res = await fetch('/api/nfc/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: activeToken,
          ownerName: regName.trim(),
          ownerEmail: regEmail.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundManager.playUnlockChime();
        setPassData(data.pass);
        saveHolderName(regName);
        setRegSuccess(true);
        setTimeout(() => {
          setRegSuccess(false);
          setShowRegistrationForm(false);
        }, 1800);
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setRegError(err.message || 'Could not bind holder details.');
      soundManager.playError();
    } finally {
      setIsRegistering(false);
    }
  };

  // First-scan mandatory claim: bind holder name & activate pass on this device
  const handleClaimPass = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = sanitizeHolderName(claimInput);
    if (!name) {
      setClaimError('A holder name is required to claim this pass.');
      soundManager.playError();
      return;
    }
    if (dnaError) {
      setClaimError('This pass could not be verified and cannot be claimed.');
      soundManager.playError();
      return;
    }

    setIsClaiming(true);
    setClaimError(null);

    // Device-level claim is the source of truth for the personalized portal
    setExplicitVipRouteActive(true);
    saveHolderName(name);
    setRegName(name);
    setPassData((prev) => ({ ...prev, ownerName: name }));
    setDeviceSession(activeToken);
    unlockVip(activeToken);

    // Best-effort server-side binding (never blocks activation)
    try {
      const res = await fetch('/api/nfc/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activeToken, ownerName: name }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.pass) {
        setPassData({ ...data.pass, ownerName: name });
      }
    } catch (err) {
      console.warn('Holder binding deferred (offline):', err);
    } finally {
      setIsClaiming(false);
    }

    soundManager.playUnlockChime();
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.55 },
      colors: ['#22d3ee', '#34d399', '#ffffff'],
    });
  };

  return (
    <div className="relative z-20 w-full max-w-lg mx-auto px-3 sm:px-4 py-5 sm:py-10 text-white font-sans">
      {/* Top Simple Back Navigation */}
      <div className="flex items-center justify-between mb-3.5 sm:mb-5">
        <button
          onClick={() => {
            if (isClaimed && onOpenVisualizerHub) {
              onOpenVisualizerHub();
            } else {
              onNavigateHome();
            }
          }}
          className="inline-flex items-center gap-2 text-xs font-mono text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-white/50" />
          <span>Back to Portal</span>
        </button>
        <span className="text-[10px] sm:text-[11px] font-mono text-white/30 uppercase tracking-wider">
          Äkinoya 2027
        </span>
      </div>

      {/* Single Streamlined Central Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl bg-[#0a0d14] border border-white/10 p-4 sm:p-7 space-y-4 sm:space-y-5 shadow-2xl"
      >
        {/* Clean Main Title */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 sm:pb-4">
          <div>
            <h1 className="text-lg sm:text-2xl font-display font-bold text-white tracking-wide">
              Official Digital Passport
            </h1>
            <p className="text-[11px] sm:text-xs font-mono text-white/50 mt-1">
              Founding Holder Verification Certificate
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold text-amber-300 bg-amber-950/70 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.9)]" />
            <span>• 100 / 100 CLAIMED</span>
          </span>
        </div>

        {/* Security Warning if Cloned/Invalid */}
        {dnaError && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs font-mono space-y-1">
            <div className="font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>INVALID / CLONED TRANSMISSION DETECTED</span>
            </div>
            <p className="text-[11px] text-rose-200/80 leading-relaxed">
              {dnaError}
            </p>
          </div>
        )}

        {/* Unified Details List (Flat, clean, vertical key-value list) */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase px-1">
            DETAILS
          </div>

          <div className="divide-y divide-white/5 rounded-xl bg-black/40 border border-white/5 px-3 sm:px-4 font-mono text-xs">
            {/* Token ID */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-white/45">ID</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{passData.tokenId}</span>
                <button
                  onClick={handleCopyToken}
                  className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
                  title="Copy Token ID"
                >
                  {copiedToken ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-white/45">STATUS</span>
              <span
                className={`font-semibold ${
                  dnaError ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {dnaError ? 'INVALID / CLONED' : statusText}
              </span>
            </div>

            {/* Edition */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-white/45">EDITION</span>
              <span className="text-white/90 font-medium">{passData.edition}</span>
            </div>

            {/* Holder */}
            {isClaimed ? (
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-white/45">HOLDER</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white font-medium truncate">{holderName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!showRegistrationForm) setRegName(holderName);
                      setShowRegistrationForm(!showRegistrationForm);
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer shrink-0"
                  >
                    {showRegistrationForm ? 'Cancel' : 'Edit'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-3 space-y-2">
                <label
                  htmlFor="holder-claim-name"
                  className="flex items-center justify-between gap-2 text-[10px] tracking-wider"
                >
                  <span className="text-cyan-300 font-bold uppercase tracking-wider">
                    HOLDER NAME REQUIRED TO CLAIM
                  </span>
                  <span className="text-amber-300/90 shrink-0">UNCLAIMED</span>
                </label>
                <input
                  id="holder-claim-name"
                  form="claim-pass-form"
                  type="text"
                  required
                  autoComplete="name"
                  maxLength={HOLDER_NAME_MAX_LENGTH}
                  value={claimInput}
                  disabled={Boolean(dnaError) || isValidating}
                  onChange={(e) => {
                    setClaimInput(e.target.value);
                    if (claimError) setClaimError(null);
                  }}
                  placeholder="Enter your name or handle"
                  className="w-full bg-black border border-white/20 focus:border-cyan-400 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors disabled:opacity-40"
                />
                {claimError && (
                  <div className="text-[11px] text-rose-400">{claimError}</div>
                )}
              </div>
            )}

            {/* Issue Date */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-white/45">ISSUE DATE</span>
              <span className="text-white/80">{passData.issueDate}</span>
            </div>

            {/* Section / Sector */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-white/45">SECTION</span>
              <span className="text-white/80">{passData.sector}</span>
            </div>

            {/* Coordinates */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-white/45">COORDINATES</span>
              <span className="text-white/80">{passData.coordinates}</span>
            </div>
          </div>
        </div>

        {/* Inline Simple Holder Registration Form (if user clicks Edit) */}
        <AnimatePresence>
          {showRegistrationForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleRegisterHolder}
              className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3 font-mono text-xs overflow-hidden"
            >
              <div className="text-[11px] font-bold text-white/70 uppercase">
                Update Holder Name
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Holder name or handle"
                  className="w-full bg-black border border-white/20 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
                />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="w-full bg-black border border-white/20 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              {regError && <div className="text-[11px] text-rose-400">{regError}</div>}
              {regSuccess && <div className="text-[11px] text-emerald-400">Holder details updated.</div>}

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isRegistering ? 'Saving...' : 'Save Holder Name'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Merged Prioritized Button Stack */}
        <div className="space-y-2.5 pt-1">
          {!isClaimed ? (
            <form id="claim-pass-form" onSubmit={handleClaimPass} noValidate className="space-y-2">
              {/* Mandatory first-scan claim — portal entry stays locked until a holder name is bound */}
              <button
                type="submit"
                disabled={!claimNameValid || isClaiming || isValidating || Boolean(dnaError)}
                className="w-full py-3 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.35)] disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {claimNameValid ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>
                  {isValidating
                    ? 'VERIFYING PASS...'
                    : isClaiming
                    ? 'ACTIVATING...'
                    : 'CLAIM & ACTIVATE PASS'}
                </span>
              </button>
              <p className="text-[10px] font-mono text-white/40 text-center">
                Enter a holder name to claim this pass and unlock the portal.
              </p>
            </form>
          ) : (
            <>
          {/* 1. Primary (Glow / Solid Accent): Open Visualizer Hub */}
          <button
            onClick={() => {
              if (onOpenVisualizerHub) {
                onOpenVisualizerHub();
              } else {
                onNavigateHome();
              }
            }}
            className="w-full py-3 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.35)]"
          >
            <AudioWaveform className="w-4 h-4 text-black" />
            <span>Open Visualizer Hub</span>
          </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
