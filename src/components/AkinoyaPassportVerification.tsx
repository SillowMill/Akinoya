import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Key,
  Copy,
  Check,
  Globe,
  Radio,
  BookOpen,
  AudioWaveform,
  Vote,
  QrCode,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  Cpu,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { useVipAccess, setDeviceSession } from '../context/VipAccessContext';
import { PassTransferModal } from './PassTransferModal';

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
  const { unlockVip, isVipUnlocked } = useVipAccess();

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
    const pathToken = window.location.pathname.replace(/^\/verify\/?/, '').trim();
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
  const [statusText, setStatusText] = useState<string>('VERIFIED ORIGINAL / FOUNDING HOLDER');
  const [tapCounter, setTapCounter] = useState<number>(1);

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
    edition: '1 of 125',
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
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showTransferModal, setShowTransferModal] = useState(Boolean(queryParams.claim));
  const [transferModalMode, setTransferModalMode] = useState<'transfer' | 'claim'>(
    queryParams.claim ? 'claim' : 'transfer'
  );

  // Registration Form state
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  // Test dynamic tap generator
  const [isGeneratingTestCipher, setIsGeneratingTestCipher] = useState(false);

  // Generate QR code for passport URL
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sillowmill.com';
    const passportUrl = `${origin}/verify/${activeToken}`;
    QRCode.toDataURL(passportUrl, {
      margin: 1,
      width: 280,
      color: {
        dark: '#22d3ee',
        light: '#030712',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('QR code gen error:', err));
  }, [activeToken]);

  // Execute verification against server-side NTAG 424 DNA engine
  const executeVerification = async (token: string, enc: string | null, cmac: string | null) => {
    setIsValidating(true);
    setDnaError(null);

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
        setStatusText(data.status || 'AUTHENTIC FOUNDING PASS VERIFIED');
        if (typeof data.counter === 'number') {
          setTapCounter(data.counter);
        }

        if (data.pass) {
          setPassData(data.pass);
          if (data.pass.ownerName) setRegName(data.pass.ownerName);
          if (data.pass.ownerEmail) setRegEmail(data.pass.ownerEmail);
        }

        // Grant persistent VIP access across device
        setDeviceSession(token);
        unlockVip(token);
        soundManager.playUnlockChime();

        if (data.isAuthentic) {
          confetti({
            particleCount: 65,
            spread: 60,
            origin: { y: 0.5 },
            colors: ['#22d3ee', '#34d399', '#38bdf8'],
          });
        }
      } else {
        // Validation failed or cloned transmission detected!
        setIsDnaAuthentic(false);
        setStatusText(data.status || 'INVALID / CLONED TRANSMISSION DETECTED');
        setDnaError(data.message || 'INVALID / CLONED TRANSMISSION DETECTED');
        soundManager.playError();
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setIsDnaAuthentic(false);
      setStatusText('INVALID / CLONED TRANSMISSION DETECTED');
      setDnaError('Network or cryptographic gateway offline. Re-transmission required.');
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
      setRegError('Please provide your name or collector handle.');
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
        setRegSuccess(true);
        setTimeout(() => {
          setRegSuccess(false);
          setShowRegistrationForm(false);
        }, 2200);
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

  // Diagnostic Test Actions (Simulate authentic tap vs cloned tap)
  const handleSimulateAuthenticTap = async () => {
    setIsGeneratingTestCipher(true);
    try {
      const res = await fetch(`/api/nfc/generate-test-cipher?token=${encodeURIComponent(activeToken)}`);
      const data = await res.json();
      if (res.ok && data.cipher) {
        setQueryParams((prev) => ({ ...prev, enc: data.cipher }));
        executeVerification(activeToken, data.cipher, null);
      }
    } catch (err) {
      console.warn('Simulate tap error:', err);
    } finally {
      setIsGeneratingTestCipher(false);
    }
  };

  const handleSimulateClonedTap = () => {
    setQueryParams((prev) => ({ ...prev, enc: 'cloned' }));
    executeVerification(activeToken, 'cloned', null);
  };

  return (
    <div className="relative z-20 w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10 text-white font-sans">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8 pb-4 border-b border-white/10">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-cyan-300 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Return to Äkinoya Portal</span>
        </button>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-white/40">PROTOCOL:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold text-[11px] shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            NTAG 424 DNA AES-128
          </span>
        </div>
      </div>

      {/* Main Verification Card / HUD Passport Certificate */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#060b14]/95 via-[#03060c]/98 to-[#020306] border border-cyan-400/40 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(34,211,238,0.18)] p-5 sm:p-8 lg:p-10"
      >
        {/* Holographic Watermark Sheen */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Status Alert Banner if Cloned/Invalid or Authentic */}
        {dnaError ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 sm:p-5 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 flex items-start gap-3.5 shadow-[0_0_30px_rgba(244,63,94,0.3)]"
          >
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-mono font-bold tracking-wider text-rose-300 uppercase mb-1">
                SECURITY ALERT — INVALID / CLONED TRANSMISSION DETECTED
              </div>
              <p className="text-xs font-mono text-rose-200/90 leading-relaxed">
                {dnaError}
              </p>
              <div className="mt-2 text-[11px] font-mono text-rose-400/80">
                Tap counter rollback or cryptographic signature mismatch detected. Access to gated sectors restricted.
              </div>
            </div>
          </motion.div>
        ) : isDnaAuthentic ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 sm:p-5 rounded-2xl bg-emerald-950/60 border border-emerald-400/50 text-emerald-200 flex items-center justify-between gap-3 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <ShieldCheck className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-mono font-bold tracking-wider text-emerald-300 uppercase">
                  AUTHENTIC FOUNDING PASS VERIFIED
                </div>
                <div className="text-[11px] font-mono text-emerald-200/80">
                  Dynamic NXP NTAG 424 DNA transmission confirmed · Hardware Tap #{tapCounter} · Single-Device Secured
                </div>
              </div>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 font-mono text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              GENUINE PASS
            </span>
          </motion.div>
        ) : null}

        {/* Certificate Header Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                ÄKINOYA DIGITAL PASSPORT & CERTIFICATE
              </span>
              <span className="text-white/20">·</span>
              <span className="text-[10px] sm:text-xs font-mono text-white/50">GENESIS FOUNDING PROTOCOL</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold tracking-wide text-white">
              Official Digital Passport HUD
            </h1>
          </div>

          {/* Action buttons (Transfer & Visualizer Hub) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setTransferModalMode('transfer');
                setShowTransferModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-300 hover:text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.15)]"
            >
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>Transfer Pass Ownership</span>
            </button>

            {onOpenVisualizerHub && (
              <button
                onClick={onOpenVisualizerHub}
                className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.3)]"
              >
                <AudioWaveform className="w-3.5 h-3.5 text-black" />
                <span>Open Visualizer Hub →</span>
              </button>
            )}
          </div>
        </div>

        {/* Passport Grid: Details + Hologram QR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 py-6 items-start">
          {/* Left Column: Metadata & Verified Credentials */}
          <div className="lg:col-span-8 space-y-6">
            {/* Core Verification Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Token ID Card */}
              <div className="p-4 rounded-2xl bg-black/60 border border-cyan-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    UNIQUE TOKEN ID
                  </span>
                  <button
                    onClick={handleCopyToken}
                    className="p-1 rounded text-cyan-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Token ID"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-base sm:text-lg font-mono font-extrabold text-white tracking-wider">
                  {passData.tokenId}
                </div>
                <div className="text-[10px] font-mono text-white/50">
                  Cryptographically Bound Genesis Pass
                </div>
              </div>

              {/* Ownership Status Card */}
              <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/30 space-y-1.5">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>OWNERSHIP STATUS</span>
                </span>
                <div className="text-sm sm:text-base font-display font-bold text-white tracking-wide truncate">
                  {dnaError ? 'INVALID / CLONED TRANSMISSION' : statusText}
                </div>
                <div className="text-[10px] font-mono text-emerald-300/80">
                  {dnaError ? 'Access Suspended' : 'Whitelisted Tier I Original'}
                </div>
              </div>
            </div>

            {/* Sector & Coordinates Metadata Grid */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3.5">
              <div className="text-xs font-mono text-cyan-300 font-bold tracking-wider uppercase flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Sector Coordinates & Issue Metadata</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <div className="text-[10px] text-white/40">SECTOR</div>
                  <div className="font-semibold text-white mt-0.5">{passData.sector}</div>
                </div>

                <div>
                  <div className="text-[10px] text-white/40">ISSUE DATE</div>
                  <div className="font-semibold text-white mt-0.5">{passData.issueDate}</div>
                </div>

                <div>
                  <div className="text-[10px] text-white/40">CORE COORDINATES</div>
                  <div className="font-semibold text-cyan-300 mt-0.5">{passData.coordinates}</div>
                </div>

                <div>
                  <div className="text-[10px] text-white/40">EDITION STATUS</div>
                  <div className="font-semibold text-emerald-400 mt-0.5">{passData.edition}</div>
                </div>
              </div>
            </div>

            {/* Registered Holder Badge & Form */}
            <div className="p-5 rounded-2xl bg-black/50 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-bold">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span>REGISTERED DIGITAL HOLDER</span>
                </div>

                <button
                  onClick={() => setShowRegistrationForm(!showRegistrationForm)}
                  className="text-[11px] font-mono text-cyan-400 hover:text-white underline cursor-pointer"
                >
                  {showRegistrationForm ? 'Cancel' : 'Register / Update'}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-cyan-950/40 rounded-xl border border-cyan-500/20">
                <div>
                  <div className="text-sm font-display font-bold text-white">
                    {passData.ownerName}
                  </div>
                  {passData.ownerEmail && (
                    <div className="text-xs font-mono text-white/50">{passData.ownerEmail}</div>
                  )}
                </div>

                <div className="text-[10px] font-mono text-cyan-300/80 px-2 py-1 rounded bg-black/60 border border-cyan-400/30 self-start sm:self-auto">
                  {passData.registeredAt
                    ? `Registered on ${new Date(passData.registeredAt).toLocaleDateString()}`
                    : 'Unclaimed Identity / Anonymous Pass'}
                </div>
              </div>

              {/* Collapsible Registration Form */}
              <AnimatePresence>
                {showRegistrationForm && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleRegisterHolder}
                    className="pt-3 border-t border-white/10 space-y-3 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-cyan-300 mb-1">
                          HOLDER NAME / DISPLAY HANDLE *
                        </label>
                        <input
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="e.g. Odi or BelgianCollector"
                          className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-white/60 mb-1">
                          EMAIL (OPTIONAL)
                        </label>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="holder@example.com"
                          className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                        />
                      </div>
                    </div>

                    {regError && (
                      <div className="text-xs font-mono text-rose-400">{regError}</div>
                    )}
                    {regSuccess && (
                      <div className="text-xs font-mono text-emerald-400">
                        Holder identity successfully bound to Pass #{passData.tokenId}.
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isRegistering ? 'SAVING...' : 'SAVE & BIND HOLDER IDENTITY'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Holder Privileges Interactive Grid */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-bold uppercase">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Founding Holder Entitlements & Claim Status</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Graphic Novel */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1.5 hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>GRAPHIC NOVEL</span>
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-400/40 text-emerald-300">
                      CLAIMABLE
                    </span>
                  </div>
                  <div className="text-xs font-display font-bold text-white">
                    Sillow Mill — Bingäa (Collector's Graphic Novel)
                  </div>
                  <p className="text-[11px] font-mono text-white/50 leading-relaxed">
                    170gsm archival paper with bioluminescent foil stamping. Detailed Leuven origin story.
                  </p>
                </div>

                {/* 2. Visualizers */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1.5 hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold flex items-center gap-1">
                      <AudioWaveform className="w-3.5 h-3.5" />
                      <span>VISUALIZERS</span>
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-400/40 text-emerald-300">
                      11 TRACKS ACTIVE
                    </span>
                  </div>
                  <div className="text-xs font-display font-bold text-white">
                    Äkinoya Visualizer Hub Access
                  </div>
                  <p className="text-[11px] font-mono text-white/50 leading-relaxed">
                    Unlocked telemetry streams and audio sector logs across all 11 project tracks.
                  </p>
                </div>

                {/* 3. Unreleased Audio */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1.5 hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5" />
                      <span>UNRELEASED AUDIO</span>
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300">
                      PRIORITY ACCESS
                    </span>
                  </div>
                  <div className="text-xs font-display font-bold text-white">
                    Sector 04 Acoustic Masters Vault
                  </div>
                  <p className="text-[11px] font-mono text-white/50 leading-relaxed">
                    Direct access to unreleased soundscapes and early masters prior to streaming launch.
                  </p>
                </div>

                {/* 4. Governance */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1.5 hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold flex items-center gap-1">
                      <Vote className="w-3.5 h-3.5" />
                      <span>COUNCIL GOVERNANCE</span>
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300">
                      WHITELISTED
                    </span>
                  </div>
                  <div className="text-xs font-display font-bold text-white">
                    Universe Canon Voting Ballot
                  </div>
                  <p className="text-[11px] font-mono text-white/50 leading-relaxed">
                    Direct ballot influence over universe lore, narrative character decisions, and drops.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Holographic QR Code & NFC Encryption Engine HUD */}
          <div className="lg:col-span-4 space-y-5 flex flex-col items-center">
            {/* Holographic Dynamic QR Card */}
            <div className="w-full max-w-[280px] p-4 rounded-2xl bg-black/80 border border-cyan-400/40 shadow-[0_0_25px_rgba(34,211,238,0.2)] flex flex-col items-center text-center space-y-3">
              <div className="flex items-center justify-between w-full text-[10px] font-mono text-cyan-300 font-bold">
                <span>DIGITAL PASSPORT QR</span>
                <span className="text-emerald-400">ACTIVE</span>
              </div>

              {qrDataUrl ? (
                <div className="relative p-2 rounded-xl bg-black border border-cyan-500/30 shadow-[inset_0_0_15px_rgba(34,211,238,0.15)]">
                  <img
                    src={qrDataUrl}
                    alt="Äkinoya Passport QR"
                    className="w-48 h-48 rounded-lg"
                  />
                  {/* Glowing scanline */}
                  <div className="absolute inset-x-2 h-0.5 bg-cyan-400/60 shadow-[0_0_8px_rgba(34,211,238,1)] animate-bounce pointer-events-none" />
                </div>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs font-mono text-white/40">
                  Generating QR...
                </div>
              )}

              <div className="text-[10px] font-mono text-white/50 leading-relaxed">
                Scan with any NFC/Camera device to authenticate this passport.
              </div>
            </div>

            {/* NXP NTAG 424 DNA Telemetry HUD Card */}
            <div className="w-full max-w-[280px] p-4 rounded-2xl bg-black/70 border border-white/10 space-y-2.5 text-xs font-mono">
              <div className="text-[10px] font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>NTAG 424 DNA Telemetry</span>
              </div>

              <div className="space-y-1.5 text-[11px] text-white/70">
                <div className="flex justify-between">
                  <span className="text-white/40">Chip Engine:</span>
                  <span className="text-cyan-300 font-semibold">SUN AES-128</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Replay Defense:</span>
                  <span className="text-emerald-400 font-semibold">Monotonic Counter</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Hardware Tap:</span>
                  <span className="text-white">#{tapCounter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Session Binding:</span>
                  <span className="text-cyan-300">Single-Device Lock</span>
                </div>
              </div>
            </div>

            {/* Diagnostic / Testing Controls Panel */}
            <div className="w-full max-w-[280px] p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-2 text-center">
              <div className="text-[10px] font-mono text-white/40 uppercase">
                TEST & SIMULATION SUITE
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleSimulateAuthenticTap}
                  disabled={isGeneratingTestCipher}
                  className="py-1.5 px-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono cursor-pointer disabled:opacity-50"
                  title="Simulate authentic dynamic AES-128 NFC tap"
                >
                  {isGeneratingTestCipher ? 'Testing...' : 'Simulate Valid Tap'}
                </button>
                <button
                  type="button"
                  onClick={handleSimulateClonedTap}
                  className="py-1.5 px-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-mono cursor-pointer"
                  title="Simulate cloned / counterfeit transmission"
                >
                  Simulate Clone
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Gateway Access Row */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-mono text-white/40 text-center sm:text-left">
            <span>Enterprise Registry: BE 1041.720.513 · Sector 04 Archives Locked</span>
          </div>

          <button
            onClick={onNavigateHome}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-all"
          >
            <span>ENTER ÄKINOYA VIP PORTAL</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
        </div>
      </motion.div>

      {/* Transfer Ownership / Claim Modal */}
      <PassTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        tokenId={activeToken}
        initialMode={transferModalMode}
        onTransferClaimed={(newToken, newOwner) => {
          setPassData((prev) => ({
            ...prev,
            tokenId: `#${newToken}`,
            ownerName: newOwner,
          }));
          executeVerification(newToken, null, null);
        }}
      />
    </div>
  );
};
