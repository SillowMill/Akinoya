import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  ShieldCheck,
  Key,
  Copy,
  Check,
  X,
  ExternalLink,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';

interface PassTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: string;
  initialMode?: 'transfer' | 'claim';
  onTransferClaimed?: (newToken: string, newOwner: string) => void;
}

export const PassTransferModal: React.FC<PassTransferModalProps> = ({
  isOpen,
  onClose,
  tokenId,
  initialMode = 'transfer',
  onTransferClaimed,
}) => {
  const [activeTab, setActiveTab] = useState<'transfer' | 'claim'>(initialMode);

  // Transfer generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Claim states
  const [claimKeyInput, setClaimKeyInput] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateTransferKey = async () => {
    setIsGenerating(true);
    setTransferError(null);
    soundManager.playTone(660, 0.08);

    try {
      const res = await fetch('/api/nfc/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGeneratedKey(data.transferKey);
        setClaimUrl(data.claimUrl);
        soundManager.playUnlockChime();
      } else {
        throw new Error(data.message || 'Failed to generate transfer key');
      }
    } catch (err: any) {
      console.error('Transfer key error:', err);
      setTransferError(err.message || 'Could not initiate transfer. Please try again.');
      soundManager.playError();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard?.writeText?.(generatedKey);
    setCopiedKey(true);
    soundManager.playTone(880, 0.08);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyUrl = () => {
    if (!claimUrl) return;
    navigator.clipboard?.writeText?.(claimUrl);
    setCopiedUrl(true);
    soundManager.playTone(880, 0.08);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleClaimTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimKeyInput.trim() || !recipientName.trim()) {
      setClaimError('Please provide the one-time transfer key and your name/handle.');
      return;
    }

    setIsClaiming(true);
    setClaimError(null);
    soundManager.playTone(660, 0.08);

    try {
      const res = await fetch('/api/nfc/claim-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferKey: claimKeyInput.trim().toUpperCase(),
          newOwnerName: recipientName.trim(),
          newOwnerEmail: recipientEmail.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundManager.playUnlockChime();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22d3ee', '#34d399', '#38bdf8', '#818cf8'],
        });

        setClaimSuccessMsg(
          data.message || `Ownership transferred! You are now the official holder of #${data.tokenId}.`
        );

        if (onTransferClaimed && data.tokenId) {
          onTransferClaimed(data.tokenId, recipientName.trim());
        }
      } else {
        throw new Error(data.message || 'Transfer key could not be claimed.');
      }
    } catch (err: any) {
      console.error('Claim transfer error:', err);
      setClaimError(err.message || 'Failed to claim transfer key.');
      soundManager.playError();
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-[#0a0d14] border border-white/10 rounded-2xl p-5 sm:p-6 text-white shadow-2xl my-8 overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="border-b border-white/10 pb-3 mb-4">
            <h3 className="text-base font-display font-bold text-white tracking-wide">
              Transfer Pass Ownership
            </h3>
            <p className="text-xs font-mono text-white/50 mt-0.5">
              Secure single-use key generation for Pass #{tokenId}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/50 rounded-xl border border-white/10 mb-5">
            <button
              onClick={() => setActiveTab('transfer')}
              className={`py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'transfer'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Transfer Pass
            </button>
            <button
              onClick={() => setActiveTab('claim')}
              className={`py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'claim'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Claim Pass
            </button>
          </div>

          {/* Tab 1: Generate Transfer Key */}
          {activeTab === 'transfer' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs font-mono text-white/70 leading-relaxed">
                <p className="flex items-center gap-2 text-cyan-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Secure Cryptographic Transfer Notice</span>
                </p>
                <p>
                  Generating an ownership transfer produces a single-use cryptographically signed key.
                  When the new owner claims this key, all digital privileges, visualizer archive access,
                  and single-device permissions will transfer to the new collector.
                </p>
              </div>

              {!generatedKey ? (
                <div className="space-y-3 pt-2">
                  {transferError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{transferError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleGenerateTransferKey}
                    disabled={isGenerating}
                    className="w-full py-3 px-4 rounded-xl font-mono text-xs sm:text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>GENERATING SECURE KEY...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 text-black" />
                        <span>GENERATE ONE-TIME TRANSFER KEY</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-1"
                >
                  <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.15)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                        ONE-TIME TRANSFER KEY
                      </span>
                      <span className="text-[10px] font-mono text-white/50">VALID FOR 7 DAYS</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-3 bg-black/80 rounded-xl border border-cyan-500/30">
                      <code className="text-sm sm:text-base font-mono font-bold text-cyan-300 tracking-wider">
                        {generatedKey}
                      </code>
                      <button
                        onClick={handleCopyKey}
                        className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                      >
                        {copiedKey ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-cyan-400" />
                            <span>COPY KEY</span>
                          </>
                        )}
                      </button>
                    </div>

                    {claimUrl && (
                      <div className="space-y-1.5 pt-2 border-t border-cyan-500/20">
                        <div className="text-[10px] font-mono text-white/50">DIRECT CLAIM LINK</div>
                        <div className="flex items-center justify-between gap-2 p-2.5 bg-black/80 rounded-xl border border-white/10 text-xs font-mono text-white/70 truncate">
                          <span className="truncate">{claimUrl}</span>
                          <button
                            onClick={handleCopyUrl}
                            className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            {copiedUrl ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>COPIED</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>COPY URL</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] font-mono text-white/50 text-center leading-relaxed">
                    ✦ Provide this key or link privately to the new owner upon physical resale or gifting.
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* Tab 2: Claim Transferred Pass */}
          {activeTab === 'claim' && (
            <form onSubmit={handleClaimTransfer} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs font-mono text-white/70 leading-relaxed">
                Enter the one-time transfer key provided by the previous holder to claim ownership of the pass
                and secure your personal device session.
              </div>

              {claimError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{claimError}</span>
                </div>
              )}

              {claimSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{claimSuccessMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono text-cyan-300 mb-1">
                    TRANSFER KEY *
                  </label>
                  <input
                    type="text"
                    value={claimKeyInput}
                    onChange={(e) => setClaimKeyInput(e.target.value.toUpperCase())}
                    placeholder="TRF-AKN-XXXX-XXXX-XXXX"
                    className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-4 py-2.5 font-mono text-sm text-white placeholder-white/30 outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-cyan-300 mb-1">
                    NEW OWNER DISPLAY NAME / HANDLE *
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Odi or Collector_914"
                    className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-4 py-2.5 font-mono text-sm text-white placeholder-white/30 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-white/60 mb-1">
                    OWNER EMAIL (OPTIONAL ARCHIVE NOTIFICATIONS)
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-4 py-2.5 font-mono text-sm text-white placeholder-white/30 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isClaiming}
                className="w-full py-3 px-4 rounded-xl font-mono text-xs sm:text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {isClaiming ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>CLAIMING OWNERSHIP...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>CLAIM DIGITAL OWNERSHIP & UNLOCK PORTAL</span>
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
