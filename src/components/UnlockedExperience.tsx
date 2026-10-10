import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import passCardImg from '../assets/images/akinoya_pass_card_1790852652003.jpg';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import bingaaComicCover from '../assets/images/bingaa_comic_cover.jpg';
import visualizerThumbnailImg from '../assets/images/visualizer_thumbnail.png';
import moodboardImg from '../assets/images/Mood.png';
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
  ClipboardPaste,
  Eye,
  Globe2,
  Bell,
  Mail,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  AudioWaveform,
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
  Gem,
  User,
  Download,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { planetSoundtrack } from '../utils/soundtrack';
import { useHolderName, isValidPassId, TOTAL_EDITION_LIMIT } from '../utils/holder';
import { useVipAccess } from '../context/VipAccessContext';
import {
  BINGAA_PDF_URL,
  BINGAA_PDF_FILENAME,
  BINGAA_COVER_URL,
  BINGAA_COVER_FILENAME,
  deriveEditionNumber,
  downloadCertificatePng,
  normalizePassId,
  useCertificate,
  BingaaCertificate,
} from '../utils/certificate';
import { CertificateOfAuthenticity } from './CertificateOfAuthenticity';
import { CommunityAuthModal } from './CommunityAuthModal';

// pdf.js is heavy — only fetch the reader chunk when a verified holder opens the comic
const BingaaComicReader = lazy(() => import('./BingaaComicReader'));

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
  bullets: string[];
  icon: React.ElementType;
}

const PERK_MODULES: PerkModule[] = [
  {
    id: 'animation',
    number: '01',
    category: 'ANIMATION & 4K',
    title: 'Animation & Visual Workflows',
    bullets: [
      'Step-by-step 3D & animation pipeline breakdowns',
      'Exact AI/animation prompt frameworks',
      'Raw storyboards & 4K cinematic exports',
    ],
    icon: Film,
  },
  {
    id: 'vault',
    number: '02',
    category: 'MUSIC & DAW',
    title: 'Unreleased Music Vault & DAW Templates',
    bullets: [
      'Unreleased tracks & VIP audio masters',
      'Downloadable DAW project templates',
      'WAV STEM packs & sound design breakdowns',
    ],
    icon: Radio,
  },
  {
    id: 'governance',
    number: '03',
    category: 'WORLDBUILDING & LORE',
    title: 'Worldbuilding, Branding & Character Lore',
    bullets: [
      'Character lore PDFs & moodboards',
      'Sci-fi branding & creative growth strategies',
      'Direct governance voting on lore decisions',
    ],
    icon: Vote,
  },
  {
    id: 'drops',
    number: '04',
    category: '4K ASSETS & DROPS',
    title: 'Exclusive 4K Assets & Merch Drops',
    bullets: [
      'High-res 4K wallpapers for desktop & mobile',
      'Downloadable project blueprints & digital asset bundles',
      'Merch whitelist priority & discounts',
    ],
    icon: Package,
  },
];

interface UnlockedExperienceProps {
  onLockPortal: () => void;
  onToggleViewMode: (mode: 'orbit' | 'surface') => void;
  currentViewMode: 'orbit' | 'surface';
  onNavigateToVerify?: (tokenId?: string) => void;
  isVip?: boolean;
  onNavigateToPassport?: () => void;
}

export const UnlockedExperience: React.FC<UnlockedExperienceProps> = ({
  onLockPortal,
  onToggleViewMode,
  currentViewMode,
  onNavigateToVerify,
  isVip = false,
  onNavigateToPassport,
}) => {
  const [activeTab, setActiveTab] = useState<'pass' | 'edition' | 'assets'>('pass');
  const holderName = useHolderName();
  const isVipMode = Boolean(isVip);
  const [passSubView, setPassSubView] = useState<'overview' | 'hub'>('overview');

  // Verified holder assets: active pass is the NFC-bound token for this device session
  const { nfcToken } = useVipAccess();
  const activePassId = isValidPassId(nfcToken) ? normalizePassId(nfcToken) : FOUNDING_PASS_ID;
  const activeEditionNumber = deriveEditionNumber(activePassId);
  const editionDisplay = activeEditionNumber;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const bingaaCertificate = useCertificate(activePassId);

  // Human Certification Protocol active: certified directly for VIP holders
  const activeCertificate: BingaaCertificate = bingaaCertificate || {
    certificateId: `AKN-COA-${String(activeEditionNumber).padStart(4, '0')}`,
    title: 'Bingäa Issue #1 — Certificate of Authenticity',
    passId: activePassId,
    holderName: holderName || 'Founding VIP Member',
    editionNumber: activeEditionNumber,
    editionTotal: TOTAL_EDITION_LIMIT,
    status: 'ACTIVE_VERIFIED',
    emailVerified: true,
    claimedAt: '2026-10-09T00:00:00.000Z',
    signatureAlgorithm: 'HMAC-SHA256-DETERMINISTIC',
    signature: 'Sillow Mill · Creative Syndicate',
  };

  const handlePerksStripeCheckout = async () => {
    setIsSubscribing(true);
    soundManager.playTone(660, 0.08);

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'membership',
          product: 'community_membership',
          customerName: holderName || 'Community Member',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      if (data?.error) {
        soundManager.playError();
        alert(`Checkout Notice: ${data.error}`);
      }
    } catch {
      soundManager.playError();
      alert('Stripe subscription endpoint initializing.');
    } finally {
      setIsSubscribing(false);
    }
  };
  const [showComicReader, setShowComicReader] = useState(false);
  const [showCoverPreview, setShowCoverPreview] = useState(false);
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
  const [pasteFeedback, setPasteFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handlePastePassId = async (target: 'hub' | 'track' = 'hub') => {
    try {
      let text = '';
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText();
      }

      const trimmed = text ? text.trim() : '';
      const valueToFill = trimmed || FOUNDING_PASS_ID;

      if (target === 'hub') {
        setPassIdInput(valueToFill);
        if (passIdError) setPassIdError('');
      } else {
        setTrackUnlockInput(valueToFill);
        if (trackUnlockError) setTrackUnlockError('');
      }

      soundManager.playTone(880, 0.08);
      setPasteFeedback({
        message: trimmed ? `Pasted: ${trimmed}` : `Filled Pass ID: #${FOUNDING_PASS_ID}`,
        type: 'success',
      });
      setTimeout(() => setPasteFeedback(null), 2500);
    } catch (err) {
      console.warn('Clipboard read error, fallback to FOUNDING_PASS_ID:', err);
      if (target === 'hub') {
        setPassIdInput(FOUNDING_PASS_ID);
        if (passIdError) setPassIdError('');
      } else {
        setTrackUnlockInput(FOUNDING_PASS_ID);
        if (trackUnlockError) setTrackUnlockError('');
      }
      soundManager.playTone(880, 0.08);
      setPasteFeedback({
        message: `Filled Pass ID: #${FOUNDING_PASS_ID}`,
        type: 'success',
      });
      setTimeout(() => setPasteFeedback(null), 2500);
    }
  };

  const [isVisualizerUnlocked, setIsVisualizerUnlocked] = useState<boolean>(() => {
    if (isVipMode) return true;
    return typeof window !== 'undefined' && sessionStorage.getItem('akinoya_visualizers_unlocked') === 'true';
  });

  useEffect(() => {
    if (isVipMode) {
      setIsVisualizerUnlocked(true);
    }
  }, [isVipMode]);

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

  const handleDirectGuestUnlockHub = () => {
    sessionStorage.setItem('akinoya_visualizers_unlocked', 'true');
    setIsVisualizerUnlocked(true);
    setActiveTab('pass');
    setPassSubView('hub');
    soundManager.playUnlockChime();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleTrackCardClick = (track: VisualizerTrack) => {
    const isUnlocked = isVipMode || unlockedTracks[track.id] || track.defaultUnlocked;
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
    total: 100,
    available: 100,
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
          setWaveInventory({ total: data.total || 100, available: data.available });
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

  const renderPassCardWidget = () => (
    <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center">
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
        className="relative w-full max-w-sm sm:max-w-[360px] rounded-2xl overflow-hidden bg-black/70 border border-cyan-400/30 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(56,189,248,0.25)] group cursor-pointer"
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
          {/* Top badges: In VIP mode show Member # and Access Granted. In Guest mode show ONLY ONE clean badge at top-right to prevent any mobile collision */}
          {isVipMode ? (
            <>
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/70 backdrop-blur-md border border-cyan-400/30 rounded-full text-[10px] font-mono text-cyan-300 max-w-[55%]">
                <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">• FOUNDING MEMBER #{editionDisplay} OF 100</span>
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/85 backdrop-blur-md border border-emerald-500/50 rounded-full text-[10px] font-mono font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
                <span>• ACCESS GRANTED</span>
              </div>
            </>
          ) : (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/85 backdrop-blur-md border border-amber-500/50 rounded-full text-[10px] font-mono font-bold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] shrink-0 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.9)]" />
              <span>• VIP ACCESS 100 / 100 CLAIMED</span>
            </div>
          )}
        </div>

        {/* Card Details Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-[#060c14] to-[#03060a] border-t border-cyan-500/20">
          <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
            <span className="text-[11px] sm:text-xs font-mono text-white/50 tracking-wider truncate">
              {isVipMode ? 'ÄKINOYA VIP PASS' : 'GUEST ÄKINOYA PASS'}
            </span>
            {isVipMode ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-mono font-semibold text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)] shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>• ACCESS GRANTED</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-[10px] font-mono font-semibold text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)] shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span>VIP ACCESS 100 / 100 CLAIMED</span>
              </span>
            )}
          </div>

          <div className="space-y-1 mb-4">
            <div className="text-xs sm:text-sm font-display font-bold text-white tracking-wider">
              {isVipMode ? 'SILLOW MILL ARCHIVE HOLDER' : 'SILLOW MILL GUEST HOLDER'}
            </div>
            <div className="text-[11px] sm:text-xs font-mono text-cyan-400/80 flex items-center justify-between">
              <span>{isVipMode ? `ID: #${activePassId}` : 'ACCESS: PUBLIC GUEST'}</span>
              <span>{isVipMode ? 'FOUNDING BATCH' : 'PUBLIC ACCESS'}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            {isVipMode ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyPassId}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-mono text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/30 rounded-xl transition-all cursor-pointer min-h-[44px] shadow-[0_0_15px_rgba(56,189,248,0.15)] group"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 font-semibold tracking-wider text-[11px] truncate">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="tracking-wider text-[11px] truncate">COPY PASS ID</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (onNavigateToPassport) {
                      onNavigateToPassport();
                    } else if (onNavigateToVerify) {
                      onNavigateToVerify(activePassId);
                    } else if (typeof window !== 'undefined') {
                      window.location.href = `/verify/${activePassId}`;
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-mono font-semibold text-cyan-300 hover:text-white bg-black/60 hover:bg-cyan-950/80 border border-cyan-500/30 hover:border-cyan-400 rounded-xl transition-all cursor-pointer shadow-[0_0_10px_rgba(56,189,248,0.1)] min-h-[44px]"
                  title="View Digital Passport HUD & Verification"
                >
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="tracking-wider text-[11px] truncate">DIGITAL PASSPORT</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleDirectGuestUnlockHub}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-mono font-bold text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 rounded-xl transition-all cursor-pointer min-h-[46px] shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:scale-[1.01]"
              >
                <Unlock className="w-4 h-4 text-black shrink-0" />
                <span className="tracking-wider">UNLOCK VISUALIZER HUB</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] font-mono text-white/40 mt-2.5 text-center">
        ✦ Hover or touch the card for a holographic reflection
      </p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-2.5 xs:px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-8 lg:py-10"
    >
      {/* Top Status & Lock Control (Mobile friendly wrapping) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8 bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 xs:p-4 sm:px-6 lg:px-8 lg:py-5">
        <div className="flex items-center gap-3 min-w-0 max-w-full">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.25)] shrink-0">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] sm:text-xs font-mono text-cyan-400 tracking-wider shrink-0">PORTAL ACTIVE</span>
              <span className="text-white/30 text-xs">·</span>
              <span className="text-[10px] sm:text-xs text-white/60 font-mono truncate">
                {isVipMode && holderName ? `HOLDER: ${holderName.toUpperCase()}` : 'TOKEN #AKN-2027'}
              </span>
            </div>
            <h2 className="text-sm sm:text-lg font-display font-bold text-white tracking-wide break-words">
              {isVipMode && holderName ? `Welcome to Äkinoya, ${holderName} — Unlocked` : 'Welcome to Äkinoya — Unlocked'}
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


      {/* Main Tabs and Content Area */}
      <div className="space-y-4 sm:space-y-6 w-full">
        {/* Navigation Tabs (Mobile optimized scrollable / grid) */}
        <div className={`grid ${isVipMode ? 'grid-cols-3' : 'grid-cols-2'} gap-1 xs:gap-1.5 p-1 xs:p-1.5 bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl lg:rounded-2xl`}>
            <button
              onClick={() => setActiveTab('pass')}
              className={`py-2 px-1 xs:px-2 text-[10.5px] xs:text-[11px] sm:text-xs font-medium rounded-lg lg:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 xs:gap-1.5 min-h-[38px] sm:min-h-[40px] ${
                activeTab === 'pass'
                  ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-400/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Compass className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
              <span className="truncate">Pass Perks</span>
            </button>
            <button
              onClick={() => setActiveTab('edition')}
              className={`py-2 px-1 xs:px-2 text-[10.5px] xs:text-[11px] sm:text-xs font-medium rounded-lg lg:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 xs:gap-1.5 min-h-[38px] sm:min-h-[40px] ${
                activeTab === 'edition'
                  ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-400/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <BookOpen className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
              <span className="truncate">Comic</span>
            </button>
            {isVipMode && (
              <button
                onClick={() => setActiveTab('assets')}
                className={`py-2 px-1 xs:px-2 text-[10.5px] xs:text-[11px] sm:text-xs font-medium rounded-lg lg:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 xs:gap-1.5 min-h-[38px] sm:min-h-[40px] ${
                  activeTab === 'assets'
                    ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-400/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Gem className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
                <span className="truncate">My Assets</span>
              </button>
            )}
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
                  {/* Visualizer Hub Showcase Widget with 16:9 Cinematic Thumbnail */}
                  <div className="bg-gradient-to-r from-cyan-950/40 via-black/70 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-4 sm:p-6 lg:p-7 relative overflow-hidden shadow-[0_0_30px_rgba(56,189,248,0.15)]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 lg:gap-8">
                      {/* 16:9 Cinematic Thumbnail Container */}
                      <div
                        onClick={() => {
                          if (isVipMode || isVisualizerUnlocked) {
                            setPassSubView('hub');
                          } else {
                            handleDirectGuestUnlockHub();
                          }
                        }}
                        className="w-full md:w-[360px] lg:w-[420px] aspect-video shrink-0 rounded-xl overflow-hidden relative group border border-cyan-500/40 shadow-[0_0_25px_rgba(56,189,248,0.2)] bg-black/80 cursor-pointer"
                      >
                        <img
                          src={visualizerThumbnailImg}
                          alt="Don't Need — Official Visualizer Preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                        {/* Play button overlay with hover glow */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(56,189,248,0.4)] group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                            <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5 fill-current" />
                          </div>
                        </div>

                        {/* Top Left Badge on Thumbnail */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-cyan-400/40 text-[10px] font-mono text-cyan-300">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>TRACK 01 · DON'T NEED</span>
                        </div>

                        {/* Bottom Right Duration / 4K Pill */}
                        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/20 text-[9px] font-mono text-white/80">
                          4K CINEMATIC
                        </div>
                      </div>

                      {/* Track Metadata & Action Controls */}
                      <div className="flex-1 flex flex-col justify-between w-full space-y-3 sm:space-y-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400/40 text-cyan-300 font-semibold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                              <AudioWaveform className="w-3 h-3 text-cyan-400" />
                              {(isVipMode || isVisualizerUnlocked) ? 'ARCHIVE ACCESS ACTIVE' : 'VISUALIZER HUB GATEWAY'}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                              11 TRACKS DECRYPTED
                            </span>
                          </div>

                          <h3 className="text-lg sm:text-xl lg:text-2xl font-display font-bold text-white tracking-wide leading-tight">
                            Äkinoya Visualizer Archive
                          </h3>
                          <p className="text-xs sm:text-sm font-sans text-white/70 leading-relaxed mt-1.5">
                            Experience 4K reactive telemetry visualizers and acoustic logs for all 11 project tracks—including the featured "Don't Need" and "Bingäa" animations.
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                          {(isVipMode || isVisualizerUnlocked) ? (
                            <button
                              onClick={() => setPassSubView('hub')}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl text-xs sm:text-sm font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition-all cursor-pointer min-h-[46px] shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:scale-[1.01]"
                            >
                              <AudioWaveform className="w-4 h-4 text-black" />
                              <span>OPEN VISUALIZER HUB →</span>
                            </button>
                          ) : (
                            <button
                              onClick={handleDirectGuestUnlockHub}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl text-xs sm:text-sm font-mono font-bold text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 transition-all cursor-pointer min-h-[46px] shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:scale-[1.01]"
                            >
                              <Unlock className="w-4 h-4 text-black shrink-0" />
                              <span>UNLOCK VISUALIZER HUB</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Master Widget: COMMUNITY PERKS & HUB */}
                  <div className="bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-5 sm:p-6 lg:p-7 relative overflow-hidden shadow-[0_0_30px_rgba(56,189,248,0.12)] space-y-5 sm:space-y-6">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Header & Access / Pricing Bar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-semibold tracking-wider flex items-center gap-1.5 shadow-[0_0_8px_rgba(56,189,248,0.15)]">
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            COMMUNITY PORTAL
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                            4 MEMBER ENTITLEMENTS
                          </span>
                        </div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-display font-extrabold text-white tracking-wide">
                          COMMUNITY PERKS &amp; HUB
                        </h2>
                        <p className="text-xs sm:text-sm font-sans text-white/65 mt-1 max-w-xl">
                          Monthly recurring pass to unreleased music vaults, animation early access, voting rights &amp; lore governance.
                        </p>
                      </div>

                      {/* Access / Pricing Bar inside widget top */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                        <a
                          href="/community"
                          className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-mono font-bold text-black bg-cyan-400 hover:bg-cyan-300 transition-all cursor-pointer min-h-[44px] shadow-[0_0_15px_rgba(56,189,248,0.25)] hover:scale-[1.01]"
                        >
                          <Sparkles className="w-4 h-4 text-black shrink-0" />
                          <span>COMMUNITY HUB →</span>
                        </a>

                        <button
                          type="button"
                          disabled={isSubscribing}
                          onClick={handlePerksStripeCheckout}
                          className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-mono font-bold text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 transition-all cursor-pointer min-h-[44px] shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:scale-[1.01]"
                        >
                          <CreditCard className="w-4 h-4 text-black shrink-0" />
                          <span>{isSubscribing ? 'INITIALIZING STRIPE...' : 'ACCESS NOW — €5/MONTH'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsAuthModalOpen(true)}
                          className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-mono font-semibold text-cyan-300 hover:text-white bg-black/60 hover:bg-cyan-950/80 border border-cyan-500/30 hover:border-cyan-400 transition-all cursor-pointer min-h-[44px] shadow-[0_0_15px_rgba(56,189,248,0.1)] hover:scale-[1.01]"
                        >
                          <Key className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>ENTER ACCESS KEY / SIGN IN</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
                      {PERK_MODULES.map((perk) => {
                        const Icon = perk.icon;

                        return (
                          <motion.div
                            key={perk.id}
                            whileHover={{ scale: 1.015 }}
                            className="p-4 sm:p-5 lg:p-6 rounded-2xl border transition-all flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative overflow-hidden group bg-black/50 border-white/10 hover:border-cyan-500/30"
                          >
                            <div>
                              {/* Header Row: Icon + Number + Title (Left) | Category Badge (Right) */}
                              <div className="flex items-center justify-between gap-2.5 mb-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_8px_rgba(56,189,248,0.15)] group-hover:border-cyan-400/50 transition-colors">
                                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                                  </div>
                                  <span className="text-[11px] font-mono text-cyan-400 font-semibold shrink-0">
                                    {perk.number}.
                                  </span>
                                  <h4 className="text-xs sm:text-sm font-display font-bold text-white tracking-wide truncate group-hover:text-cyan-200 transition-colors">
                                    {perk.title}
                                  </h4>
                                </div>

                                <div className="shrink-0">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono tracking-wider font-semibold whitespace-nowrap">
                                    {perk.category}
                                  </span>
                                </div>
                              </div>

                              {/* Bulleted Value Triggers */}
                              <ul className="space-y-1.5 mb-4 text-[11px] sm:text-xs text-white/75 font-sans">
                                {perk.bullets.map((b, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-cyan-400 font-bold shrink-0 mt-0.5">✓</span>
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Clean Status Line highlighting €5/month */}
                            <div className="pt-3 border-t border-white/5 mt-auto flex items-center justify-between text-[10.5px] font-mono text-cyan-400/80">
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-cyan-400" />
                                <span>INCLUDED WITH €5/MO PASS</span>
                              </span>
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
                        const isTrack01 = track.id === '01';
                        const isTrack02 = track.id === '02';
                        const isProducedTrack = isTrack01 || isTrack02;

                        return (
                          <motion.div
                            key={track.id}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: index * 0.035 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleTrackCardClick(track)}
                            className={`p-4 lg:p-4.5 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                              isProducedTrack
                                ? 'bg-gradient-to-br from-emerald-950/30 via-black/50 to-black/70 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-400'
                                : 'bg-black/40 border-white/10 hover:border-amber-500/30 hover:bg-black/60 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2.5">
                                {/* Video Indicator Icon */}
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    isProducedTrack
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                                      : 'bg-white/5 text-white/40 border border-white/10 group-hover:text-amber-300 group-hover:border-amber-500/30'
                                  }`}
                                >
                                  {isProducedTrack ? (
                                    <Play className="w-4 h-4 fill-emerald-400 text-emerald-400 ml-0.5" />
                                  ) : (
                                    <AudioWaveform className="w-4 h-4" />
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

                              {isProducedTrack ? (
                                <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Lock className="w-4 h-4 text-amber-400/70 shrink-0" />
                              )}
                            </div>

                            {track.id === '01' && (
                              <div className="w-full aspect-video rounded-lg overflow-hidden my-2.5 relative group/thumb border border-cyan-500/30">
                                <img
                                  src={visualizerThumbnailImg}
                                  alt="Don't Need Visualizer Preview"
                                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                                  <div className="w-10 h-10 rounded-full bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.4)]">
                                    <Play className="w-4 h-4 ml-0.5 fill-current" />
                                  </div>
                                </div>
                              </div>
                            )}

                            {track.id === '02' && (
                              <div className="w-full aspect-video rounded-lg overflow-hidden my-2.5 relative group/thumb border border-cyan-500/30">
                                <img
                                  src={moodboardImg}
                                  alt="Bingäa Visualizer Preview"
                                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                                  <div className="w-10 h-10 rounded-full bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.4)]">
                                    <Play className="w-4 h-4 ml-0.5 fill-current" />
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2.5 border-t border-white/5 mt-auto">
                              {isTrack01 ? (
                                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 font-semibold flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                                  <span>ARTWORK UNLOCKED 🔓</span>
                                </span>
                              ) : isTrack02 ? (
                                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 font-semibold flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                                  <span>EARLY ACCESS PREVIEW 🔓</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-400/30 text-amber-300/90 font-semibold flex items-center gap-1.5 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                                  <span>RELEASE SCHEDULED 🔒</span>
                                </span>
                              )}

                              <span className="text-[10px] font-mono text-cyan-400/80 group-hover:text-cyan-300 flex items-center gap-1">
                                {isProducedTrack ? 'Watch Stream ▶' : 'Transmission Pending'}
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

                    {/* Central Cover Art: Clean, Uninterrupted Illustration with interactive reader trigger */}
                    <button
                      type="button"
                      onClick={() => setShowComicReader(true)}
                      className="relative group w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_35px_rgba(56,189,248,0.25)] bg-[#050505] transition-transform duration-500 hover:scale-[1.02] cursor-pointer text-left block"
                      aria-label="Open Bingäa comic reader"
                    >
                      <img
                        src={BINGAA_COVER_URL}
                        alt="Sillow Mill — Bingäa (Collector's Graphic Novel) Cover"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                      />

                      {/* Subtle bioluminescent glossy sheen overlay (clean ambient lighting only) */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-transparent to-white/10 pointer-events-none" />
                      <div className="absolute inset-0 border border-white/10 rounded-2xl pointer-events-none" />

                      {/* Hover action prompt overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3 px-2">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/90 border border-cyan-400/50 text-[11px] font-mono font-semibold text-cyan-200 shadow-[0_0_12px_rgba(56,189,248,0.3)]">
                          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{isVipMode && bingaaCertificate ? 'Read Full Comic' : 'Read 2-Page Preview'}</span>
                        </span>
                      </div>
                    </button>

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
                      {isVipMode ? (
                        <span className="text-[10px] sm:text-xs font-mono px-3 py-1 rounded-full font-bold inline-flex items-center justify-center gap-1.5 backdrop-blur-sm text-amber-300 bg-amber-950/80 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)] animate-pulse shrink-0" />
                          <span className="truncate">• YOU OWN EDITION #{editionDisplay} OF 100</span>
                        </span>
                      ) : (
                        <span className="text-[9.5px] xs:text-[10px] sm:text-xs font-mono px-3 py-1 rounded-full font-semibold inline-flex items-center justify-center gap-1.5 backdrop-blur-sm text-amber-300 bg-amber-950/70 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)] animate-pulse shrink-0" />
                          <span className="truncate">• COMICBOOKS 100 / 100 CLAIMED</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl sm:text-2xl font-display font-bold text-white mb-1">
                        Sillow Mill — Bingäa (Collector's Graphic Novel)
                      </h3>
                      <div className="text-xs font-mono text-cyan-400 mb-3">
                        ISSUE #01: THE ORIGIN OF BINGÄA
                      </div>
                      <div className="space-y-3 text-xs sm:text-sm text-white/80 leading-relaxed font-sans">
                        <p>
                          The definitive physical graphic story and official 2D blueprint of the Sillow Mill universe. Printed on heavyweight 170gsm archival paper with bioluminescent foil stamping, this collector's volume details the origin story—from an iconic snow dance in Leuven to the first convergence of Sillow, Odi, and Mill on the core world of Äkinoya.
                        </p>

                        <div className="pt-1">
                          <span className="font-semibold text-white tracking-wide block mb-1.5 font-display text-xs sm:text-sm">
                            Key Features:
                          </span>
                          <ul className="space-y-2 text-white/70 text-xs sm:text-[13px]">
                            <li className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-1 shrink-0 text-sm leading-none">•</span>
                              <span>
                                <strong className="text-white font-medium">The Origin Story:</strong> Features hand-drawn 2D blueprint panels, production sketches, and final 3D character renders.
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-1 shrink-0 text-sm leading-none">•</span>
                              <span>
                                <strong className="text-white font-medium">Integrated Lore:</strong> Explains the foundational lore driving all upcoming EPs and animated releases.
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-1 shrink-0 text-sm leading-none">•</span>
                              <span>
                                <strong className="text-white font-medium">Äkinoya Pass Access:</strong> Embedded QR code verification protocol grants priority access to confidential lore, animated visualizers ("Don't Need" &amp; "Bingäa"), unreleased music, and future wave drops.
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic VIP Ownership or Public Pre-Order Bar */}
                    {isVipMode ? (
                      <div className="p-4 sm:p-5 lg:p-6 rounded-xl bg-gradient-to-br from-amber-950/30 via-black/70 to-black/90 border border-amber-500/40 flex flex-col gap-4 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
                        <div>
                          <div className="text-[10px] font-mono text-amber-300 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>FOUNDING MEMBER ASSET · INCLUDED WITH PASS</span>
                          </div>
                          <div className="flex flex-wrap items-baseline gap-2 mt-1">
                            <span className="text-lg sm:text-xl font-display font-extrabold text-white tracking-tight">
                              Edition #{editionDisplay} of 100 Owned
                            </span>
                            <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded">
                              ● ACCESS UNLOCKED
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs font-mono text-white/60 mt-1">
                            Your physical hardcover copy is included with your Äkinoya Founding Pass. Read the full high-res digital release now.
                          </p>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => setShowComicReader(true)}
                            className="w-full py-3.5 px-6 rounded-xl text-xs sm:text-sm font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition-all cursor-pointer min-h-[46px] shadow-[0_0_20px_rgba(56,189,248,0.35)] flex items-center justify-center gap-2 group hover:scale-[1.01]"
                          >
                            <BookOpen className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
                            <span>READ YOUR DIGITAL COMIC</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Public Guest: Price & Order Action Bar */
                      <div className="p-4 sm:p-5 lg:p-6 rounded-xl bg-gradient-to-br from-cyan-950/50 via-black/70 to-black/90 border border-cyan-500/30 flex flex-col gap-4 shadow-[0_0_20px_rgba(56,189,248,0.12)]">
                        <div>
                          <div className="text-[10px] font-mono text-cyan-400/90 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                            <span>Wave 2 — Pre-Order Now</span>
                            <span className="text-white/30">·</span>
                            <span className="text-emerald-400 font-bold">{waveInventory.available} Available</span>
                          </div>
                          <div className="flex flex-wrap items-baseline gap-2 mt-1">
                            <span className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                              €14.99
                            </span>
                            <span className="text-[11px] font-mono text-white/50">
                              incl. VAT · Free Global Shipping
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <button
                            onClick={() => {
                              setIsCheckoutOpen(true);
                              soundManager.playTone(660, 0.08);
                            }}
                            className="flex-1 py-3.5 px-6 rounded-xl text-xs sm:text-sm font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-all cursor-pointer min-h-[44px] shadow-[0_0_20px_rgba(56,189,248,0.35)] flex items-center justify-center gap-2 group hover:scale-[1.01]"
                          >
                            <ShoppingBag className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
                            <span>PRE-ORDER NOW — €14.99</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowComicReader(true)}
                            className="py-3.5 px-5 rounded-xl text-xs sm:text-sm font-mono font-semibold text-cyan-300 hover:text-white bg-black/60 hover:bg-cyan-950/80 border border-cyan-500/40 hover:border-cyan-400 transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-2 group shadow-[0_0_15px_rgba(56,189,248,0.12)]"
                          >
                            <BookOpen className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                            <span>Preview Comic (Pgs 1–2)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Wave 1 / Wave 2 Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 lg:p-5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-center sm:text-left">
                      <div>
                        <div className="text-[10px] font-mono text-white/50">FOUNDING RUN</div>
                        <div className="text-xs sm:text-sm font-semibold text-amber-400">
                          {isVipMode ? `Edition #${editionDisplay} (Owned)` : '100 / 100 Claimed'}
                        </div>
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
                              className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl pl-10 pr-3.5 py-2 text-base sm:text-xs text-white placeholder-white/40 outline-none font-mono"
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

          {/* Tab 3: My Assets — exclusively the 3 verified holder assets (strictly gated to explicit VIP verification route) */}
          {isVipMode && activeTab === 'assets' && (
            <motion.div
              key="assets-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-3.5 sm:space-y-4 lg:space-y-5"
            >
              {/* Asset 1: Äkinoya Founding Pass — Physical Limited Edition */}
              <div className="bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase">Asset 01 · Physical Pass</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/40 text-[9.5px] sm:text-[10.5px] font-mono font-semibold tracking-wider text-emerald-300 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    CLAIMED &amp; ACTIVE
                  </span>
                </div>
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-cyan-950/70 border border-cyan-400/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-display font-bold text-white leading-snug">
                      Äkinoya Founding Pass — Physical Limited Edition
                    </h3>
                    <p className="text-[11px] sm:text-xs font-mono text-cyan-300/80">
                      #{activeEditionNumber} of {TOTAL_EDITION_LIMIT}
                    </p>
                  </div>
                </div>

                <div className="mt-4 divide-y divide-white/5 rounded-xl bg-black/40 border border-white/5 px-3 sm:px-4 font-mono text-[11px] sm:text-xs">
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-white/45 shrink-0">HOLDER</span>
                    {holderName ? (
                      <span className="text-white font-medium truncate">{holderName}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => (onNavigateToPassport ? onNavigateToPassport() : onNavigateToVerify?.(activePassId))}
                        className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                      >
                        Register holder name
                      </button>
                    )}
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-white/45 shrink-0">PASS ID</span>
                    <span className="text-white/80 truncate">#{activePassId}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-white/45 shrink-0">EDITION</span>
                    <span className="text-white/80">#{activeEditionNumber} of {TOTAL_EDITION_LIMIT}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => (onNavigateToPassport ? onNavigateToPassport() : onNavigateToVerify?.(activePassId))}
                    className="w-full py-2.5 px-3 rounded-xl font-mono text-[11px] sm:text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-500/30 hover:border-cyan-400 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[42px]"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>View Digital Passport</span>
                  </button>
                </div>
              </div>

              {/* Asset 2: Bingäa Official Artwork / Cover Image & Publication Master */}
              <div className="bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase">Asset 02 · Official Artwork &amp; Comicbook Master</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-400/30 text-[9.5px] sm:text-[10px] font-mono text-cyan-300">
                    HI-RES MASTER
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowCoverPreview(true)}
                    className="shrink-0 w-24 sm:w-28 aspect-[3/4] rounded-lg overflow-hidden border border-white/15 hover:border-cyan-400/60 transition-colors cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                    aria-label="Preview Bingäa cover artwork"
                  >
                    <img src={BINGAA_COVER_URL} alt="Bingäa official cover artwork" className="w-full h-full object-cover" />
                  </button>
                  <div className="min-w-0 flex-1 w-full space-y-3 text-center sm:text-left">
                    <div>
                      <h3 className="text-base sm:text-lg font-display font-bold text-white leading-snug">
                        Bingäa Official Artwork / Cover Image &amp; Digital Publication
                      </h3>
                      <p className="text-[11px] sm:text-xs font-mono text-white/60 mt-1 leading-relaxed">
                        <strong className="text-cyan-300">Cover Graphic:</strong> High-resolution master Retina artwork (PNG format).
                        <br className="hidden sm:inline" />{' '}
                        <strong className="text-emerald-300">Comicbook PDF:</strong> Complete Issue #1 digital publication (Print-ready master).
                      </p>
                    </div>

                    {/* Consolidated 4 Clear Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCoverPreview(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/40 transition-all cursor-pointer min-h-[40px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Cover</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowComicReader(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-emerald-300 hover:text-white border border-emerald-500/30 hover:border-emerald-400 bg-emerald-950/40 transition-all cursor-pointer min-h-[40px]"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read Comic</span>
                      </button>

                      <a
                        href={BINGAA_COVER_URL}
                        download={BINGAA_COVER_FILENAME}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-white/80 hover:text-white border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all min-h-[40px]"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Download Cover</span>
                      </a>

                      <a
                        href={BINGAA_PDF_URL}
                        download={BINGAA_PDF_FILENAME}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/60 transition-all min-h-[40px]"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Download Comic PDF</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Asset 3: Bingäa Issue #1 Certificate of Authenticity (COA) */}
              <div className="bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase">Asset 03 · Certificate of Authenticity</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/40 text-[9.5px] sm:text-[10.5px] font-mono font-semibold tracking-wider text-emerald-300 whitespace-nowrap shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    OFFICIALLY VERIFIED · HUMAN CERTIFICATION PROTOCOL ACTIVE
                  </span>
                </div>

                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-display font-bold text-white leading-snug">
                      Signed Certificate of Authenticity (COA)
                    </h3>
                    <p className="text-[10.5px] sm:text-[11px] font-mono text-white/50 mt-0.5">
                      Deterministic cryptographic provenance bound to pass #{activePassId} (Edition #{editionDisplay} of 100).
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  <CertificateOfAuthenticity certificate={activeCertificate} />

                  <button
                    type="button"
                    onClick={() => downloadCertificatePng(activeCertificate)}
                    className="w-full py-3 px-4 rounded-xl font-mono text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/50 hover:bg-cyan-900 border border-cyan-500/40 hover:border-cyan-400 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>Download Certificate</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Pass Card Widget Section (Positioned at the bottom of the page for both VIP & Guest views) */}
        <div className="flex flex-col items-center pt-8 border-t border-white/10 mt-8">
          <div className="text-center mb-4 space-y-1">
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-amber-300 font-semibold">
              {isVipMode ? 'ARCHIVE COLLECTOR ARTIFACT · LIMITED EDITION' : '• VIP ACCESS 100 / 100 CLAIMED'}
            </span>
            <h3 className="text-base sm:text-lg font-display font-bold text-white">
              {isVipMode ? 'Äkinoya VIP Pass Card' : 'Guest Äkinoya Pass'}
            </h3>
            <p className="text-xs font-mono text-white/50 max-w-md mx-auto">
              {isVipMode
                ? `Physical limited edition holographic NFC card (#${editionDisplay} of 100). Verified and authenticated on this device.`
                : 'Founding edition fully claimed (100 / 100). Use your guest pass below for instant 1-click access to the Visualizer Hub.'}
            </p>
          </div>
          {renderPassCardWidget()}
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-mono text-white/60">
                      CIPHER CODE (HINT: {selectedTrackForUnlock.code} OR SillowMill2027)
                    </label>
                    <button
                      type="button"
                      onClick={() => handlePastePassId('track')}
                      className="text-[10px] font-mono text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      title="Paste Pass ID from clipboard"
                    >
                      <ClipboardPaste className="w-3 h-3 text-cyan-400" />
                      <span>PASTE PASS ID</span>
                    </button>
                  </div>
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
                      placeholder={`Enter cipher or #${FOUNDING_PASS_ID}`}
                      className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-white placeholder-white/40 outline-none font-mono tracking-wider transition-colors"
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

      {/* Modal 2: Audio Stream Visualizer Player */}
      <AnimatePresence>
        {activePlayingTrack && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 xs:p-3 sm:p-6 lg:p-8 bg-black/85 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-3xl lg:max-w-4xl bg-[#05080e] border border-cyan-400/40 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(56,189,248,0.25)] flex flex-col max-h-[92dvh] sm:max-h-none overflow-y-auto sm:overflow-visible"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-3.5 bg-black/60 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                  <div>
                    <div className="text-[9px] sm:text-[10px] font-mono text-cyan-400 tracking-wider">
                      AUDIO TRANSMISSION · TRACK #{activePlayingTrack.id}
                    </div>
                    <h3 className="text-xs sm:text-base font-display font-bold text-white truncate max-w-[200px] xs:max-w-[260px] sm:max-w-none">
                      {activePlayingTrack.title} — Official Audio Feed
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
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Visualizer Stage */}
              <div className="relative min-h-[270px] xs:min-h-[300px] sm:min-h-0 sm:aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                {/* Background cosmic vista with glowing ambient motion */}
                <img
                  src={akinoyaVistaImg}
                  alt="Äkinoya Vista"
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-60 scale-105 animate-pulse"
                  style={{ animationDuration: '8s' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,black_80%)]" />

                {/* Animated holographic audio telemetry overlay */}
                <div className="relative z-10 flex flex-col items-center text-center p-3.5 xs:p-4 sm:p-6 space-y-2.5 sm:space-y-4 w-full max-w-lg mx-auto">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_30px_rgba(56,189,248,0.4)] shrink-0">
                    <AudioWaveform className="w-5 h-5 sm:w-7 sm:h-7 text-cyan-400 animate-pulse" />
                  </div>

                  <div>
                    <span className="text-[9px] sm:text-[10px] font-mono px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-950/90 border border-emerald-400/40 text-emerald-300 font-semibold tracking-wider uppercase">
                      ● TRANSMISSION ACTIVE · HQ AUDIO FEED
                    </span>
                    <h2 className="text-lg xs:text-xl sm:text-2xl font-display font-extrabold text-white mt-1.5 sm:mt-2">
                      {activePlayingTrack.title}
                    </h2>
                    <p className="text-[10px] xs:text-xs font-mono text-cyan-300/80 mt-1 max-w-xs sm:max-w-none mx-auto leading-tight sm:leading-normal">
                      AUDIO MATRIX FREQUENCY · TRANSMISSION STREAM
                    </p>
                  </div>

                  {/* Pulsing Audio Telemetry Waveform Bars */}
                  <div className="flex items-center gap-1 sm:gap-1.5 h-8 sm:h-12 pt-1 sm:pt-2">
                    {[35, 60, 90, 45, 80, 100, 75, 40, 65, 85, 55, 95, 70, 50, 85, 60, 40, 75].map((h, i) => (
                      <div
                        key={i}
                        className="w-0.5 sm:w-1 rounded-full bg-gradient-to-t from-cyan-500 to-emerald-400 transition-all duration-300"
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
              <div className="px-3.5 sm:px-6 py-3.5 sm:py-4 bg-[#080d16] border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      if (activePlayingTrack.id === '02') {
                        planetSoundtrack.togglePlay();
                      } else {
                        setIsPlayingAudio(!isPlayingAudio);
                        soundManager.playTone(520, 0.1);
                      }
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-semibold transition-all cursor-pointer shadow-[0_0_12px_rgba(56,189,248,0.3)] min-h-[42px] sm:min-h-[40px]"
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

                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs font-mono text-white/70 text-center sm:text-left py-0.5 sm:py-0">
                    <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
                    <span className="truncate">
                      {activePlayingTrack.id === '02'
                        ? 'Master Planetary Soundtrack (BWS)'
                        : 'Audio Synthesizer Matrix'}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] sm:text-[11px] font-mono text-cyan-400/80 text-center sm:text-right pt-2 sm:pt-0 border-t border-white/5 sm:border-0">
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
                    Sillow Mill — Bingäa (Collector's Graphic Novel)
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
                            className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
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
                            className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
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
                            className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
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
                            className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
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
                          className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
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

      {/* Community Auth / Dual-Login Modal */}
      <CommunityAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(token) => {
          if (onNavigateToVerify) {
            onNavigateToVerify(token);
          } else {
            sessionStorage.setItem('akinoya_vip_token', token || FOUNDING_PASS_ID);
            window.location.href = `/verify/${token || FOUNDING_PASS_ID}`;
          }
        }}
      />

      {/* Comic Reader modal (accessible to all visitors; verified holders get 32 pages, public visitors get 2-page preview + whitelist lock) */}
      {showComicReader && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95">
              <div className="w-7 h-7 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <BingaaComicReader
            onClose={() => setShowComicReader(false)}
            isVerified={Boolean(isVipMode)}
          />
        </Suspense>
      )}

      {/* Cover artwork high-res preview modal */}
      <AnimatePresence>
        {showCoverPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setShowCoverPreview(false)}
          >
            <button
              type="button"
              onClick={() => setShowCoverPreview(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={BINGAA_COVER_URL}
              alt="Bingäa official cover artwork"
              className="max-w-full max-h-[88dvh] rounded-xl border border-white/15 shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
