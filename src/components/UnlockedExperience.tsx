import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import passCardImg from '../assets/images/akinoya_pass_card_1790852652003.jpg';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import bingaaComicCover from '../assets/images/bingaa_comic_cover.jpg';
import {
  Lock,
  Unlock,
  Key,
  Sparkles,
  ShieldCheck,
  Compass,
  Radio,
  BookOpen,
  QrCode,
  Check,
  Copy,
  Eye,
  Globe2,
  Bell,
  Mail,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Video,
  Play,
  Pause,
  X,
  Film,
  Vote,
  Package,
  Volume2,
  CreditCard,
  ShoppingBag,
  CheckCircle2,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { planetSoundtrack } from '../utils/soundtrack';

export const FOUNDING_PASS_ID = 'AKN-VIP-2027-X0914';

export interface VisualizerTrack {
  id: string;
  title: string;
  code: string;
  defaultUnlocked?: boolean;
}

const VISUALIZER_TRACKS: VisualizerTrack[] = [
  { id: '01', title: "Don't Need", code: 'DONTNEED' },
  { id: '02', title: "Bingäa", code: 'BINGAA', defaultUnlocked: true },
  { id: '03', title: "Memories", code: 'MEMORIES' },
  { id: '04', title: "Hurry", code: 'HURRY' },
  { id: '05', title: "Know Me", code: 'KNOWME' },
  { id: '06', title: "Bignäa II", code: 'BIGNAA2' },
  { id: '07', title: "Everyday", code: 'EVERYDAY' },
  { id: '08', title: "Could Forget", code: 'COULDFORGET' },
  { id: '09', title: "Yea Yeah Yeah", code: 'YEAYEAHYEAH' },
  { id: '10', title: "Sideways", code: 'SIDEWAYS' },
  { id: '11', title: "Goodbye", code: 'GOODBYE' },
];

export interface PerkModule {
  id: string;
  number: string;
  category: string;
  title: string;
  description: string;
  icon: React.ElementType;
  defaultCode: string;
  deploymentTime: string;
  statusText: string;
}

const PERK_MODULES: PerkModule[] = [
  {
    id: 'animation',
    number: '01',
    category: 'EARLY ACCESS',
    title: 'Animation Early Access',
    description: 'Exclusive early access to animations and visual stories before public release.',
    icon: Film,
    defaultCode: 'ANIM-2027',
    deploymentTime: 'PHASE 02 LAUNCH',
    statusText: 'Animation pipeline verified & encrypted. Prepared for upcoming broadcast release.',
  },
  {
    id: 'vault',
    number: '02',
    category: 'UNRELEASED AUDIO',
    title: 'Unreleased Music Vault',
    description: 'Direct access to unreleased tracks, soundscapes, and singles prior to official streaming release.',
    icon: Radio,
    defaultCode: 'VAULT-2027',
    deploymentTime: 'SECTOR 04 DEPLOYMENT',
    statusText: 'Audio master archives authenticated. Transmission scheduled for upcoming wave.',
  },
  {
    id: 'governance',
    number: '03',
    category: 'COMMUNITY GOVERNANCE',
    title: 'Voting Rights & Lore Input',
    description: 'Cast your vote on future releases, character decisions, and directions within the Sillow Mill universe.',
    icon: Vote,
    defaultCode: 'LORE-2027',
    deploymentTime: 'COUNCIL CONVENE',
    statusText: 'Ballot governance node locked. Consensus protocol activates on full planetary mint.',
  },
  {
    id: 'drops',
    number: '04',
    category: 'DROPS & MERCH',
    title: 'Exclusive Merch Drops',
    description: 'Priority access and drops for limited, exclusive, and free physical merchandise.',
    icon: Package,
    defaultCode: 'MERCH-2027',
    deploymentTime: 'WAVE 2 DISPATCH',
    statusText: 'Physical archive whitelist verified. Wave 2 logistics preparing for dispatch.',
  },
];

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
  const [passSubView, setPassSubView] = useState<'overview' | 'hub'>('overview');
  const [isCopied, setIsCopied] = useState(false);
  const [isReserved, setIsReserved] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [isWaitlistSubmitted, setIsWaitlistSubmitted] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  // Detect touch-only devices — tilt is disabled to keep pan-y scrolling smooth
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(hover: none)').matches);
  }, []);

  // 4 VIP Entitlements independent state
  const [perkInputs, setPerkInputs] = useState<Record<string, string>>({
    animation: '',
    vault: '',
    governance: '',
    drops: '',
  });

  const [perkSubmitted, setPerkSubmitted] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = sessionStorage.getItem('akinoya_perk_states');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handlePerkInputChange = (id: string, value: string) => {
    setPerkInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handlePerkCodeSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const updated = { ...perkSubmitted, [id]: true };
    setPerkSubmitted(updated);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('akinoya_perk_states', JSON.stringify(updated));
    }
    soundManager.playUnlockChime();
  };

  const handleResetPerk = (id: string) => {
    const updated = { ...perkSubmitted, [id]: false };
    setPerkSubmitted(updated);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('akinoya_perk_states', JSON.stringify(updated));
    }
    setPerkInputs((prev) => ({ ...prev, [id]: '' }));
  };

  // Mouse & Touch tilt for luxury 3D card (mouse-only; skipped on touch devices)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isTouchDevice || e.pointerType === 'touch') return;
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

  // Pass ID Visualizer Hub State
  const [passIdInput, setPassIdInput] = useState('');
  const [passIdError, setPassIdError] = useState('');
  const [isVisualizerUnlocked, setIsVisualizerUnlocked] = useState<boolean>(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('akinoya_visualizers_unlocked') === 'true';
  });

  // Track specific unlock state
  const [unlockedTracks, setUnlockedTracks] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return { '02': true };
    const saved = sessionStorage.getItem('akinoya_unlocked_tracks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { '02': true };
      }
    }
    return { '02': true }; // Track 2 Bingäa early access by default
  });

  // Modal states for track unlocks and video player
  const [selectedTrackForUnlock, setSelectedTrackForUnlock] = useState<VisualizerTrack | null>(null);
  const [trackUnlockInput, setTrackUnlockInput] = useState('');
  const [trackUnlockError, setTrackUnlockError] = useState('');
  const [activePlayingTrack, setActivePlayingTrack] = useState<VisualizerTrack | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    const unsub = planetSoundtrack.subscribe((playing) => {
      setIsPlayingAudio(playing);
    });
    return () => unsub();
  }, []);

  const handleUnlockVisualizers = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passIdInput.trim().toUpperCase().replace('#', '');
    if (
      clean === FOUNDING_PASS_ID ||
      clean === 'AKN-2027-X0914' ||
      clean === 'SILLOWMILL2027'
    ) {
      sessionStorage.setItem('akinoya_visualizers_unlocked', 'true');
      setIsVisualizerUnlocked(true);
      setPassSubView('hub');
      setPassIdError('');
      soundManager.playUnlockChime();
    } else {
      setPassIdError(`Invalid Pass ID. Please enter #${FOUNDING_PASS_ID} as displayed on your card.`);
      soundManager.playError();
    }
  };

  const handleRelockVisualizers = () => {
    sessionStorage.removeItem('akinoya_visualizers_unlocked');
    setIsVisualizerUnlocked(false);
    setPassSubView('overview');
    setPassIdInput('');
    setPassIdError('');
  };

  const handleTrackCardClick = (track: VisualizerTrack) => {
    const isUnlocked = unlockedTracks[track.id] || track.defaultUnlocked;
    if (isUnlocked) {
      setActivePlayingTrack(track);
      if (track.id === '02') {
        planetSoundtrack.play();
      }
    } else {
      setSelectedTrackForUnlock(track);
      setTrackUnlockInput('');
      setTrackUnlockError('');
    }
  };

  const handleVerifyTrackCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrackForUnlock) return;
    const clean = trackUnlockInput.trim().toUpperCase().replace('#', '');
    if (
      clean === selectedTrackForUnlock.code ||
      clean === 'SILLOWMILL2027' ||
      clean === FOUNDING_PASS_ID
    ) {
      const updated = { ...unlockedTracks, [selectedTrackForUnlock.id]: true };
      setUnlockedTracks(updated);
      sessionStorage.setItem('akinoya_unlocked_tracks', JSON.stringify(updated));
      soundManager.playUnlockChime();
      const trackToPlay = selectedTrackForUnlock;
      setSelectedTrackForUnlock(null);
      setTrackUnlockInput('');
      setTrackUnlockError('');
      setActivePlayingTrack(trackToPlay);
    } else {
      setTrackUnlockError(`Incorrect cipher. Hint: enter ${selectedTrackForUnlock.code} or SillowMill2027`);
      soundManager.playError();
    }
  };

  const handleCopyPassId = () => {
    navigator.clipboard?.writeText?.(FOUNDING_PASS_ID);
    setIsCopied(true);
    soundManager.playTone(880, 0.08);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Comic Pre-Order Checkout States (Streamlined Stripe Checkout)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutAptBus, setCheckoutAptBus] = useState("");
  const [checkoutCity, setCheckoutCity] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [isOrderProcessing, setIsOrderProcessing] = useState(false);
  const [waveInventory, setWaveInventory] = useState<{ total: number; available: number }>({
    total: 125,
    available: 125,
  });

  // Load real-time inventory from server — safe JSON parsing guards against plain-text errors
  useEffect(() => {
    fetch("/api/inventory/status")
      .then(async (res) => {
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return null;
        return res.json().catch(() => null);
      })
      .then((data) => {
        if (data && typeof data.available === "number") {
          setWaveInventory({ total: data.total || 125, available: data.available });
        }
      })
      .catch(() => {});
  }, []);

  const handlePreOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");
    setIsOrderProcessing(true);
    soundManager.playTone(660, 0.1);

    try {
      const sanitizedEmail = checkoutEmail.trim().toLowerCase();
      const sanitizedName = checkoutName.trim();
      const sanitizedAddress = checkoutAddress.trim();
      const sanitizedAptBus = checkoutAptBus.trim();
      const sanitizedCity = checkoutCity.trim();

      if (!sanitizedEmail || !sanitizedEmail.includes('@')) {
        setIsOrderProcessing(false);
        setCheckoutError('Please enter a valid email address.');
        return;
      }
      if (!sanitizedName) {
        setIsOrderProcessing(false);
        setCheckoutError('Please enter your full name.');
        return;
      }
      if (!sanitizedAddress) {
        setIsOrderProcessing(false);
        setCheckoutError('Please enter your street and house number.');
        return;
      }
      if (!sanitizedCity) {
        setIsOrderProcessing(false);
        setCheckoutError('Please enter your city and postal code.');
        return;
      }

      const fullAddress = sanitizedAptBus
        ? `${sanitizedAddress}, ${sanitizedAptBus}`
        : sanitizedAddress;

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: sanitizedEmail,
          customerName: sanitizedName,
          shippingAddress: fullAddress,
          apartmentBus: sanitizedAptBus,
          shippingCity: sanitizedCity,
        }),
      });

      let data: any = null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json().catch(() => null);
      }

      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      } else {
        const errorMsg =
          data?.error ||
          (await res.text().catch(() => '')) ||
          'Could not initialize checkout. Please try again.';
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error("Stripe Checkout Error:", err);
      setCheckoutError(err.message || "Could not initiate checkout. Please try again.");
      setIsOrderProcessing(false);
    }
  };

  const handleResetCheckout = () => {
    setIsCheckoutOpen(false);
    setIsOrderProcessing(false);
    setCheckoutError("");
    setCheckoutAptBus("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8 lg:py-10"
    >
      {/* Top Status & Lock Control (Mobile friendly wrapping) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 lg:mb-8 bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:px-6 lg:px-8 lg:py-5">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start">
        {/* Left Column: 3D Holographic VIP Pass Card */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col items-center lg:sticky lg:top-24">
          <div
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            style={isTouchDevice
              ? { touchAction: 'pan-y' }
              : {
                  transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
                  transition: 'transform 0.15s ease-out',
                  touchAction: 'none',
                }
            }
            className="relative w-full max-w-sm lg:max-w-[340px] xl:max-w-[360px] rounded-2xl overflow-hidden bg-black/70 border border-cyan-400/30 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(56,189,248,0.25)] group cursor-pointer"
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
                  <span>ID: #{FOUNDING_PASS_ID}</span>
                  <span>SECTOR 04</span>
                </div>
              </div>

              {/* Quick action button (Download button completely removed) */}
              <div className="pt-3 border-t border-white/10">
                <button
                  onClick={handleCopyPassId}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-mono text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/30 rounded-xl transition-all cursor-pointer min-h-[44px] shadow-[0_0_15px_rgba(56,189,248,0.15)] group"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 font-semibold tracking-wider">COPIED PASS ID</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <span className="tracking-wider">COPY PASS ID</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="text-[11px] font-mono text-white/40 mt-2.5 text-center">
            ✦ Hover or touch the card for a holographic reflection
          </p>
        </div>

        {/* Right Column: Perks and Physical Drop */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4 sm:space-y-6">
          {/* Navigation Tabs (Mobile optimized scrollable / grid) */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl lg:rounded-2xl">
            <button
              onClick={() => setActiveTab('pass')}
              className={`py-2 px-2 text-[11px] sm:text-xs font-medium rounded-lg lg:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px] ${
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
              className={`py-2 px-2 text-[11px] sm:text-xs font-medium rounded-lg lg:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px] ${
                activeTab === 'edition'
                  ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-400/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Comic</span>
            </button>
          </div>

          {/* Tab 1: VIP Perks & Visualizer Hub */}
          {activeTab === 'pass' && (
            <AnimatePresence mode="wait">
              {passSubView === 'overview' ? (
                <motion.div
                  key="pass-overview-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4 lg:space-y-6"
                >
                  {/* If already unlocked, provide a prominent shortcut banner to jump right into the Hub */}
                  {isVisualizerUnlocked ? (
                    <div className="bg-gradient-to-r from-emerald-950/40 via-cyan-950/40 to-black/60 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-5 sm:p-6 lg:p-7 relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-400/40 text-emerald-300 font-semibold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <Unlock className="w-3 h-3 text-emerald-400" />
                            VIP ACCESS ACTIVE
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400/80">11 TRACKS DECRYPTED</span>
                        </div>
                        <h3 className="text-base sm:text-lg lg:text-xl font-display font-bold text-white">
                          Äkinoya Visualizer Archive is Unlocked
                        </h3>
                        <p className="text-[11px] sm:text-xs text-white/60 mt-0.5">
                          Stream all 11 exclusive track visualizers and acoustic sector logs.
                        </p>
                      </div>

                      <button
                        onClick={() => setPassSubView('hub')}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-all cursor-pointer whitespace-nowrap min-h-[44px] shadow-[0_0_15px_rgba(56,189,248,0.3)] shrink-0"
                      >
                        <Video className="w-4 h-4 text-black" />
                        <span>OPEN VISUALIZER HUB →</span>
                      </button>
                    </div>
                  ) : (
                    /* Pass ID Portal Widget */
                    <div className="bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-5 sm:p-6 lg:p-7 relative overflow-hidden shadow-[0_0_25px_rgba(56,189,248,0.12)]">
                      <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex items-center gap-2 mb-2">
                        <Key className="w-4 h-4 text-cyan-400" />
                        <span className="text-[11px] sm:text-xs font-mono text-cyan-300 uppercase tracking-wider font-semibold">
                          VIP VISUALIZER ARCHIVE GATEWAY
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-display font-bold text-white mb-1.5">
                        Visualizer Hub Access
                      </h3>
                      <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed mb-4">
                        Enter your exact Pass ID (copied from your Founding Holder card above) to unlock all 11 visualizers, video telemetry, and early releases.
                      </p>

                      <form onSubmit={handleUnlockVisualizers} className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative flex-1">
                            <Key className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={passIdInput}
                              onChange={(e) => {
                                setPassIdInput(e.target.value);
                                if (passIdError) setPassIdError('');
                              }}
                              placeholder={`Enter Pass ID (e.g. ${FOUNDING_PASS_ID})`}
                              className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 outline-none font-mono tracking-wide transition-colors"
                            />
                          </div>
                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-all cursor-pointer whitespace-nowrap min-h-[42px] shadow-[0_0_15px_rgba(56,189,248,0.3)] flex items-center justify-center gap-2"
                          >
                            <Lock className="w-3.5 h-3.5 text-black" />
                            <span>UNLOCK VISUALIZERS</span>
                          </button>
                        </div>

                        {passIdError && (
                          <div className="flex items-center gap-1.5 text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-lg px-3 py-2">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{passIdError}</span>
                          </div>
                        )}
                      </form>
                    </div>
                  )}

                  {/* Official Community VIP Entitlements */}
                  <div className="bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6 lg:p-7 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

                    <h3 className="text-xs sm:text-sm font-mono tracking-wider text-cyan-300 uppercase mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Official Äkinoya Pass Community Perks</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
                      {PERK_MODULES.map((perk) => {
                        const Icon = perk.icon;
                        const isSubmitted = Boolean(perkSubmitted[perk.id]);

                        return (
                          <motion.div
                            key={perk.id}
                            whileHover={{ scale: 1.015 }}
                            className={`p-4 sm:p-5 lg:p-6 rounded-2xl border transition-all flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative overflow-hidden group ${
                              isSubmitted
                                ? 'bg-gradient-to-br from-cyan-950/30 via-black/50 to-black/70 border-cyan-400/40 shadow-[0_0_20px_rgba(56,189,248,0.12)]'
                                : 'bg-black/40 border-white/10 hover:border-cyan-500/30'
                            }`}
                          >
                            <div>
                              {/* Single Header Row: Video Icon + Number + Title (Left) | COMING SOON Pill Badge (Right) */}
                              <div className="flex items-center justify-between gap-2.5 mb-2.5">
                                {/* Left Side: Video Icon, Section Number, Title */}
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_8px_rgba(56,189,248,0.15)] group-hover:border-cyan-400/50 transition-colors">
                                    <Video className="w-3.5 h-3.5 text-cyan-400" />
                                  </div>
                                  <span className="text-[11px] font-mono text-cyan-400 font-semibold shrink-0">
                                    {perk.number}.
                                  </span>
                                  <h4 className="text-xs sm:text-sm font-display font-bold text-white tracking-wide truncate group-hover:text-cyan-200 transition-colors">
                                    {perk.title}
                                  </h4>
                                </div>

                                {/* Right Side: Refined Dark-Glass COMING SOON Pill Badge (No brackets) */}
                                <div className="shrink-0">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono tracking-wider font-semibold shadow-[0_0_10px_rgba(56,189,248,0.12)] whitespace-nowrap">
                                    <span>COMING SOON</span>
                                    {isSubmitted ? (
                                      <Lock className="w-3 h-3 text-cyan-400 shrink-0" />
                                    ) : (
                                      <Key className="w-3 h-3 text-cyan-400/70 shrink-0" />
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Description */}
                              <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed mb-4">
                                {perk.description}
                              </p>
                            </div>

                            {/* Interactive Code Input Bar / Gated Coming Soon State */}
                            <div className="pt-3 border-t border-white/5 mt-auto">
                              <AnimatePresence mode="wait">
                                {isSubmitted ? (
                                  <motion.div
                                    key="coming-soon-state"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 space-y-1.5 shadow-[inset_0_0_15px_rgba(56,189,248,0.08)]"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 font-semibold">
                                        <Lock className="w-3 h-3 text-cyan-400" />
                                        <span>DEPLOYMENT IMMINENT · COMING SOON</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleResetPerk(perk.id)}
                                        className="text-[9px] font-mono text-white/40 hover:text-white/80 underline cursor-pointer"
                                      >
                                        Re-enter
                                      </button>
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] text-white/70 font-mono leading-relaxed">
                                      {perk.statusText}
                                    </p>
                                  </motion.div>
                                ) : (
                                  <motion.form
                                    key="code-input-form"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.3 }}
                                    onSubmit={(e) => handlePerkCodeSubmit(e, perk.id)}
                                    className="flex gap-1.5"
                                  >
                                    <div className="relative flex-1">
                                      <Key className="w-3.5 h-3.5 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                      <input
                                        type="text"
                                        value={perkInputs[perk.id] || ''}
                                        onChange={(e) => handlePerkInputChange(perk.id, e.target.value)}
                                        placeholder={`Enter code (e.g. ${perk.defaultCode} or Pass ID)`}
                                        className="w-full bg-black/60 border border-white/10 focus:border-cyan-400/60 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] text-white placeholder-white/30 outline-none font-mono tracking-wide transition-colors"
                                      />
                                    </div>
                                    <button
                                      type="submit"
                                      className="px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-mono font-semibold bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap min-h-[34px] flex items-center gap-1 shadow-[0_0_8px_rgba(56,189,248,0.15)]"
                                    >
                                      <Lock className="w-3 h-3" />
                                      <span>VERIFY</span>
                                    </button>
                                  </motion.form>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* Unlocked Visualizer Hub View */
                <motion.div
                  key="pass-hub-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  <div className="bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-5 sm:p-6 lg:p-7 xl:p-8 relative overflow-hidden shadow-[0_0_30px_rgba(56,189,248,0.15)]">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Navigation Bar: Back to Pass Overview button & Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-5">
                      <div>
                        {/* Navigation Back Button (Seamless without losing state) */}
                        <button
                          onClick={() => setPassSubView('overview')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-mono transition-all cursor-pointer mb-2.5 shadow-[0_0_10px_rgba(56,189,248,0.15)]"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>← Back to Pass Overview</span>
                        </button>

                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 font-semibold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <Unlock className="w-3 h-3 text-emerald-400" />
                            VIP ACCESS GRANTED
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400/80">11 PROJECT VISUALIZERS</span>
                        </div>
                        <h2 className="text-base sm:text-lg lg:text-xl font-display font-extrabold text-white tracking-wide">
                          ÄKINOYA VISUALIZER ARCHIVE — VIP ACCESS GRANTED
                        </h2>
                        <p className="text-[11px] sm:text-xs text-white/60 mt-0.5">
                          Click any track to stream visualizers or enter specific decryption keys.
                        </p>
                      </div>

                      <button
                        onClick={handleRelockVisualizers}
                        title="Lock Visualizer Hub and return to Pass Overview"
                        className="self-start sm:self-center text-[10px] font-mono text-white/60 hover:text-white border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3 text-white/50" />
                        <span>Lock Hub</span>
                      </button>
                    </div>

                    {/* 11 Track Visualizer Widgets Grid (Clean 3-column layout on wide screens) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                      {VISUALIZER_TRACKS.map((track, index) => {
                        const isUnlocked = Boolean(unlockedTracks[track.id] || track.defaultUnlocked);

                        return (
                          <motion.div
                            key={track.id}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: index * 0.035 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleTrackCardClick(track)}
                            className={`p-4 lg:p-4.5 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                              isUnlocked
                                ? 'bg-gradient-to-br from-emerald-950/30 via-black/50 to-black/70 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-400'
                                : 'bg-black/40 border-white/10 hover:border-cyan-500/40 hover:bg-black/60 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2.5">
                                {/* Video Indicator Icon */}
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    isUnlocked
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                                      : 'bg-white/5 text-white/40 border border-white/10 group-hover:text-cyan-300 group-hover:border-cyan-500/30'
                                  }`}
                                >
                                  {isUnlocked ? (
                                    <Play className="w-4 h-4 fill-emerald-400 text-emerald-400 ml-0.5" />
                                  ) : (
                                    <Video className="w-4 h-4" />
                                  )}
                                </div>

                                <div>
                                  <div className="text-[10px] font-mono text-cyan-400/80">
                                    TRACK #{track.id}
                                  </div>
                                  <h4 className="text-sm font-display font-bold text-white tracking-wide group-hover:text-cyan-200 transition-colors">
                                    {track.title}
                                  </h4>
                                </div>
                              </div>

                              {isUnlocked ? (
                                <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Key className="w-4 h-4 text-white/40 group-hover:text-cyan-400 shrink-0 transition-colors" />
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2.5 border-t border-white/5 mt-auto">
                              {isUnlocked ? (
                                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 font-semibold flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                                  <span>{track.id === '02' ? 'EARLY ACCESS AVAILABLE' : 'UNLOCKED & READY'}</span>
                                  <Unlock className="w-3 h-3 text-emerald-400 shrink-0" />
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 group-hover:border-cyan-500/30 group-hover:text-cyan-300 flex items-center gap-1.5 transition-colors">
                                  <span>COMING SOON</span>
                                  <Key className="w-3 h-3 text-cyan-400/70 shrink-0" />
                                </span>
                              )}

                              <span className="text-[10px] font-mono text-cyan-400/80 group-hover:text-cyan-300 flex items-center gap-1">
                                {isUnlocked ? 'Watch Stream ▶' : 'Unlock Code 🔑'}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Tab 2: Limited Comic Drop Showcase & Pre-Order */}
          {activeTab === 'edition' && (
            <div className="space-y-4 lg:space-y-6">
              <div className="bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-7 lg:p-8 xl:p-9 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-center">
                  {/* Left: Dedicated Comic Cover Showcase with Isolated Artwork & Custom Widgets */}
                  <div className="lg:col-span-5 flex flex-col items-center w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[300px] xl:max-w-[330px] mx-auto space-y-3">
                    {/* Top Information Widget (Above Artwork) */}
                    <div className="w-full bg-[#050505]/90 backdrop-blur-md border border-cyan-500/30 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-[0_0_15px_rgba(56,189,248,0.12)]">
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-semibold text-cyan-300">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>FIRST EDITION · ISSUE #01</span>
                      </div>
                      <span className="text-[9px] font-mono tracking-widest uppercase text-white/50 border border-white/10 px-1.5 py-0.5 rounded bg-white/5">
                        SILLOW MILL
                      </span>
                    </div>

                    {/* Central Cover Art: Clean, Uninterrupted Illustration (Text overlays removed from image surface) */}
                    <div className="relative group w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_35px_rgba(56,189,248,0.25)] bg-[#050505] transition-transform duration-500 hover:scale-[1.02]">
                      <img
                        src={bingaaComicCover}
                        alt="Bingäa — Limited Edition Comic Cover"
                        className="w-full h-full object-cover object-center"
                      />

                      {/* Subtle bioluminescent glossy sheen overlay (clean ambient lighting only) */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-transparent to-white/10 pointer-events-none" />
                      <div className="absolute inset-0 border border-white/10 rounded-2xl pointer-events-none" />
                    </div>

                    {/* Bottom Information Widget (Below Artwork) */}
                    <div className="w-full bg-[#050505]/90 backdrop-blur-md border border-cyan-500/30 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono shadow-[0_0_15px_rgba(56,189,248,0.12)]">
                      <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
                        <QrCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>QR VERIFIED PHYSICAL DROP</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded">
                        170 GSM
                      </span>
                    </div>

                    {/* Technical details note */}
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-white/50 pt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Foil-Embossed Collector's Hardcover / Softcover</span>
                    </div>
                  </div>

                  {/* Right: Product Details, Pricing (€14,99) & Pre-Order Flow */}
                  <div className="lg:col-span-7 space-y-4 lg:space-y-5 lg:pl-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-cyan-400" />
                        <span className="text-[11px] sm:text-xs font-mono text-cyan-300 uppercase tracking-wider font-semibold">
                          2027 LIMITED COMIC DROP
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-xs font-mono text-amber-300 bg-amber-950/70 border border-amber-500/40 px-2.5 py-1 rounded-full font-semibold shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                        [ SOLD OUT - 125 / 125 COPIES CLAIMED ]
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl sm:text-2xl font-display font-bold text-white mb-1">
                        Bingäa — Limited Edition Comic
                      </h3>
                      <div className="text-xs font-mono text-cyan-400 mb-2">
                        ISSUE #01: THE ORIGIN OF BINGÄA
                      </div>
                      <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                        The definitive physical graphic story of Äkinoya and Sillow Mill. Printed on heavyweight 170gsm archival paper with bioluminescent foil stamping, this collector's volume details the descent into the core world, the emergence of Bingäa, and hidden transmissions. Each copy features an exclusive embedded QR code verification protocol granting priority access to confidential lore, animated side-stories, and subsequent wave drops.
                      </p>
                    </div>

                    {/* Prominent Price & Order Action Bar */}
                    <div className="p-4 sm:p-5 lg:p-6 rounded-xl bg-gradient-to-br from-cyan-950/50 via-black/70 to-black/90 border border-cyan-500/30 flex flex-col gap-4 shadow-[0_0_20px_rgba(56,189,248,0.12)]">
                      <div>
                        <div className="text-[10px] font-mono text-cyan-400/90 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                          <span>Wave 2 — Order Now</span>
                          <span className="text-white/30">·</span>
                          <span className="text-emerald-400 font-bold">{waveInventory.available} Available</span>
                        </div>
                        <div className="flex flex-wrap items-baseline gap-2 mt-1">
                          <span className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                            €14,99
                          </span>
                          <span className="text-[11px] font-mono text-white/50">
                            incl. VAT · Free Global Shipping
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setIsCheckoutOpen(true);
                          soundManager.playTone(660, 0.08);
                        }}
                        className="w-full py-3.5 px-6 rounded-xl text-xs sm:text-sm font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-all cursor-pointer min-h-[44px] shadow-[0_0_20px_rgba(56,189,248,0.35)] flex items-center justify-center gap-2 group hover:scale-[1.01]"
                      >
                        <ShoppingBag className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
                        <span>Order Now — €14,99</span>
                      </button>
                    </div>

                    {/* Wave 1 / Wave 2 Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 lg:p-5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-center sm:text-left">
                      <div>
                        <div className="text-[10px] font-mono text-white/50">WAVE 1</div>
                        <div className="text-xs sm:text-sm font-semibold text-amber-400">Sold Out (125/125)</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-white/50">NEXT WAVE</div>
                        <div className="text-xs sm:text-sm font-semibold text-cyan-200">Wave 2</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-white/50">INVENTORY</div>
                        <div className="text-xs sm:text-sm font-semibold text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                          <span>{waveInventory.available} Available</span>
                        </div>
                      </div>
                    </div>

                    {/* Wave 2 Notification / Waitlist Form */}
                    <div className="pt-1">
                      {!showWaitlistForm && !isWaitlistSubmitted ? (
                        <button
                          onClick={() => setShowWaitlistForm(true)}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-mono text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>Get notified when it's the next wave</span>
                        </button>
                      ) : isWaitlistSubmitted ? (
                        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-2.5 text-xs font-mono">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>✓ You're on the priority whitelist for Wave 2! We'll email you first.</span>
                        </div>
                      ) : (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (waitlistEmail.trim()) {
                              setIsWaitlistSubmitted(true);
                              soundManager.playUnlockChime();
                            }
                          }}
                          className="flex flex-col sm:flex-row gap-2"
                        >
                          <div className="relative flex-1">
                            <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="email"
                              required
                              value={waitlistEmail}
                              onChange={(e) => setWaitlistEmail(e.target.value)}
                              placeholder="Enter your email for Wave 2 updates..."
                              className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-white/40 outline-none font-mono"
                            />
                          </div>
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-xl text-xs font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-colors cursor-pointer whitespace-nowrap min-h-[38px]"
                          >
                            Notify Me
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Track-Specific Code Unlock Modal */}
      <AnimatePresence>
        {selectedTrackForUnlock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-md bg-[#070b12] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(56,189,248,0.25)] overflow-hidden"
            >
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

              <button
                onClick={() => setSelectedTrackForUnlock(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-mono text-cyan-300 uppercase tracking-wider font-semibold">
                  ENCRYPTED TRACK VISUALIZER
                </span>
              </div>

              <h3 className="text-lg font-display font-bold text-white mb-1">
                Decrypt Track #{selectedTrackForUnlock.id}: {selectedTrackForUnlock.title}
              </h3>
              <p className="text-xs text-white/60 mb-5 leading-relaxed">
                Enter the specific cipher key for this visualizer or your VIP Pass ID to decrypt and unlock the stream.
              </p>

              <form onSubmit={handleVerifyTrackCode} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-white/60 mb-1.5">
                    CIPHER CODE (HINT: {selectedTrackForUnlock.code} OR SillowMill2027)
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      autoFocus
                      value={trackUnlockInput}
                      onChange={(e) => {
                        setTrackUnlockInput(e.target.value);
                        if (trackUnlockError) setTrackUnlockError('');
                      }}
                      placeholder={`Enter cipher (e.g. ${selectedTrackForUnlock.code})`}
                      className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/40 outline-none font-mono tracking-wider transition-colors"
                    />
                  </div>
                </div>

                {trackUnlockError && (
                  <div className="flex items-center gap-2 text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{trackUnlockError}</span>
                  </div>
                )}

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTrackForUnlock(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-mono text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-all cursor-pointer min-h-[44px] shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                  >
                    <Unlock className="w-4 h-4 text-black" />
                    <span>DECRYPT</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Playable Video Stream Visualizer Player */}
      <AnimatePresence>
        {activePlayingTrack && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-black/85 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-3xl lg:max-w-4xl bg-[#05080e] border border-cyan-400/40 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(56,189,248,0.25)] flex flex-col"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-black/60 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                  <div>
                    <div className="text-[10px] font-mono text-cyan-400 tracking-wider">
                      VISUALIZER STREAM · TRACK #{activePlayingTrack.id}
                    </div>
                    <h3 className="text-sm sm:text-base font-display font-bold text-white">
                      {activePlayingTrack.title} — Sector 04 Feed
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActivePlayingTrack(null);
                    if (activePlayingTrack.id === '02') {
                      planetSoundtrack.pause();
                    }
                  }}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Visualizer Stage */}
              <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                {/* Background cosmic vista with glowing ambient motion */}
                <img
                  src={akinoyaVistaImg}
                  alt="Äkinoya Vista"
                  className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 animate-pulse"
                  style={{ animationDuration: '8s' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,black_80%)]" />

                {/* Animated holographic audio/video telemetry overlay */}
                <div className="relative z-10 flex flex-col items-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_30px_rgba(56,189,248,0.4)]">
                    <Video className="w-7 h-7 text-cyan-400 animate-pulse" />
                  </div>

                  <div>
                    <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-400/40 text-emerald-300 font-semibold tracking-wider">
                      ● BROADCAST ACTIVE · 4K 60FPS VIP FEED
                    </span>
                    <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white mt-2">
                      {activePlayingTrack.title}
                    </h2>
                    <p className="text-xs font-mono text-cyan-300/80 mt-1">
                      AUDIO MATRIX FREQUENCY · SECTOR 04 TRANSMISSION
                    </p>
                  </div>

                  {/* Pulsing Audio/Telemetry Waveform Bars */}
                  <div className="flex items-center gap-1.5 h-12 pt-2">
                    {[35, 60, 90, 45, 80, 100, 75, 40, 65, 85, 55, 95, 70, 50, 85, 60, 40, 75].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-gradient-to-t from-cyan-500 to-emerald-400 transition-all duration-300"
                        style={{
                          height: `${isPlayingAudio || activePlayingTrack.id !== '02' ? h : 15}%`,
                          animation: 'pulse 1.2s ease-in-out infinite alternate',
                          animationDelay: `${i * 0.08}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Player Controls Bar */}
              <div className="px-4 sm:px-6 py-4 bg-[#080d16] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (activePlayingTrack.id === '02') {
                        planetSoundtrack.togglePlay();
                      } else {
                        setIsPlayingAudio(!isPlayingAudio);
                        soundManager.playTone(520, 0.1);
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-semibold transition-all cursor-pointer shadow-[0_0_12px_rgba(56,189,248,0.3)] min-h-[40px]"
                  >
                    {isPlayingAudio ? (
                      <>
                        <Pause className="w-4 h-4 fill-black" />
                        <span>PAUSE STREAM</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-black ml-0.5" />
                        <span>PLAY STREAM</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5 text-xs font-mono text-white/60">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <span>
                      {activePlayingTrack.id === '02'
                        ? 'Master Planetary Soundtrack (BWS)'
                        : 'Sector Audio Synthesizer Matrix'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-cyan-400/80">
                  TOKEN #AKN-2027 · VIP EXCLUSIVE
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Unified Comic Pre-Order Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto pb-16 sm:pb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-xl md:max-w-2xl bg-[#070b12] border border-cyan-500/40 rounded-2xl p-5 sm:p-7 lg:p-8 shadow-[0_0_60px_rgba(56,189,248,0.25)] overflow-hidden my-6 mb-12 sm:mb-6"
            >
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              <button
                onClick={handleResetCheckout}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingBag className="w-4 h-4 text-cyan-400" />
                    <span className="text-[11px] font-mono text-cyan-300 uppercase tracking-wider font-semibold">
                      SECURE ORDER CHECKOUT
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-bold text-white mb-4">
                    Bingäa — Limited Edition Comic
                  </h3>

                  {/* Order Summary Line */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/60 border border-white/10 mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={bingaaComicCover}
                        alt="Comic cover"
                        className="w-11 h-14 object-cover rounded-lg border border-cyan-500/30"
                      />
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-white">Bingäa Issue #01 — Collector's Print</div>
                        <div className="text-[10px] font-mono text-white/50">Wave 2 Allocation · QR Code Verified</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-display font-bold text-cyan-300">€14,99</div>
                      <div className="text-[10px] font-mono text-emerald-400">Free Express Delivery</div>
                    </div>
                  </div>

                  {/* Stripe Supported Payment Methods Showcase */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-b from-cyan-950/40 via-black/80 to-black border border-cyan-500/30 shadow-[0_0_20px_rgba(56,189,248,0.12)] mb-4 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                        <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                        <span>POWERED BY STRIPE CHECKOUT</span>
                      </div>
                      <span className="text-[9px] text-white/50 font-mono">🔒 256-Bit TLS</span>
                    </div>

                    <p className="text-xs text-white/70 font-mono leading-relaxed">
                      Instant verification with Bancontact, iDEAL, Apple Pay, Google Pay, or Credit/Debit card.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-center">
                      <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-white/80 flex flex-col items-center justify-center">
                        <span className="text-cyan-400 font-bold">Bancontact</span>
                        <span className="text-[9px] text-white/40">Instant BE</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-white/80 flex flex-col items-center justify-center">
                        <span className="text-purple-400 font-bold">iDEAL</span>
                        <span className="text-[9px] text-white/40">Netherlands</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-white/80 flex flex-col items-center justify-center">
                        <span className="text-emerald-400 font-bold">Apple / GPay</span>
                        <span className="text-[9px] text-white/40">1-Touch Pay</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-white/80 flex flex-col items-center justify-center">
                        <span className="text-white font-bold">Cards</span>
                        <span className="text-[9px] text-white/40">Visa / MC / Amex</span>
                      </div>
                    </div>
                  </div>

                  {/* Checkout Form */}
                  <form onSubmit={handlePreOrderSubmit} className="space-y-3.5">
                    {/* Contact & Shipping Details */}
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                            FULL NAME
                          </label>
                          <input
                            type="text"
                            autoComplete="name"
                            value={checkoutName}
                            onChange={(e) => setCheckoutName(e.target.value)}
                            placeholder="Alex Thorne"
                            className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                            EMAIL ADDRESS
                          </label>
                          <input
                            type="text"
                            inputMode="email"
                            autoComplete="email"
                            value={checkoutEmail}
                            onChange={(e) => setCheckoutEmail(e.target.value)}
                            placeholder="alex@example.com"
                            className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* Street & House No. + Bus/Apt */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                            STREET & HOUSE NO.
                          </label>
                          <input
                            type="text"
                            autoComplete="street-address"
                            value={checkoutAddress}
                            onChange={(e) => setCheckoutAddress(e.target.value)}
                            placeholder="Street & House No. (e.g. Keizersstraat 10)"
                            className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                            BUS / APT (OPTIONAL)
                          </label>
                          <input
                            type="text"
                            autoComplete="address-line2"
                            value={checkoutAptBus}
                            onChange={(e) => setCheckoutAptBus(e.target.value)}
                            placeholder="Bus / Apt (Optional)"
                            className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* City & Postal Code */}
                      <div>
                        <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                          CITY & POSTAL CODE
                        </label>
                        <input
                          type="text"
                          autoComplete="postal-code"
                          value={checkoutCity}
                          onChange={(e) => setCheckoutCity(e.target.value)}
                          placeholder="e.g. 2000 Antwerpen"
                          className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Inline Error Message */}
                    {checkoutError && (
                      <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-mono flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1 leading-relaxed">{checkoutError}</div>
                      </div>
                    )}

                    {/* Submit Action Button */}
                    <button
                      type="submit"
                      disabled={isOrderProcessing}
                      className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed text-black transition-all cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.3)] flex items-center justify-center gap-2 mt-2"
                    >
                      {isOrderProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>INITIALIZING STRIPE CHECKOUT...</span>
                        </>
                      ) : (
                        <>
                          <span>CONTINUE TO STRIPE CHECKOUT (€14,99)</span>
                          <ArrowRight className="w-4 h-4 text-black" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Legal Footprint */}
                  <div className="mt-4 pt-3 border-t border-white/10 text-center text-[10px] font-mono text-white/40 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                    <span>KBO: 1041.720.513</span>
                    <span className="text-white/20">·</span>
                    <span>VAT: BE 1041.720.513</span>
                    <span className="text-white/20">·</span>
                    <span>Support: <a href="mailto:Odi@sillowmill.com" className="text-cyan-300 hover:underline">Odi@sillowmill.com</a></span>
                  </div>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
