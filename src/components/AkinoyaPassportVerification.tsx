import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  Copy,
  Check,
  ArrowLeft,
  AudioWaveform,
  Key,
  AlertCircle,
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
  const { unlockVip } = useVipAccess();

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

  // Registration Form state (inline)
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  // Generate QR code for passport URL
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sillowmill.com';
    const passportUrl = `${origin}/verify/${activeToken}`;
    QRCode.toDataURL(passportUrl, {
      margin: 1,
      width: 200,
      color: {
        dark: '#ffffff',
        light: '#070a0e',
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
        setStatusText(data.isAuthentic ? 'AUTHENTIC' : 'VERIFIED');

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

  return (
    <div className="relative z-20 w-full max-w-lg mx-auto px-4 py-8 sm:py-12 text-white font-sans">
      {/* Top Simple Back Navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs font-mono text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-white/50" />
          <span>Back to Portal</span>
        </button>
        <span className="text-[11px] font-mono text-white/30 uppercase tracking-wider">
          Äkinoya 2027
        </span>
      </div>

      {/* Single Streamlined Central Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl bg-[#0a0d14] border border-white/10 p-5 sm:p-7 space-y-5 shadow-2xl"
      >
        {/* Clean Main Title */}
        <div className="border-b border-white/10 pb-4">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide">
            Official Digital Passport
          </h1>
          <p className="text-xs font-mono text-white/50 mt-1">
            Founding Holder Verification Certificate
          </p>
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

          <div className="divide-y divide-white/5 rounded-xl bg-black/40 border border-white/5 px-4 font-mono text-xs">
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
            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-white/45">HOLDER</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{passData.ownerName}</span>
                <button
                  type="button"
                  onClick={() => setShowRegistrationForm(!showRegistrationForm)}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  {showRegistrationForm ? 'Cancel' : 'Edit'}
                </button>
              </div>
            </div>

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

        {/* QR Code Standalone Clean Card */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center justify-center space-y-2">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Digital Passport QR"
              className="w-32 h-32 rounded-lg bg-[#070a0e] p-1 border border-white/10"
            />
          ) : (
            <div className="w-32 h-32 flex items-center justify-center text-xs font-mono text-white/30">
              Loading QR...
            </div>
          )}
          <span className="text-[10px] font-mono text-white/40">
            Scan to authenticate passport
          </span>
        </div>

        {/* Merged Prioritized Button Stack */}
        <div className="space-y-2.5 pt-1">
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

          {/* 2. Secondary (Outline): Transfer Pass Ownership */}
          <button
            onClick={() => {
              setTransferModalMode('transfer');
              setShowTransferModal(true);
            }}
            className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-semibold text-white/80 hover:text-white bg-transparent hover:bg-white/5 border border-white/15 hover:border-white/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-white/60" />
            <span>Transfer Pass Ownership</span>
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
