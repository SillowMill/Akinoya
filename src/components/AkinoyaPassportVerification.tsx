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
  Download,
  Mail,
  User,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { useVipAccess, setDeviceSession, getOrCreateDeviceId } from '../context/VipAccessContext';
import {
  useHolderName,
  getHolderName,
  saveHolderName,
  sanitizeHolderName,
  setExplicitVipRouteActive,
  isValidPassId,
  HOLDER_NAME_MAX_LENGTH,
} from '../utils/holder';
import { CertificateOfAuthenticity } from './CertificateOfAuthenticity';
import {
  BingaaCertificate,
  useCertificate,
  saveCertificate,
  getMasterCertificate,
  downloadCertificatePng,
  deriveEditionNumber,
  TOTAL_EDITION_LIMIT,
} from '../utils/certificate';

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

  // Extract query params: token / id, enc (NTAG 424 DNA dynamic cipher), claim (transfer key)
  const [queryParams] = useState<{
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
  const isMaster = activeToken === 'AKN-VIP-2027-X0914';
  const derivedEdition = deriveEditionNumber(activeToken);

  // Per-pass stored holder name and certificate (isolated per Pass ID)
  const localStoredName = useHolderName(activeToken);
  const localStoredCert = useCertificate(activeToken);

  // Claim Form inputs (for unassigned passes)
  const [claimName, setClaimName] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  // Verification state from server
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [isDnaAuthentic, setIsDnaAuthentic] = useState<boolean>(false);
  const [dnaError, setDnaError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>(
    isMaster ? 'MASTER FOUNDER ORIGINAL' : 'VERIFIED ORIGINAL'
  );

  // Pass details
  const [passData, setPassData] = useState<{
    tokenId: string;
    edition: string;
    editionNumber: number;
    origin: string;
    issueDate: string;
    coordinates: string;
    status: string;
    ownerName: string;
    ownerEmail: string | null;
    isClaimed: boolean;
    registeredAt: string | null;
    certificate?: BingaaCertificate | null;
  }>({
    tokenId: `#${activeToken}`,
    edition: isMaster ? 'Founders Pass (#0)' : `${derivedEdition} of 100`,
    editionNumber: derivedEdition,
    origin: 'Genesis Archive (Leuven Origin)',
    issueDate: '09.01.2027',
    coordinates: "RA 04h 35m / +16° 30'",
    status: isMaster ? 'MASTER FOUNDER ORIGINAL' : 'UNASSIGNED / READY TO CLAIM',
    ownerName: isMaster ? 'Odi Selis' : (localStoredName || ''),
    ownerEmail: isMaster ? 'odi.selis3@gmail.com' : null,
    isClaimed: isMaster || Boolean(localStoredName || localStoredCert),
    registeredAt: isMaster ? '2026-10-09T00:00:00.000Z' : null,
    certificate: isMaster ? getMasterCertificate() : localStoredCert,
  });

  // UI helpers
  const [copiedToken, setCopiedToken] = useState(false);

  // Determine if this pass is officially claimed
  const isClaimed =
    isMaster ||
    Boolean(passData.isClaimed && passData.ownerName && passData.ownerName.trim().length > 0) ||
    Boolean(localStoredCert && localStoredCert.holderName && localStoredCert.holderName.trim().length > 0) ||
    Boolean(localStoredName && localStoredName.trim().length > 0);

  const activeHolderName = isMaster
    ? 'Odi Selis'
    : (passData.ownerName || localStoredCert?.holderName || localStoredName || '');

  const activeCertificate: BingaaCertificate =
    localStoredCert ||
    passData.certificate ||
    (isMaster
      ? getMasterCertificate()
      : {
          certificateId: `COA-BNG1-${String(passData.editionNumber).padStart(3, '0')}-VERIFIED`,
          title: 'CERTIFICATE OF AUTHENTICITY — BINGÄA ISSUE #1',
          passId: activeToken,
          holderName: activeHolderName || 'Founding VIP Member',
          editionNumber: passData.editionNumber,
          editionTotal: TOTAL_EDITION_LIMIT,
          status: 'OFFICIALLY VERIFIED',
          emailVerified: true,
          claimedAt: passData.registeredAt || '2026-10-09T00:00:00.000Z',
          signatureAlgorithm: 'HMAC-SHA256',
          signature: 'Sillow Mill · Creative Syndicate',
        });

  // Execute verification against server-side NTAG engine
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
        setStatusText(data.isAuthentic ? 'AUTHENTIC' : (isMaster ? 'MASTER FOUNDER ORIGINAL' : 'VERIFIED'));

        if (data.pass) {
          const pass = data.pass;
          setPassData((prev) => ({
            ...prev,
            ...pass,
            ownerName: isMaster ? 'Odi Selis' : (pass.ownerName || prev.ownerName),
            isClaimed: isMaster ? true : (Boolean(pass.isClaimed && pass.ownerName) || prev.isClaimed),
          }));

          if (pass.certificate) {
            saveCertificate(pass.certificate);
          }
          if (pass.ownerName && !isMaster) {
            saveHolderName(pass.ownerName, token);
          }
        }

        // Grant persistent VIP access only once the pass is claimed
        if (isMaster || getHolderName(token) || (data.pass && data.pass.isClaimed)) {
          setExplicitVipRouteActive(true);
          setDeviceSession(token);
          unlockVip(token);
        }
      } else {
        setIsDnaAuthentic(false);
        setStatusText('INVALID / CLONED');
        setDnaError(data.message || 'Invalid or cloned transmission detected.');
        soundManager.playError();
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      if (isMaster || localStoredName || localStoredCert) {
        setExplicitVipRouteActive(true);
        setDeviceSession(token);
        unlockVip(token);
      }
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    executeVerification(activeToken, queryParams.enc, queryParams.cmac);
  }, [activeToken, queryParams.enc, queryParams.cmac]);

  // Copy token ID
  const handleCopyToken = () => {
    navigator.clipboard?.writeText?.(activeToken);
    setCopiedToken(true);
    soundManager.playTone(880, 0.08);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Submit Holder Claim Form (for unassigned passes)
  const handleClaimPass = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeHolderName(claimName);
    const cleanEmail = claimEmail.trim().toLowerCase();

    if (!cleanName) {
      setClaimError('Please enter your full name or handle to claim this pass.');
      soundManager.playError();
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setClaimError('Please provide a valid email address for certificate provenance.');
      soundManager.playError();
      return;
    }

    if (dnaError) {
      setClaimError('This pass could not be cryptographically verified.');
      soundManager.playError();
      return;
    }

    setIsClaiming(true);
    setClaimError(null);
    soundManager.playTone(660, 0.08);

    try {
      const res = await fetch('/api/nfc/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: activeToken,
          ownerName: cleanName,
          ownerEmail: cleanEmail,
          deviceId: getOrCreateDeviceId(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || 'Claim registration failed. Please try again.');
      }

      const cert: BingaaCertificate = (data && data.certificate) || {
        certificateId: `COA-BNG1-${String(passData.editionNumber).padStart(3, '0')}-VERIFIED`,
        title: 'CERTIFICATE OF AUTHENTICITY — BINGÄA ISSUE #1',
        passId: activeToken,
        holderName: cleanName,
        editionNumber: passData.editionNumber,
        editionTotal: TOTAL_EDITION_LIMIT,
        status: 'OFFICIALLY VERIFIED',
        emailVerified: true,
        claimedAt: new Date().toISOString(),
        signatureAlgorithm: 'HMAC-SHA256',
        signature: 'Sillow Mill · Creative Syndicate',
      };

      // Permanently store details for this specific pass
      saveCertificate(cert);
      saveHolderName(cleanName, activeToken);
      setExplicitVipRouteActive(true);
      setDeviceSession(activeToken);
      unlockVip(activeToken);

      setPassData((prev) => ({
        ...prev,
        ownerName: cleanName,
        ownerEmail: cleanEmail,
        isClaimed: true,
        status: 'CLAIMED / OFFICIALLY VERIFIED',
        registeredAt: new Date().toISOString(),
        certificate: cert,
      }));

      soundManager.playUnlockChime();
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#22d3ee', '#34d399', '#ffffff', '#fbbf24'],
      });
    } catch (err: any) {
      console.error('Claim error:', err);
      setClaimError(err.message || 'Could not claim pass.');
      soundManager.playError();
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="relative z-20 w-full max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-12 text-white font-sans">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={() => {
            if (isClaimed && onOpenVisualizerHub) {
              onOpenVisualizerHub();
            } else {
              onNavigateHome();
            }
          }}
          className="inline-flex items-center gap-2 text-xs font-mono text-white/60 hover:text-white transition-colors cursor-pointer min-h-[44px] px-2 py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-white/50" />
          <span>{isClaimed ? 'Back to Portal' : 'Back to Home'}</span>
        </button>
        <span className="text-[10px] sm:text-[11px] font-mono text-cyan-400 uppercase tracking-widest">
          ÄKINOYA PROTOCOL · 2027
        </span>
      </div>

      {/* Security Warning if Cloned/Invalid */}
      {dnaError && (
        <div className="mb-5 p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs font-mono space-y-1">
          <div className="font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>INVALID / UNRECOGNIZED PASS DETECTED</span>
          </div>
          <p className="text-[11px] text-rose-200/80 leading-relaxed">
            {dnaError}
          </p>
        </div>
      )}

      {/* VIEW A: UNCLAIMED ONBOARDING & CLAIM SCREEN */}
      {!isClaimed ? (
        <motion.div
          key="unclaimed-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-[#090d16] border border-cyan-500/30 p-5 sm:p-8 space-y-6 shadow-[0_0_40px_rgba(6,182,212,0.12)]"
        >
          {/* Header */}
          <div className="border-b border-white/10 pb-4 sm:pb-5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                <span>• AUTHENTIC PHYSICAL NFC PASS DETECTED</span>
              </span>
              <span className="text-[10px] font-mono text-amber-300/90 font-bold tracking-wider">
                UNASSIGNED
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide">
              Claim Your Äkinoya Founding Pass
            </h1>
            <p className="text-xs font-mono text-white/60 leading-relaxed">
              {isMaster ? 'Founders Pass (#0)' : `Founding Physical Edition #${passData.editionNumber} of ${TOTAL_EDITION_LIMIT}`}. This card has not yet been registered. Enter your name and email to permanently bind ownership and issue your official VIP Certificate of Authenticity.
            </p>
          </div>

          {/* Claim Form */}
          <form onSubmit={handleClaimPass} noValidate className="space-y-4">
            <div className="space-y-1.5 font-mono">
              <label htmlFor="claim-name" className="text-[11px] text-white/70 font-semibold tracking-wider uppercase flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Holder Name (Printed on Certificate)</span>
              </label>
              <input
                id="claim-name"
                type="text"
                required
                maxLength={HOLDER_NAME_MAX_LENGTH}
                value={claimName}
                disabled={isClaiming || isValidating}
                onChange={(e) => {
                  setClaimName(e.target.value);
                  if (claimError) setClaimError(null);
                }}
                placeholder="e.g. Elena Rostova"
                className="w-full bg-black/70 border border-white/20 focus:border-cyan-400 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all disabled:opacity-40"
              />
            </div>

            <div className="space-y-1.5 font-mono">
              <label htmlFor="claim-email" className="text-[11px] text-white/70 font-semibold tracking-wider uppercase flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>Email Address (For Ownership Provenance)</span>
              </label>
              <input
                id="claim-email"
                type="email"
                required
                value={claimEmail}
                disabled={isClaiming || isValidating}
                onChange={(e) => {
                  setClaimEmail(e.target.value);
                  if (claimError) setClaimError(null);
                }}
                placeholder="e.g. elena@example.com"
                className="w-full bg-black/70 border border-white/20 focus:border-cyan-400 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all disabled:opacity-40"
              />
            </div>

            {claimError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-[11px] font-mono text-rose-300">
                {claimError}
              </div>
            )}

            <button
              type="submit"
              disabled={!claimName.trim() || !claimEmail.trim() || isClaiming || isValidating}
              className="w-full py-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_25px_rgba(34,211,238,0.35)] disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none disabled:cursor-not-allowed min-h-[46px]"
            >
              {isClaiming ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-black" />
                  <span>CLAIMING &amp; ISSUING CERTIFICATE...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>CLAIM &amp; ACTIVATE VIP PASS</span>
                </>
              )}
            </button>

            <p className="text-[10px] font-mono text-white/40 text-center leading-relaxed">
              Upon submission, your details are cryptographically signed, bound to Pass #{activeToken}, and synced to Sillow Mill Genesis Registry.
            </p>
          </form>

          {/* Hardware Metadata summary */}
          <div className="divide-y divide-white/5 rounded-xl bg-black/40 border border-white/5 px-3.5 sm:px-4 font-mono text-xs">
            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-white/40">HARDWARE ID</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{passData.tokenId}</span>
                <button
                  onClick={handleCopyToken}
                  className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
                  title="Copy Token ID"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-white/40">EDITION</span>
              <span className="text-white font-medium">{isMaster ? 'Founders Pass (#0)' : `#${passData.editionNumber} of ${TOTAL_EDITION_LIMIT}`}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-white/40">ORIGIN</span>
              <span className="text-white/70">{passData.origin}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-white/40">STATUS</span>
              <span className="text-amber-400 font-semibold">UNCLAIMED / READY TO ONBOARD</span>
            </div>
          </div>
        </motion.div>
      ) : (
        /* VIEW B: CLAIMED PERSONALIZED CERTIFICATE & VIP PORTAL */
        <motion.div
          key="claimed-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {/* Header Card */}
          <div className="rounded-2xl bg-[#090d16] border border-emerald-500/30 p-4 sm:p-6 shadow-[0_0_35px_rgba(16,185,129,0.12)] flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span>• OFFICIALLY VERIFIED &amp; ACTIVE</span>
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-display font-bold text-white tracking-wide">
                Official Digital Passport
              </h1>
              <p className="text-[11px] sm:text-xs font-mono text-white/50">
                Registered Founding VIP Holder: <strong className="text-cyan-300">{activeHolderName}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadCertificatePng(activeCertificate)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/40 transition-all cursor-pointer min-h-[40px]"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download PNG</span>
              </button>
            </div>
          </div>

          {/* Centerpiece: Official Certificate of Authenticity */}
          <div className="shadow-[0_0_50px_rgba(6,182,212,0.15)] rounded-xl">
            <CertificateOfAuthenticity certificate={activeCertificate} />
          </div>

          {/* Action Button: Open Visualizer Hub */}
          <div className="space-y-3 pt-1">
            <button
              onClick={() => {
                if (onOpenVisualizerHub) {
                  onOpenVisualizerHub();
                } else {
                  onNavigateHome();
                }
              }}
              className="w-full py-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_25px_rgba(34,211,238,0.35)] min-h-[48px]"
            >
              <AudioWaveform className="w-4 h-4 text-black" />
              <span>OPEN VISUALIZER HUB &amp; VIP ASSETS</span>
            </button>

            <button
              type="button"
              onClick={() => downloadCertificatePng(activeCertificate)}
              className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[40px]"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download Official High-Res Certificate (2400x1700 PNG)</span>
            </button>
          </div>

          {/* Technical Provenance List */}
          <div className="rounded-2xl bg-black/40 border border-white/10 p-4 font-mono text-xs space-y-2">
            <div className="text-[10px] font-bold text-white/40 tracking-wider uppercase px-1">
              PROVENANCE METADATA
            </div>
            <div className="divide-y divide-white/5">
              <div className="py-2 flex items-center justify-between gap-3">
                <span className="text-white/40">TOKEN ID</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">{passData.tokenId}</span>
                  <button onClick={handleCopyToken} className="p-1 text-white/40 hover:text-white cursor-pointer" title="Copy">
                    {copiedToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="py-2 flex items-center justify-between gap-3">
                <span className="text-white/40">REGISTERED HOLDER</span>
                <span className="text-cyan-300 font-semibold">{activeHolderName.toUpperCase()}</span>
              </div>
              <div className="py-2 flex items-center justify-between gap-3">
                <span className="text-white/40">EDITION</span>
                <span className="text-white font-medium">
                  {isMaster ? 'Master / Founders Pass (#0)' : `Founding Member Copy #${passData.editionNumber} of ${TOTAL_EDITION_LIMIT}`}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between gap-3">
                <span className="text-white/40">ORIGIN</span>
                <span className="text-white/70">{passData.origin}</span>
              </div>
              <div className="py-2 flex items-center justify-between gap-3">
                <span className="text-white/40">COORDINATES</span>
                <span className="text-white/70">{passData.coordinates}</span>
              </div>
              <div className="py-2 flex items-center justify-between gap-3">
                <span className="text-white/40">STATUS</span>
                <span className="text-emerald-400 font-semibold">{passData.status}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
