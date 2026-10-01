import React, { useState } from 'react';
import { motion } from 'motion/react';
import passCardImg from '../assets/images/akinoya_pass_card_1790852652003.jpg';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import {
  Lock,
  Sparkles,
  ShieldCheck,
  Compass,
  Radio,
  BookOpen,
  Check,
  Download,
  Eye,
  Globe2,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface UnlockedExperienceProps {
  onLockPortal: () => void;
  onToggleViewMode: (mode: 'orbit' | 'surface') => void;
  currentViewMode: 'orbit' | 'surface';
}

export const UnlockedExperience: React.FC<UnlockedExperienceProps> = ({
  onLockPortal,
  onToggleViewMode,
  currentViewMode,
}) => {
  const [activeTab, setActiveTab] = useState<'pass' | 'edition'>('pass');
  const [isCopied, setIsCopied] = useState(false);
  const [isReserved, setIsReserved] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  // Mouse & Touch tilt for luxury 3D card
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateX(-y * 0.04);
    setRotateY(x * 0.04);
  };

  const handlePointerLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const handleCopyPassId = () => {
    navigator.clipboard?.writeText?.('AKN-VIP-2027-X0914');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8"
    >
      {/* Top Status & Lock Control (Mobile friendly wrapping) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.25)] shrink-0">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-mono text-cyan-400 tracking-wider">PORTAL ACTIVE</span>
              <span className="text-white/30 text-xs">·</span>
              <span className="text-[10px] sm:text-xs text-white/60 font-mono">TOKEN #AKN-2027</span>
            </div>
            <h2 className="text-sm sm:text-lg font-display font-bold text-white tracking-wide">
              Welcome to Äkinoya — Unlocked
            </h2>
          </div>
        </div>

        {/* Action buttons (Touch targets >= 44px) */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onToggleViewMode(currentViewMode === 'orbit' ? 'surface' : 'orbit')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-mono text-cyan-300 hover:text-white bg-cyan-950/60 border border-cyan-800/40 rounded-xl transition-all cursor-pointer min-h-[40px]"
          >
            {currentViewMode === 'orbit' ? (
              <>
                <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate">Surface Vista</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate">Orbital View</span>
              </>
            )}
          </button>

          <button
            onClick={onLockPortal}
            title="Lock the portal and return to the access gate"
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-mono text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer min-h-[40px]"
          >
            <Lock className="w-3.5 h-3.5 text-white/60" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 3D Holographic Pass + Exclusive Perks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: 3D Holographic VIP Pass Card */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            style={{
              transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
            className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-black/70 border border-cyan-400/30 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(56,189,248,0.25)] group cursor-pointer touch-none"
          >
            {/* Holographic dynamic gradient sheen */}
            <div
              style={{
                background: `radial-gradient(circle at ${50 + rotateY * 3}% ${
                  50 - rotateX * 3
                }%, rgba(103, 232, 249, 0.35), transparent 60%)`,
              }}
              className="absolute inset-0 pointer-events-none mix-blend-color-dodge z-20 transition-opacity"
            />

            {/* Pass Visual */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
              <img
                src={passCardImg}
                alt="VIP Äkinoya Pass Card"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/70 backdrop-blur-md border border-cyan-400/30 rounded-full text-[10px] font-mono text-cyan-300">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                FOUNDING HOLDER
              </div>
            </div>

            {/* Card Details Bar */}
            <div className="p-4 sm:p-5 bg-gradient-to-b from-[#060c14] to-[#03060a] border-t border-cyan-500/20">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[11px] sm:text-xs font-mono text-white/50 tracking-wider">ÄKINOYA VIP PASS</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/30 text-cyan-300">
                  TIER I VERIFIED
                </span>
              </div>

              <div className="space-y-1 mb-4">
                <div className="text-xs sm:text-sm font-display font-bold text-white tracking-wider">
                  SILLOW MILL ARCHIVE HOLDER
                </div>
                <div className="text-[11px] sm:text-xs font-mono text-cyan-400/80 flex items-center justify-between">
                  <span>ID: #AKN-2027-X0914</span>
                  <span>SECTOR 04</span>
                </div>
              </div>

              {/* Quick action buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                <button
                  onClick={handleCopyPassId}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-mono text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/30 rounded-xl transition-colors cursor-pointer min-h-[44px]"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>COPIED</span>
                    </>
                  ) : (
                    <>
                      <span>COPY PASS ID</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => alert('VIP Pass Card token is gedownload.')}
                  className="p-2.5 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Save Pass Token"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <p className="text-[11px] font-mono text-white/40 mt-2.5 text-center">
            ✦ Hover or touch the card for a holographic reflection
          </p>
        </div>

        {/* Right Column: Perks and Physical Drop */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
          {/* Navigation Tabs (Mobile optimized scrollable / grid) */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl">
            <button
              onClick={() => setActiveTab('pass')}
              className={`py-2 px-2 text-[11px] sm:text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px] ${
                activeTab === 'pass'
                  ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-400/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Pass Perks</span>
            </button>
            <button
              onClick={() => setActiveTab('edition')}
              className={`py-2 px-2 text-[11px] sm:text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px] ${
                activeTab === 'edition'
                  ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-400/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Hardcover</span>
            </button>
          </div>

          {/* Tab 1: VIP Perks */}
          {activeTab === 'pass' && (
            <div className="space-y-4">
              <div className="bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

                <h3 className="text-xs sm:text-sm font-mono tracking-wider text-cyan-300 uppercase mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Unlocked VIP Entitlements</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 transition-colors">
                    <div className="text-[10px] sm:text-xs font-mono text-cyan-400 mb-1">01. PRE-RELEASE ARCHIVE</div>
                    <div className="text-xs sm:text-sm font-semibold text-white/90 mb-1">Raw Manuscript Chapters</div>
                    <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed">
                      First 3 chapters accessible 60 days before general worldwide publication.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 transition-colors">
                    <div className="text-[10px] sm:text-xs font-mono text-cyan-400 mb-1">02. CHRONICLER EMBOSS</div>
                    <div className="text-xs sm:text-sm font-semibold text-white/90 mb-1">Collector's Hardcover Seal</div>
                    <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed">
                      Hand-numbered foil bookmark with custom Äkinoya planetary coordinates.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 transition-colors">
                    <div className="text-[10px] sm:text-xs font-mono text-cyan-400 mb-1">03. DIRECT TRANSMISSION</div>
                    <div className="text-xs sm:text-sm font-semibold text-white/90 mb-1">Author's Private Dispatch</div>
                    <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed">
                      Encrypted quarterly audio logs and worldbuilding notes directly from Sillow Mill.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 transition-colors">
                    <div className="text-[10px] sm:text-xs font-mono text-cyan-400 mb-1">04. HIGH-RES ATLAS</div>
                    <div className="text-xs sm:text-sm font-semibold text-white/90 mb-1">8K Holographic Cartography</div>
                    <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed">
                      Complete planetary maps, crystalline continental shelves, and tectonic surveys.
                    </p>
                  </div>
                </div>
              </div>

              {/* Surface Vista Preview Card */}
              <div className="bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <div className="w-full sm:w-36 h-24 rounded-xl overflow-hidden shrink-0 border border-white/10 relative">
                  <img
                    src={akinoyaVistaImg}
                    alt="The Surface Crossing"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <span className="absolute bottom-1.5 left-2 text-[10px] font-mono text-cyan-300">
                    SURFACE VISTA
                  </span>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="text-[10px] sm:text-xs font-mono text-cyan-400 mb-1">EXPEDITION LOG · SECTOR 01</div>
                  <div className="text-xs sm:text-sm font-semibold text-white/90 mb-1">
                    The Glass Sea of Äkinoya
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/60">
                    Reflective mirror waters that hold the resonance of the planetary core.
                  </p>
                </div>
                <button
                  onClick={() => onToggleViewMode('surface')}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-mono text-white bg-cyan-900/60 hover:bg-cyan-800/80 border border-cyan-400/40 rounded-xl transition-all whitespace-nowrap cursor-pointer min-h-[44px]"
                >
                  Immerse Vista
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Physical Hardcover Drop Reservation */}
          {activeTab === 'edition' && (
            <div className="bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] sm:text-xs font-mono text-cyan-300">2027 LIMITED HARDCOVER DROP</span>
              </div>
              <h3 className="text-base sm:text-lg font-display font-bold text-white mb-1.5">
                Physical Edition Priority Whitelist
              </h3>
              <p className="text-[11px] sm:text-xs text-white/60 mb-4 leading-relaxed">
                As a verified code entrant, your session token qualifies you for guaranteed allocation of
                the first 500 foil-stamped, clothbound copies of Sillow Mill / Äkinoya.
              </p>

              <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/20 mb-4 text-center sm:text-left">
                <div>
                  <div className="text-[10px] font-mono text-white/50">LAUNCH</div>
                  <div className="text-xs sm:text-sm font-semibold text-cyan-200">Q1 2027</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-white/50">EDITION</div>
                  <div className="text-xs sm:text-sm font-semibold text-cyan-200">500 Units</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-white/50">STATUS</div>
                  <div className="text-xs sm:text-sm font-semibold text-emerald-400">Guaranteed</div>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsReserved(true);
                  soundManager.playUnlockChime();
                }}
                disabled={isReserved}
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-display font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-cyan-500/20 to-blue-600/30 hover:from-cyan-500/30 hover:to-blue-600/40 border border-cyan-400/40 text-cyan-200 shadow-[0_0_20px_rgba(56,189,248,0.2)] min-h-[46px]"
              >
                {isReserved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>PRIORITY CONFIRMED · RESERVATION #48</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>RESERVE COLLECTOR HARDCOVER</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
