import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Film,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FileText,
  Music,
  Layers,
  Image as ImageIcon,
  Send,
  ThumbsUp,
  MessageSquare,
  MessagesSquare,
  MessageCircle,
  Vote,
  X,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  Radio,
  Sliders,
  FolderDown,
  CreditCard,
  Crown,
  Eye,
  Check,
  Zap,
  Hash,
  Users,
  Trophy,
  Heart,
  Globe2,
  Clock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';
import { rafThrottle } from '../utils/performance';
import bingaaComicCover from '../assets/images/bingaa_comic_cover.jpg';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import visualizerThumbnailImg from '../assets/images/visualizer_thumbnail.png';
import moodboardImg from '../assets/images/Mood.png';
import { BINGAA_PDF_URL, BINGAA_PDF_FILENAME, BINGAA_COVER_URL, BINGAA_COVER_FILENAME } from '../utils/certificate';
import { useAuth } from '../context/AuthContext';
import { AuthHeaderButton } from './AuthHeaderButton';
const CreatorLeaderboard = React.lazy(() =>
  import('./CreatorLeaderboard').then((m) => ({ default: m.CreatorLeaderboard }))
);
const LoreGovernancePortal = React.lazy(() =>
  import('./LoreGovernancePortal').then((m) => ({ default: m.LoreGovernancePortal }))
);
const AkinoyaLabsHub = React.lazy(() =>
  import('./AkinoyaLabsHub').then((m) => ({ default: m.AkinoyaLabsHub }))
);
const DriveFolderVault = React.lazy(() =>
  import('./DriveFolderVault').then((m) => ({ default: m.DriveFolderVault }))
);
const WelcomeVisionPortal = React.lazy(() =>
  import('./WelcomeVisionPortal').then((m) => ({ default: m.WelcomeVisionPortal }))
);
const PioneerLounge = React.lazy(() =>
  import('./PioneerLounge').then((m) => ({ default: m.PioneerLounge }))
);

const HubModuleLoading: React.FC<{ label?: string }> = ({ label = 'LOADING MODULE...' }) => (
  <div
    style={{ willChange: 'opacity, transform' }}
    className="flex flex-col items-center justify-center p-8 sm:p-12 space-y-3 min-h-[360px] rounded-3xl bg-[#040711] border border-cyan-500/20 transform-gpu"
  >
    <div className="w-9 h-9 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shadow-[0_0_15px_rgba(0,242,254,0.4)]" />
    <span className="text-xs font-mono text-cyan-300 tracking-wider uppercase animate-pulse font-bold">
      {label}
    </span>
  </div>
);
import { getStoredCreators } from '../data/creators';
import {
  openClaimWorldModal,
  isPostLaunch,
  openMembershipGateModal,
  hasPaidMembership,
} from '../utils/pioneer';
import { VAULT_STAGE_FOLDER_IDS, VAULT_STAGE_NAMES, getVaultFolderIdForStage } from '../utils/drive';
import { scrollElementIntoContainer } from '../utils/scroll';

export const MEMBERSHIP_LAUNCH_DATE = new Date('2027-01-09T00:00:00Z');
export const isMembershipLaunchLocked = !isPostLaunch();

export type CreativeHubSection = 'welcome' | 'workflows' | 'downloads' | 'drive-vault' | 'discussion' | 'creators' | 'governance';

interface AssetVaultItem {
  id: string;
  title: string;
  category: string;
  fileFormat: string;
  fileSize: string;
  description: string;
  downloadUrl: string;
  fileName: string;
  heroBannerUrl: string;
  isAudio?: boolean;
}

interface WorkflowItem {
  id: string;
  stepNumber: string;
  tag: string;
  title: string;
  subtitle: string;
  toolstack: string;
  duration: string;
  description: string;
  heroBannerUrl: string;
  metrics: { fps: string; engine: string; resolution: string };
  comments: WorkflowComment[];
}

interface WorkflowComment {
  id: string;
  author: string;
  role: 'CREATOR' | 'ANNUAL PASS MEMBER' | 'ANNUAL PASS' | 'PATRON' | 'PATRON MEMBER' | 'VIP GUEST' | 'COMMUNITY MEMBER' | 'FREE';
  timestamp: string;
  text: string;
}

export type ChannelCategory =
  | 'PUBLIC HUB'
  | 'CREATOR LAB & SHOWCASE'
  | 'COLLABORATION BOARD'
  | 'PRO AUDIO LOUNGE'
  | 'FOUNDERS & VIP';

export interface ChatChannel {
  id: string;
  name: string;
  category: ChannelCategory;
  description: string;
  isAnnualPass?: boolean;
  requiresArtist?: boolean;
  requiresVip?: boolean;
  isOpenCollab?: boolean;
}

interface DiscussionPost {
  id: string;
  channelId: string;
  author: string;
  role: 'CREATOR' | 'ANNUAL PASS MEMBER' | 'ANNUAL PASS' | 'PATRON' | 'PATRON MEMBER' | 'VIP GUEST' | 'COMMUNITY MEMBER' | 'FREE';
  avatarBg: string;
  timestamp: string;
  content: string;
  imageUrl?: string;
  likes: number;
  hasLiked?: boolean;
  replies: DiscussionReply[];
}

interface DiscussionReply {
  id: string;
  author: string;
  role: 'CREATOR' | 'ANNUAL PASS MEMBER' | 'ANNUAL PASS' | 'PATRON' | 'PATRON MEMBER' | 'VIP GUEST' | 'COMMUNITY MEMBER' | 'FREE';
  avatarBg: string;
  timestamp: string;
  content: string;
}

interface CommunityHubProps {
  onBackToHome: () => void;
  onOpenAuthModal?: () => void;
  onOpenCreator?: (username: string) => void;
}

export const CommunityHub: React.FC<CommunityHubProps> = ({
  onBackToHome,
  onOpenAuthModal,
  onOpenCreator,
}) => {
  // Sticky header measurement: docks the sidebar exactly beneath the header on every
  // viewport (iPad portrait/landscape) so nothing floats or leaves a see-through gap.
  const hubHeaderRef = useRef<HTMLElement | null>(null);
  // Isolated internal scroll container (the window itself never scrolls on this view):
  // eliminates iOS/iPadOS Safari rubber-banding, sticky recalculation lag & URL-bar reflows.
  const hubScrollRef = useRef<HTMLElement | null>(null);
  const scrollHubTo = (top: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = hubScrollRef.current;
    if (scroller) scroller.scrollTo({ top, behavior });
    else if (typeof window !== 'undefined') window.scrollTo({ top, behavior });
  };
  useEffect(() => {
    const el = hubHeaderRef.current;
    if (!el || typeof window === 'undefined') return;
    const root = el.parentElement;
    const apply = rafThrottle(() => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (root) root.style.setProperty('--hub-header-h', `${h}px`);
    });
    apply();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => apply());
      observer.observe(el);
    } else {
      window.addEventListener('resize', apply, { passive: true });
    }
    return () => {
      apply.cancel();
      observer?.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, []);

  // Authentication & RBAC User State
  const {
    user,
    profile,
    role,
    isAuthenticated,
    isVip,
    isSubscriber,
    isArtist,
    hasVipPass,
    hasPendingVipInvitation,
    vipLinkError,
    clearVipLinkError,
    openAuthModal,
    updateProfile,
  } = useAuth();

  const [patronName, setPatronName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const emailParam = urlParams.get('email');
      if (emailParam) {
        const derived = emailParam.split('@')[0];
        sessionStorage.setItem('akinoya_patron_name', derived);
        return derived;
      }
      return sessionStorage.getItem('akinoya_patron_name') || 'Patron Member #042';
    }
    return 'Patron Member #042';
  });

  const userDisplayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`
    : profile?.full_name || (user?.email ? user.email.split('@')[0] : patronName);

  const isVipOrAbove =
    isVip ||
    Boolean(profile?.has_vip_pass) ||
    role === 'VIP_GUEST' ||
    role === 'ANNUAL_PASS' ||
    role === 'CREATOR' ||
    Boolean(profile?.vip_code_redeemed) ||
    Boolean(profile?.is_vip) ||
    (typeof window !== 'undefined' &&
      (Boolean(localStorage.getItem('akinoya_patron_token')) ||
       Boolean(sessionStorage.getItem('akinoya_patron_token')) ||
       localStorage.getItem('akinoya_patron_role') === 'CREATOR' ||
       localStorage.getItem('akinoya_patron_role') === 'VIP_GUEST' ||
       localStorage.getItem('akinoya_patron_role') === 'ANNUAL_PASS'));

  const isAnnualOrCreator =
    isSubscriber ||
    role === 'ANNUAL_PASS' ||
    role === 'SUBSCRIBER' ||
    role === 'CREATOR' ||
    Boolean(profile?.is_annual_member) ||
    Boolean(profile?.is_subscriber) ||
    profile?.subscription_status === 'active';

  const userHasVip = Boolean(
    isVip ||
    hasVipPass ||
    profile?.has_vip_pass ||
    profile?.is_vip ||
    profile?.vip_code_redeemed ||
    role === 'CREATOR' ||
    role === 'VIP_GUEST'
  );

  const userHasAnnual = Boolean(
    hasPaidMembership(user, profile, role) ||
    isAnnualOrCreator
  );

  const isPatron = isVipOrAbove;

  const normalizeHubSection = (raw: string | null | undefined): CreativeHubSection | null => {
    if (!raw) return null;
    const c = raw.toLowerCase().replace('#', '').trim();
    if (c === 'drive-vault' || c === 'downloads' || c === 'vault') return 'downloads';
    if (c === 'workflows' || c === 'labs' || c.startsWith('stage-')) return 'workflows';
    if (c === 'discussion' || c === 'chat' || c === 'comm-net') return 'discussion';
    if (c === 'creators' || c === 'leaderboard' || c === 'planets') return 'creators';
    if (c === 'governance' || c === 'lore') return 'governance';
    if (c === 'welcome' || c === 'vision') return 'welcome';
    return null;
  };

  // Active Hub Section with sessionStorage & URL hash persistence
  const [activeSection, setActiveSection] = useState<CreativeHubSection>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') || urlParams.get('section');
      const hash = window.location.hash;
      const savedSection = sessionStorage.getItem('akinoya_hub_active_section');

      const resolved =
        normalizeHubSection(tabParam) ||
        normalizeHubSection(hash) ||
        normalizeHubSection(savedSection);
      if (resolved) return resolved;
    }
    return 'welcome';
  });

  const [activeStageId, setActiveStageId] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase().replace('#', '');
      if (hash.startsWith('stage-')) {
        const num = Number(hash.replace('stage-', ''));
        if (num >= 1 && num <= 5) return num;
      }
      const saved = sessionStorage.getItem('akinoya_hub_active_stage');
      const num = Number(saved);
      if (num >= 1 && num <= 5) return num;
    }
    return 1;
  });

  const [targetVaultFolderId, setTargetVaultFolderId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const folderParam = urlParams.get('folder');
      const saved = sessionStorage.getItem('akinoya_hub_vault_folder');
      return folderParam || saved || 'root';
    }
    return 'root';
  });

  const isInitialMountRef = useRef(true);

  // Workflow Pipeline Stages for Left Sidebar Sub-Menu
  const WORKFLOW_STAGES = [
    { id: 1, num: '01', title: 'Storyboards & Framing' },
    { id: 2, num: '02', title: 'Character & World Specs' },
    { id: 3, num: '03', title: 'Blender 4.2 & Octane 3D' },
    { id: 4, num: '04', title: 'Prompts & Diffusion Matrix' },
    { id: 5, num: '05', title: 'DaVinci Grading & Ableton' },
  ];

  const [tappingHubTab, setTappingHubTab] = useState<string | null>(null);
  const hubNavTouchStartRef = useRef<{ x: number; y: number; time: number; key: string } | null>(null);
  const lastHubTouchNavTimeRef = useRef<number>(0);

  const resetHubScrollInstant = () => {
    const scroller = hubScrollRef.current;
    if (scroller) {
      const prevOverflow = scroller.style.overflowY;
      scroller.style.overflowY = 'hidden';
      scroller.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      scroller.scrollTop = 0;
      void scroller.offsetHeight;
      scroller.style.overflowY = prevOverflow;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  };

  const getHubNavTouchHandlers = (key: string, action: () => void) => ({
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
    },
    onTouchStart: (e: React.TouchEvent<HTMLButtonElement>) => {
      const t = e.touches[0];
      if (t) {
        hubNavTouchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now(), key };
      }
    },
    onTouchEnd: (e: React.TouchEvent<HTMLButtonElement>) => {
      const start = hubNavTouchStartRef.current;
      hubNavTouchStartRef.current = null;
      const t = e.changedTouches[0];
      if (!start || !t || start.key !== key) return;
      const dx = Math.abs(t.clientX - start.x);
      const dy = Math.abs(t.clientY - start.y);
      const dt = Date.now() - start.time;
      if (dx < 14 && dy < 18 && dt < 650) {
        if (e.cancelable) {
          e.preventDefault();
        }
        e.stopPropagation();
        lastHubTouchNavTimeRef.current = Date.now();
        action();
      }
    },
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (Date.now() - lastHubTouchNavTimeRef.current < 500) {
        e.preventDefault();
        return;
      }
      action();
    },
  });

  const handleSwitchSection = (section: CreativeHubSection) => {
    const normalized = section === 'drive-vault' ? 'downloads' : section;
    setTappingHubTab(normalized);
    setTimeout(() => setTappingHubTab((prev) => (prev === normalized ? null : prev)), 155);
    soundManager.playTone(580, 0.05);
    if (typeof window !== 'undefined') {
      if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      sessionStorage.setItem('akinoya_hub_active_section', normalized);
      sessionStorage.setItem('akinoya_hub_scroll_y', '0');
      try {
        const url = new URL(window.location.href);
        url.hash = normalized;
        window.history.replaceState(null, '', url.toString());
      } catch {}
      resetHubScrollInstant();
    }
    setActiveSection(normalized);
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        scrollHubTo(0, 'instant' as ScrollBehavior);
      });
    }
  };

  const handleNavigateToVault = (folderId: string = 'root') => {
    setTargetVaultFolderId(folderId);
    soundManager.playTone(580, 0.05);
    if (typeof window !== 'undefined') {
      if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      sessionStorage.setItem('akinoya_hub_active_section', 'downloads');
      sessionStorage.setItem('akinoya_hub_vault_folder', folderId);
      sessionStorage.setItem('akinoya_hub_scroll_y', '0');
      try {
        const url = new URL(window.location.href);
        url.hash = 'downloads';
        window.history.replaceState(null, '', url.toString());
      } catch {}
      resetHubScrollInstant();
    }
    setActiveSection('downloads');
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        scrollHubTo(0, 'instant' as ScrollBehavior);
      });
    }
  };

  // Synchronize state persistence to sessionStorage and URL hash
  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('akinoya_hub_active_section', activeSection);
    try {
      const currentHash = window.location.hash.toLowerCase().replace('#', '');
      if (currentHash !== activeSection && !currentHash.startsWith('stage-')) {
        const url = new URL(window.location.href);
        url.hash = activeSection;
        window.history.replaceState(null, '', url.toString());
      }
    } catch {}
  }, [activeSection]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('akinoya_hub_active_stage', String(activeStageId));
  }, [activeStageId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('akinoya_hub_vault_folder', targetVaultFolderId);
  }, [targetVaultFolderId]);

  // URL query parameter & hash detection on external navigation and popstate
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkUrlParams = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') || urlParams.get('section');
      const folderParam = urlParams.get('folder');
      const hash = window.location.hash.toLowerCase().replace('#', '');

      if (folderParam) {
        setTargetVaultFolderId(folderParam);
      }

      if (hash.startsWith('stage-')) {
        const num = Number(hash.replace('stage-', ''));
        if (num >= 1 && num <= 5) {
          setActiveStageId(num);
        }
      }

      const resolved = normalizeHubSection(tabParam) || normalizeHubSection(hash);
      if (resolved) {
        setActiveSection(resolved);
      }
    };

    checkUrlParams();
    window.addEventListener('popstate', checkUrlParams);
    window.addEventListener('hashchange', checkUrlParams);
    return () => {
      window.removeEventListener('popstate', checkUrlParams);
      window.removeEventListener('hashchange', checkUrlParams);
    };
  }, []);

  // Viewport scroll position saving & restoration across reloads
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    let timeoutId: any;
    const scroller = hubScrollRef.current;
    const getY = () => (scroller ? scroller.scrollTop : window.scrollY);
    const saveScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (getY() > 0) {
          sessionStorage.setItem('akinoya_hub_scroll_y', String(getY()));
        }
      }, 60);
    };

    const throttledSaveScroll = rafThrottle(saveScroll);

    const handleInstantSaveScroll = () => {
      if (getY() > 0) {
        sessionStorage.setItem('akinoya_hub_scroll_y', String(getY()));
      }
    };

    const scrollTarget: HTMLElement | Window = scroller || window;
    scrollTarget.addEventListener('scroll', throttledSaveScroll, { passive: true });
    window.addEventListener('beforeunload', handleInstantSaveScroll);
    window.addEventListener('pagehide', handleInstantSaveScroll);

    let userInteracted = false;
    const markUserInteraction = () => {
      userInteracted = true;
    };
    window.addEventListener('touchstart', markUserInteraction, { passive: true });
    window.addEventListener('wheel', markUserInteraction, { passive: true });

    // Single-shot scroll restoration (cancels immediately on user touch/scroll to prevent footer auto-correction)
    let restoreTimer: any;
    const savedY = sessionStorage.getItem('akinoya_hub_scroll_y');
    if (savedY) {
      const targetY = parseFloat(savedY);
      if (!isNaN(targetY) && targetY > 50) {
        restoreTimer = setTimeout(() => {
          if (!userInteracted && Math.abs(getY() - targetY) > 20) {
            scrollHubTo(targetY, 'instant' as ScrollBehavior);
          }
        }, 60);
      }
    }

    return () => {
      scrollTarget.removeEventListener('scroll', throttledSaveScroll);
      throttledSaveScroll.cancel();
      window.removeEventListener('touchstart', markUserInteraction);
      window.removeEventListener('wheel', markUserInteraction);
      window.removeEventListener('beforeunload', handleInstantSaveScroll);
      window.removeEventListener('pagehide', handleInstantSaveScroll);
      clearTimeout(timeoutId);
      clearTimeout(restoreTimer);
    };
  }, []);

  const pipelineStagesTrayRef = useRef<HTMLDivElement | null>(null);
  const programmaticStageScrollUntilRef = useRef<number>(0);

  // Scroll-spy for Stage 01–05 (Labs & Workflows) driving BOTH the desktop left sidebar
  // AND the sticky bottom "PIPELINE STAGES" bar on mobile and tablet viewports in real time.
  useEffect(() => {
    if (typeof window === 'undefined' || activeSection !== 'workflows') return;

    let observer: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let rafId: number | null = null;

    const computeActiveStageFromScroll = () => {
      if (Date.now() < programmaticStageScrollUntilRef.current) return;
      const root = hubScrollRef.current;
      const rootRect =
        root && root.clientHeight > 0
          ? root.getBoundingClientRect()
          : { top: 0, height: window.innerHeight };
      const activationY = rootRect.top + rootRect.height * 0.38;

      let candidate = 1;
      let anyFound = false;
      for (let i = 1; i <= 5; i++) {
        const el = document.getElementById(`stage-${i}`);
        if (!el) continue;
        anyFound = true;
        const rect = el.getBoundingClientRect();
        if (rect.top <= activationY) {
          candidate = i;
        }
      }
      if (anyFound) {
        setActiveStageId((prev) => (prev === candidate ? prev : candidate));
      }
    };

    const handleScrollSpy = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        computeActiveStageFromScroll();
      });
    };

    const root = hubScrollRef.current;
    if (root) {
      root.addEventListener('scroll', handleScrollSpy, { passive: true });
    }
    window.addEventListener('scroll', handleScrollSpy, { passive: true });

    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          if (Date.now() < programmaticStageScrollUntilRef.current) return;
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const stageNum = Number(entry.target.id.replace('stage-', ''));
              if (stageNum >= 1 && stageNum <= 5) {
                setActiveStageId((prev) => (prev === stageNum ? prev : stageNum));
              }
            }
          }
          computeActiveStageFromScroll();
        },
        { root, rootMargin: '-32% 0px -62% 0px', threshold: 0 }
      );

      const observeStages = () => {
        let found = 0;
        for (let i = 1; i <= 5; i++) {
          const el = document.getElementById(`stage-${i}`);
          if (el) {
            observer?.observe(el);
            found++;
          }
        }
        return found;
      };

      if (observeStages() < 5 && typeof MutationObserver !== 'undefined') {
        mutationObserver = new MutationObserver(() => {
          if (observeStages() >= 5) {
            mutationObserver?.disconnect();
            mutationObserver = null;
            computeActiveStageFromScroll();
          }
        });
        mutationObserver.observe(root || document.body, { childList: true, subtree: true });
      }
    }

    // Initial check once mounted
    const initTimer = window.setTimeout(computeActiveStageFromScroll, 120);

    return () => {
      if (root) {
        root.removeEventListener('scroll', handleScrollSpy);
      }
      window.removeEventListener('scroll', handleScrollSpy);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.clearTimeout(initTimer);
      observer?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [activeSection]);

  // Keep active stage button centered in the mobile/tablet bottom "PIPELINE STAGES" strip as user scrolls
  useEffect(() => {
    if (typeof window === 'undefined' || activeSection !== 'workflows') return;
    sessionStorage.setItem('akinoya_hub_active_stage', String(activeStageId));
    const tray = pipelineStagesTrayRef.current;
    if (!tray) return;
    const activeBtn = tray.querySelector<HTMLElement>(`[data-pipeline-stage="${activeStageId}"]`);
    if (activeBtn) {
      const targetLeft =
        activeBtn.offsetLeft - tray.clientWidth / 2 + activeBtn.offsetWidth / 2;
      tray.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  }, [activeStageId, activeSection]);

  // Auto-scroll to active stage on initial load/section switch in workflows when hash specifies #stage-N
  useEffect(() => {
    if (typeof window === 'undefined' || activeSection !== 'workflows') return;
    const hash = window.location.hash.toLowerCase();
    const targetStage = hash.startsWith('#stage-')
      ? Number(hash.replace('#stage-', ''))
      : 0;

    if (targetStage > 1 && targetStage <= 5) {
      programmaticStageScrollUntilRef.current = Date.now() + 700;
      const delays = [150, 400];
      delays.forEach((delay) => {
        setTimeout(() => {
          const el = document.getElementById(`stage-${targetStage}`);
          if (el) {
            el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
          }
        }, delay);
      });
    }
  }, [activeSection]);

  const handleJumpToStage = (stageNum: number) => {
    programmaticStageScrollUntilRef.current = Date.now() + 700;
    setActiveStageId(stageNum);
    soundManager.playTone(580, 0.05);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('akinoya_hub_active_stage', String(stageNum));
      try {
        const url = new URL(window.location.href);
        url.hash = `stage-${stageNum}`;
        window.history.replaceState(null, '', url.toString());
      } catch {}

      // Dispatch universal event so the stage deep-dive modal opens reliably
      window.dispatchEvent(
        new CustomEvent('open-workflow-stage-modal', { detail: { stageId: stageNum } })
      );
    }
    const target = document.getElementById(`stage-${stageNum}`);
    if (target) {
      // Header is static above the internal scroller, so only a small breathing margin is needed
      scrollElementIntoContainer(target, 16);
    }
  };

  const getDynamicHeaderTitle = () => {
    switch (activeSection) {
      case 'welcome':
        return 'ÄKINOYA COMMUNITY HUB · WELCOME & VISION';
      case 'workflows':
        return 'ÄKINOYA COMMUNITY HUB · LABS & WORKFLOWS';
      case 'downloads':
        return 'ÄKINOYA COMMUNITY HUB · DRIVE ASSET VAULT';
      case 'discussion':
        return 'ÄKINOYA COMMUNITY HUB · PIONEER LOUNGE';
      case 'creators':
        return 'ÄKINOYA COMMUNITY HUB · FAVORITE PLANETS & LEADERBOARD';
      case 'governance':
        return 'ÄKINOYA COMMUNITY HUB · LORE & GOVERNANCE PORTAL';
      default:
        return 'ÄKINOYA COMMUNITY HUB';
    }
  };

  // Paywall Upgrade Modal state
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalReason, setUpgradeModalReason] = useState<string>(
    'Exclusive Annual Membership Pass (€60/year, equivalent to just €5/month). Unlocks full 3D visualizer breakdowns, unreleased audio masters, lore governance & 4K assets on January 9, 2027.'
  );
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Download Toast
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Audio Preview state in Asset Vault
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Workflows Comments Drawer state
  const [openWorkflowDrawerId, setOpenWorkflowDrawerId] = useState<string | null>(null);
  const [workflowCommentInputs, setWorkflowCommentInputs] = useState<Record<string, string>>({});


  // Creator Portfolios & Artist Verification State
  const [selectedCreatorUsername, setSelectedCreatorUsername] = useState<string>('odi');
  const [isArtistModalOpen, setIsArtistModalOpen] = useState<boolean>(false);
  const [artistAlias, setArtistAlias] = useState<string>('');
  const [artistGenre, setArtistGenre] = useState<string>('Electronic / Ambient Sound Design');
  const [artistLink, setArtistLink] = useState<string>('');
  const [artistSubmitting, setArtistSubmitting] = useState<boolean>(false);
  const [artistSuccess, setArtistSuccess] = useState<boolean>(false);

  // 1. ASSET & DOWNLOAD VAULT DATA
  const assetVaultItems: AssetVaultItem[] = [
    {
      id: 'asset-pdf',
      title: 'Bingäa Issue #01 — Read-Only Lore Preview & Teaser',
      category: 'LORE PREVIEW / TEASER',
      fileFormat: 'PDF LORE PREVIEW',
      fileSize: '114.8 MB · 300 DPI CMYK',
      description:
        'Read-only digital lore preview and narrative teaser sequence. Note: The full official 32-page print edition of "Bingäa" is sold separately as a physical collector\'s item (€14,99) and is not included as a free digital download.',
      downloadUrl: BINGAA_PDF_URL,
      fileName: BINGAA_PDF_FILENAME,
      heroBannerUrl: moodboardImg,
    },
    {
      id: 'asset-audio-master',
      title: 'Sub-Orbital Drift — Studio Audio Master & DAW Template',
      category: 'UNRELEASED MUSIC & DAW TEMPLATE',
      fileFormat: 'AUDIO MASTER + ABLETON .ALS',
      fileSize: '348.2 MB · 24-BIT / 96kHz WAV',
      description:
        'Full DAW session template with unreleased studio audio masters and project files for production study.',
      downloadUrl: '/assets/SubOrbitalDrift_AudioMaster.zip',
      fileName: 'SubOrbitalDrift_AudioMaster_96kHz.zip',
      heroBannerUrl: visualizerThumbnailImg,
      isAudio: true,
    },
    {
      id: 'asset-4k-render',
      title: 'Äkinoya Twilight World — 4K Volumetric Environment Render',
      category: '3D CONCEPT ASSET',
      fileFormat: '4K PNG WALLPAPER',
      fileSize: '28.4 MB · 3840 x 2160 UHD',
      description:
        'Raw cinematic beauty render illustrating the ionized stratosphere and obsidian spires of Planet Äkinoya. Zero compression, full dynamic range with alpha channel.',
      downloadUrl: akinoyaVistaImg,
      fileName: 'Akinoya_Twilight_World_4K_Master.png',
      heroBannerUrl: akinoyaVistaImg,
    },
    {
      id: 'asset-cover-art',
      title: 'Bingäa Official Cover Art & Character Sheet — High-Res Vector Vectors',
      category: 'OFFICIAL ARTWORK & PROMPTS',
      fileFormat: 'PNG + SVG + PROMPT MATRIX',
      fileSize: '18.2 MB · ULTRA-RES',
      description:
        'Original digital painting, layer comp, and Midjourney/SD prompt matrix comp for the official graphic novel cover, suitable for large format poster prints and digital wallpaper collections.',
      downloadUrl: BINGAA_COVER_URL,
      fileName: BINGAA_COVER_FILENAME,
      heroBannerUrl: bingaaComicCover,
    },
  ];

  // 2. WORKFLOWS & CREATIVE LAB DATA (4-STEP PRODUCTION ROADMAP)
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([
    {
      id: 'wf-step-01',
      stepNumber: '01',
      tag: 'LORE & SCRIPT',
      title: 'Concept & Storyboarding',
      subtitle: 'Scene narrative, 2D drafts & shot lists',
      toolstack: 'Clip Studio Paint EX · Storyboard Pro · Adobe Photoshop',
      duration: '12:40 Breakdown',
      description:
        'Deconstructing the cinematic narrative arc from initial lore worldbuilding scripts to rough 2D thumbnail passes. We establish dynamic camera framing, pilot perspective geometry, and panel pacing that translate directly from the Bingäa graphic novel into animated shot sequences.',
      heroBannerUrl: moodboardImg,
      metrics: { fps: '24 FPS ANIMATIC', engine: 'STORYBOARD PRO', resolution: 'B4 MANUSCRIPT' },
      comments: [
        {
          id: 'wfc-1',
          author: 'Elena Vance',
          role: 'ANNUAL PASS MEMBER',
          timestamp: '2h ago',
          text: 'The panel pacing transitions between upper orbit and atmospheric entry build immense tension.',
        },
        {
          id: 'wfc-2',
          author: 'Odi',
          role: 'CREATOR',
          timestamp: '1h ago',
          text: 'Thanks Elena! We timed the cut duration to match the heartbeat frequency of the pilot before the ionization shockwave hits.',
        },
      ],
    },
    {
      id: 'wf-step-02',
      stepNumber: '02',
      tag: 'BLENDER / OCTANE',
      title: '3D Scene Architecture & Shaders',
      subtitle: 'Environment, lighting rigs & node setup',
      toolstack: 'Blender 4.2 · Octane Render Spectral · Quixel Megascans',
      duration: '18:15 Breakdown',
      description:
        'Building the procedural terrain and obsidian spires of Upper Äkinoya. In-depth walkthrough of volumetric absorption shaders, atmospheric fog density nodes, custom spectral emission curves, and 3-point cinematic lighting rigs optimized for 4K rendering.',
      heroBannerUrl: akinoyaVistaImg,
      metrics: { fps: '60.00 FPS', engine: 'OCTANE SPECTRAL', resolution: '4K DCI (3840x2160)' },
      comments: [
        {
          id: 'wfc-3',
          author: 'Cygnus-9',
          role: 'PATRON MEMBER',
          timestamp: '3h ago',
          text: 'The dual-absorption shader approach for the horizon rim solves the black edge artifacting so cleanly!',
        },
        {
          id: 'wfc-4',
          author: 'Odi',
          role: 'CREATOR',
          timestamp: '2h ago',
          text: 'Exactly—it separates the purple stratosphere from the deep space blackbody curve without harsh clipping.',
        },
      ],
    },
    {
      id: 'wf-step-03',
      stepNumber: '03',
      tag: 'AI PIPELINE',
      title: 'AI Visual Enhancements & Prompting',
      subtitle: 'Style consistency, prompt frameworks & frame passes',
      toolstack: 'ComfyUI · Stable Diffusion XL · Custom Sci-Fi LoRA',
      duration: '15:50 Breakdown',
      description:
        'Advanced AI animation augmentation pipeline: utilizing ControlNet depth maps, custom LoRA prompt matrices, and multi-pass frame upscaling to maintain precise character styling, metallic surface textures, and neon lighting consistency without temporal flickering.',
      heroBannerUrl: visualizerThumbnailImg,
      metrics: { fps: 'MULTI-PASS LORA', engine: 'COMFYUI PIPELINE', resolution: '4K UHD MASTER' },
      comments: [
        {
          id: 'wfc-5',
          author: 'Kaelen Thorne',
          role: 'ANNUAL PASS MEMBER',
          timestamp: '4h ago',
          text: 'Could you share the ControlNet depth weight curve used across the high-speed camera tracking shots?',
        },
        {
          id: 'wfc-6',
          author: 'Odi',
          role: 'CREATOR',
          timestamp: '1h ago',
          text: 'We keep depth weight at 0.85 for the first 35% of denoising steps, then taper to 0.4 to let the LoRA style textures take over.',
        },
      ],
    },
    {
      id: 'wf-step-04',
      stepNumber: '04',
      tag: 'AUDIO & EDITING',
      title: 'Music Sync & DaVinci Post-Processing',
      subtitle: 'Audio-reactive animation sync & 4K master export',
      toolstack: 'DaVinci Resolve Studio · Ableton Live 12 · ACEScc',
      duration: '20:05 Breakdown',
      description:
        'Aligning visual cuts to analog synthesizer transients, sub-bass 808 drops, and atmospheric risers. Final ACEScc color science grading, anamorphic halation, organic 35mm film grain overlays, and master delivery in uncompressed 4K 60FPS ProRes 4444 XQ with 24-bit 96kHz LPCM audio.',
      heroBannerUrl: bingaaComicCover,
      metrics: { fps: '60 FPS', engine: 'ACEScc COLOR SCIENCE', resolution: '4K PRORES 4444 XQ' },
      comments: [
        {
          id: 'wfc-7',
          author: 'Elena Vance',
          role: 'ANNUAL PASS MEMBER',
          timestamp: '5h ago',
          text: 'The bass transient alignment with the camera shake at 03:14 hits so hard on monitors.',
        },
      ],
    },
  ]);


  // Test Access Activator (Disabled in preview-only mode)
  const handleActivateTestAccess = () => {
    soundManager.playTone(330, 0.08);
  };

  const handleToggleGuestMode = () => {
    soundManager.playTone(330, 0.08);
  };

  // Stripe Checkout Handler for Annual Pass (€60/Year)
  const handleStripeUpgrade = async () => {
    if (isMembershipLaunchLocked) {
      soundManager.playTone(330, 0.08);
      alert('Community membership pass public checkout launches on 09/01/2027.');
      return;
    }
    setIsSubscribing(true);
    soundManager.playTone(660, 0.08);

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'membership',
          product: 'community_membership',
          customerName: patronName || 'Community Member',
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

  // Asset Vault Action Handler (Navigates internally to Drive Asset Vault)
  const handleDownloadAsset = (_asset: AssetVaultItem, _index: number) => {
    if (!isAnnualOrCreator) {
      soundManager.playTone(330, 0.08);
      setUpgradeModalReason(
        'Asset Vault locked: Requires Äkinoya Annual Pass (€60/yr · launches 09/01/2027)'
      );
      setIsUpgradeModalOpen(true);
      return;
    }

    soundManager.playUnlockChime();
    handleNavigateToVault('root');
  };

  // Toggle Audio Play in Vault
  const handleToggleAudio = (id: string) => {
    if (playingAudioId === id) {
      setPlayingAudioId(null);
      soundManager.playTone(480, 0.06);
    } else {
      setPlayingAudioId(id);
      soundManager.playTone(660, 0.08);
    }
  };

  // Add Comment to Workflow
  const handleAddWorkflowComment = (workflowId: string) => {
    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
    const text = workflowCommentInputs[workflowId]?.trim();
    if (!text) return;

    soundManager.playTone(740, 0.06);
    const commentRole: WorkflowComment['role'] =
      role === 'CREATOR'
        ? 'CREATOR'
        : role === 'ANNUAL_PASS'
        ? 'ANNUAL PASS MEMBER'
        : role === 'VIP_GUEST'
        ? 'VIP GUEST'
        : 'COMMUNITY MEMBER';

    const newComment: WorkflowComment = {
      id: `wfc-${Date.now()}`,
      author: userDisplayName,
      role: commentRole,
      timestamp: 'Just now',
      text,
    };

    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.id === workflowId) {
          return { ...wf, comments: [...wf.comments, newComment] };
        }
        return wf;
      })
    );

    setWorkflowCommentInputs((prev) => ({ ...prev, [workflowId]: '' }));
  };

  // Artist Verification Handlers
  const handleArtistVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
    setArtistSubmitting(true);
    try {
      await updateProfile({
        is_artist: true,
        bio: artistGenre ? `${artistGenre} · Verified Syndicate Artist` : undefined,
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('akinoya_is_artist', 'true');
      }
      soundManager.playUnlockChime();
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#a855f7', '#6366f1', '#38bdf8', '#fbbf24'],
      });
      setArtistSuccess(true);
      setTimeout(() => {
        setArtistSuccess(false);
        setIsArtistModalOpen(false);
        handleSwitchSection('downloads');
      }, 1200);
    } catch (err) {
      console.error('Artist verification error:', err);
    } finally {
      setArtistSubmitting(false);
    }
  };

  const handleInstantArtistVerify = async () => {
    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
    setArtistSubmitting(true);
    try {
      await updateProfile({ is_artist: true });
      if (typeof window !== 'undefined') {
        localStorage.setItem('akinoya_is_artist', 'true');
      }
      soundManager.playUnlockChime();
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.5 },
        colors: ['#a855f7', '#6366f1', '#38bdf8', '#fbbf24'],
      });
      setArtistSuccess(true);
      setTimeout(() => {
        setArtistSuccess(false);
        setIsArtistModalOpen(false);
        handleSwitchSection('downloads');
      }, 1000);
    } catch (err) {
      console.error('Instant verification error:', err);
    } finally {
      setArtistSubmitting(false);
    }
  };


  return (
    <div className="app-shell community-app-shell community-scroll-container community-hub-container relative h-[100dvh] w-full overflow-hidden bg-[#03060c] text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Universal Header Bar (static: sits above the internal scroller, never repositions during scroll) */}
      <header
        ref={hubHeaderRef}
        className="hub-sticky-header hub-static-header relative shrink-0 z-50 transform-gpu w-full border-b border-white/10 bg-[#0a0b10] px-2.5 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-3 w-full max-w-full overflow-visible"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors cursor-pointer min-h-[44px] shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Planet Äkinoya</span>
          </button>

          <div className="h-4 w-px bg-white/15 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span
              key={activeSection}
              className="scifi-header-morph text-xs sm:text-sm font-display font-bold tracking-wider text-white uppercase truncate"
            >
              {getDynamicHeaderTitle()}
            </span>
          </div>
        </div>

        {/* Right Status Actions: Auth Status Profile Button + Locked Membership Badge */}
        <div className="flex items-center justify-end gap-2 sm:gap-2.5 shrink-0">
          <AuthHeaderButton />
          <button
            type="button"
            onClick={isPostLaunch() ? openMembershipGateModal : undefined}
            disabled={!isPostLaunch()}
            className={`hidden xl:inline-flex px-4 py-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-mono font-semibold items-center gap-2 max-w-full truncate sm:whitespace-normal break-words leading-snug min-h-[44px] shadow-sm ${
              isPostLaunch() ? 'cursor-pointer hover:bg-amber-900/70 hover:border-amber-400' : 'cursor-not-allowed select-none'
            }`}
            title={isPostLaunch() ? 'Upgrade to Annual Membership (€60/year)' : 'Public membership launches on January 9, 2027'}
          >
            <Lock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <span className="max-w-full truncate sm:whitespace-normal break-words">
              {isPostLaunch() ? 'UPGRADE TO ANNUAL MEMBERSHIP · €60/YEAR' : 'LAUNCHES JANUARY 9, 2027 · €60/YEAR'}
            </span>
          </button>
        </div>
      </header>

      {/* Already Claimed VIP Link Error Banner */}
      {vipLinkError && (
        <div className="relative z-40 w-full bg-gradient-to-r from-red-950/95 via-rose-950/90 to-red-950/95 border-b border-red-500/50 px-3 sm:px-6 py-2.5 backdrop-blur-none lg:backdrop-blur-xl flex flex-wrap items-center justify-between gap-2 shadow-[0_4px_25px_rgba(239,68,68,0.3)] shrink-0">
          <div className="flex items-center gap-2.5 text-xs text-red-200 font-sans min-w-0">
            <span className="p-1 rounded-md bg-red-500/20 text-red-400 shrink-0">
              <AlertCircle className="w-4 h-4 text-red-400" />
            </span>
            <span className="font-mono font-bold text-red-400 uppercase tracking-wider text-[11px] shrink-0">
              ALREADY CLAIMED VIP LINK:
            </span>
            <span className="truncate text-red-200/90 text-xs">
              THIS VIP LINK HAS ALREADY BEEN CLAIMED. Single-use invitation enforced.
            </span>
          </div>
          <button
            type="button"
            onClick={clearVipLinkError}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active VIP Referral Invitation Banner */}
      {!vipLinkError && hasPendingVipInvitation && !isAuthenticated && (
        <div className="relative z-40 w-full bg-gradient-to-r from-amber-950/95 via-yellow-950/90 to-amber-950/95 border-b border-amber-500/40 px-3 sm:px-6 py-2 sm:py-2.5 backdrop-blur-none lg:backdrop-blur-xl flex flex-wrap items-center justify-between gap-2 shadow-[0_4px_25px_rgba(245,158,11,0.25)] shrink-0">
          <div className="flex items-center gap-2.5 text-xs text-amber-200 font-sans min-w-0">
            <span className="p-1 rounded-md bg-yellow-400/20 text-yellow-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            </span>
            <span className="font-mono font-bold text-yellow-400 uppercase tracking-wider text-[11px] shrink-0">
              VIP Referral Detected:
            </span>
            <span className="truncate text-white/90">
              Sign in to activate your VIP Guest Pass and unlock Creator Lab chat &amp; visualizer channels.
            </span>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal('signin')}
            className="px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-bold text-[11px] tracking-wider transition-all cursor-pointer shadow-md shrink-0 flex items-center gap-1.5"
          >
            <span>Claim VIP Invitation</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6 HUB TABS (WELCOME FIRST PROTOCOL)                      */}
      {/* ======================================================== */}
      {(() => {
        const HUB_TABS = [
          {
            id: 'welcome',
            label: 'Welcome & Vision',
            shortLabel: 'Welcome',
            desc: 'Transmission & Meta-Vision',
            icon: Sparkles,
            count: 'START',
          },
          {
            id: 'workflows',
            label: 'Äkinoya Labs & Workflows',
            shortLabel: 'Labs & Workflows',
            desc: '5-Stage Production Pipeline',
            icon: Sliders,
            count: '5 Stages',
          },
          {
            id: 'downloads',
            label: 'Drive Asset Vault',
            shortLabel: 'Drive Vault',
            desc: '5-Stage Folder Directory',
            icon: FolderDown,
            count: '5 Folders',
          },
          {
            id: 'discussion',
            label: 'Pioneer Lounge',
            shortLabel: 'Pioneer Lounge',
            desc: 'Curated Drops & Vault',
            icon: MessagesSquare,
            count: '3 Channels',
          },
          {
            id: 'creators',
            label: "Favorite Planets & Leaderboard",
            shortLabel: 'Leaderboard',
            desc: 'Community Voting & Dossiers',
            icon: Trophy,
            count: 'Rankings',
          },
          {
            id: 'governance',
            label: 'Lore & Governance Portal',
            shortLabel: 'Lore & Governance',
            desc: 'Syndicate Timeline & Canon',
            icon: Vote,
            count: 'Contest',
          },
        ];

        return (
          <>
            {/* Fixed Bottom Navigation Tray with Horizontal Thumb-Swipe (Mobile & Portrait Tablet Only) */}
            {typeof document !== 'undefined' &&
              createPortal(
                <nav
                  aria-label="Community Hub Bottom Navigation"
                  className="scifi-bottom-nav portrait-mobile-only select-none"
                  style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    zIndex: 9999,
                    paddingBottom: 'env(safe-area-inset-bottom, 16px)',
                    pointerEvents: 'auto',
                    touchAction: 'manipulation',
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {/* 5-Stage Pipeline Quick-Jump Strip when on Äkinoya Labs & Workflows */}
                  {activeSection === 'workflows' && (
                    <div
                      ref={pipelineStagesTrayRef}
                      className="scifi-bottom-tray-scroll px-2.5 pt-2 pb-1 border-b border-white/10"
                    >
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400/90 shrink-0 self-center pr-1">
                        PIPELINE STAGES:
                      </span>
                      {WORKFLOW_STAGES.map((st) => {
                        const isStageActive = activeStageId === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            data-pipeline-stage={st.id}
                            {...getHubNavTouchHandlers(`stage-${st.id}`, () => handleJumpToStage(st.id))}
                            className={`scifi-nav-item shrink-0 px-2.5 py-1 rounded-lg text-[10.5px] font-mono flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                              isStageActive
                                ? 'is-active bg-cyan-500/20 text-cyan-200 border border-cyan-400/60 font-bold'
                                : 'bg-white/[0.04] text-white/65 hover:text-white border border-white/10'
                            }`}
                          >
                            <span className={isStageActive ? 'text-[#ffb700] font-bold' : 'text-white/45'}>
                              [{st.num}]
                            </span>
                            <span>{st.title}</span>
                            <span className="scifi-gold-underline" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Primary Horizontally Swipable Bottom Tray with All 6 Exact Desktop Modules + Claim Your World */}
                  <div className="scifi-bottom-tray-scroll px-2.5 py-0.5">
                    {HUB_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeSection === tab.id;
                      const isTapping = tappingHubTab === tab.id;

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          {...getHubNavTouchHandlers(`hub-${tab.id}`, () => handleSwitchSection(tab.id as CreativeHubSection))}
                          className={`scifi-nav-item shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-mono cursor-pointer whitespace-nowrap min-h-[46px] ${
                            isActive
                              ? 'is-active bg-amber-500/15 text-amber-200 border border-amber-400/45 font-bold'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/75 hover:text-white border border-white/10'
                          } ${isTapping ? 'is-tapping' : ''}`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-[#ffb700]' : 'text-cyan-400'
                            }`}
                          />
                          <span>{tab.label}</span>
                          <span
                            className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-bold ${
                              isActive
                                ? 'bg-amber-400/25 text-amber-200'
                                : 'bg-white/10 text-white/60'
                            }`}
                          >
                            {tab.count}
                          </span>
                          <span className="scifi-gold-underline" />
                        </button>
                      );
                    })}

                    {/* Retain Exclusively Claim Your World in Swipable Tray */}
                    <button
                      type="button"
                      {...getHubNavTouchHandlers('claim-world', () => {
                        soundManager.playTone(520, 0.05);
                        openClaimWorldModal();
                      })}
                      className="scifi-nav-item shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/45 text-amber-300 font-mono text-xs font-bold tracking-wider cursor-pointer whitespace-nowrap min-h-[46px]"
                    >
                      <Globe2 className="w-4 h-4 text-[#ffb700] shrink-0" />
                      <span>CLAIM YOUR WORLD</span>
                    </button>
                  </div>
                </nav>,
                document.body
              )}

            {/* Layout Wrapper: Desktop Left Sidebar + Main Content Viewport */}
            <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1700px] mx-auto min-h-0 overflow-hidden">
              {/* ======================================================== */}
              {/* DESKTOP FIXED/STICKY LEFT SIDEBAR NAVIGATION            */}
              {/* ======================================================== */}
              <aside
                className="sidebar-container sidebar hub-sidebar desktop-landscape-sidebar hidden md:flex w-64 lg:w-72 shrink-0 h-full max-h-[100dvh] flex-col bg-[#050812] border-r border-white/10 z-40 overscroll-contain community-scroll-container"
                style={{
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {/* 1. Fixed Top Branding Header (Never scrolls away) */}
                <div className="sidebar-header shrink-0 p-4 lg:p-5 pb-3 border-b border-white/10 space-y-1 bg-[#050812]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,242,254,0.8)]" />
                      COMMUNITY OS v2.4
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">
                      6 MODULES
                    </span>
                  </div>
                  <div className="text-xs font-display font-black text-white tracking-wide">
                    ÄKINOYA PORTAL NAVIGATOR
                  </div>
                </div>

                {/* 2. Scrollable Navigation: .sidebar-nav-links (Ends cleanly after the last module) */}
                <div className="sidebar-nav-links hub-sidebar-scroll flex-grow min-h-0 overflow-y-auto overscroll-contain p-4 lg:p-5 pt-3 pb-6 space-y-1.5">
                  {HUB_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeSection === tab.id;

                    return (
                      <div key={tab.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => handleSwitchSection(tab.id as CreativeHubSection)}
                          className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group min-h-[46px] ${
                            isActive
                              ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.4)] font-bold scale-[1.01]'
                              : 'bg-white/[0.03] border-white/5 hover:border-cyan-400/40 hover:bg-white/[0.07] text-white/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                                isActive ? 'text-black' : 'text-cyan-400'
                              }`}
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-mono font-bold block truncate">
                                {tab.label}
                              </span>
                              <span
                                className={`text-[9.5px] font-sans block truncate ${
                                  isActive ? 'text-black/80 font-medium' : 'text-white/40'
                                }`}
                              >
                                {tab.desc}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold shrink-0 ml-1.5 ${
                              isActive
                                ? 'bg-black/20 text-black'
                                : 'bg-white/10 text-white/60 group-hover:bg-cyan-500/20 group-hover:text-cyan-300'
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>

                        {/* Nested Pipeline Stages sub-menu when on Labs & Workflows */}
                        {isActive && tab.id === 'workflows' && (
                          <div className="ml-3 pl-3 border-l-2 border-cyan-500/40 space-y-1 pt-1.5 pb-1">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400/90 block px-2 pb-0.5">
                              PIPELINE STAGES
                            </span>
                            {WORKFLOW_STAGES.map((st) => {
                              const isStageActive = activeStageId === st.id;
                              return (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleJumpToStage(st.id);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                                    isStageActive
                                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/60 shadow-[0_0_12px_rgba(0,242,254,0.35)] font-bold'
                                      : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    <span
                                      className={`text-[10px] ${
                                        isStageActive ? 'text-cyan-300 font-bold' : 'text-white/40'
                                      }`}
                                    >
                                      [{st.num}]
                                    </span>
                                    <span className="truncate text-[11px]">{st.title}</span>
                                  </span>
                                  {isStageActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0 ml-1 shadow-[0_0_6px_#00f2fe]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </aside>

              {/* Main Content Viewport (isolated internal scroller) */}
              <main
                ref={hubScrollRef}
                data-scroll-container="community-hub"
                className={`hub-main-scroll community-feed ${
                  activeSection === 'workflows' ? 'portrait-bottom-safe-pad-workflows' : 'portrait-bottom-safe-pad'
                } relative z-0 isolate flex-1 min-w-0 min-h-0 h-full overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-6 sm:px-6 sm:py-8 lg:p-8 space-y-6 sm:space-y-8`}
                style={{ contain: 'layout', WebkitOverflowScrolling: 'touch', overflowAnchor: 'none' }}
              >
                {/* ======================================================== */}
                {/* SECTION 0: 00 · WELCOME & VISION PORTAL (PRIMARY LANDING)*/}
                {/* ======================================================== */}
                {activeSection === 'welcome' && (
                  <motion.div
                    key="section-welcome"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="space-y-6"
                  >
                    <React.Suspense fallback={<HubModuleLoading label="INITIALIZING VISION PORTAL..." />}>
                      <WelcomeVisionPortal
                        isMember={userHasAnnual}
                        onNavigateToWorkflows={() => handleSwitchSection('workflows')}
                        onNavigateToVault={() => handleNavigateToVault('root')}
                        onNavigateToDiscussion={() => handleSwitchSection('discussion')}
                        onNavigateToLeaderboard={() => handleSwitchSection('creators')}
                        onOpenAuthModal={() => openAuthModal('signin')}
                      />
                    </React.Suspense>
                  </motion.div>
                )}

                {/* ======================================================== */}
                {/* SECTION 1: ÄKINOYA LABS UNIVERSAL WORKFLOW & CASE STUDIES */}
                {/* ======================================================== */}
                {activeSection === 'workflows' && (
                  <motion.div
                    key="section-workflows"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ willChange: 'opacity, transform' }}
                    className="space-y-6 w-full bg-[#040711] rounded-3xl p-1.5 sm:p-3 md:p-5 border border-cyan-500/25 shadow-[0_12px_45px_rgba(0,0,0,0.95)] transform-gpu"
                  >
                    <React.Suspense fallback={<HubModuleLoading label="LOADING WORKFLOW LABS..." />}>
                      <AkinoyaLabsHub
                        isMember={userHasAnnual}
                        onOpenAuthModal={() => openAuthModal('signin')}
                        onNavigateVerify={() => {
                          window.location.href = '/verify';
                        }}
                        onNavigateToVault={handleNavigateToVault}
                      />
                    </React.Suspense>
                  </motion.div>
                )}

                {/* ======================================================== */}
                {/* SECTION 2: ASSET & DOWNLOAD VAULT (DRIVE DIRECTORY UI)   */}
                {/* ======================================================== */}
                {activeSection === 'downloads' && (
                  <motion.div
                    key="section-downloads"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="space-y-6"
                  >
                    <React.Suspense fallback={<HubModuleLoading label="INITIALIZING DRIVE VAULT..." />}>
                      <DriveFolderVault
                        isMember={userHasAnnual}
                        initialFolderId={targetVaultFolderId}
                        onOpenAuthModal={() => openAuthModal('signin')}
                      />
                    </React.Suspense>
                  </motion.div>
                )}

        {/* ======================================================== */}
        {/* SECTION 3: PIONEER LOUNGE & THE VAULT                    */}
        {/* ======================================================== */}
        {activeSection === "discussion" && (
          <motion.div
            key="section-discussion"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <React.Suspense fallback={<HubModuleLoading label="INITIALIZING PIONEER LOUNGE..." />}>
              <PioneerLounge
                isMember={userHasAnnual}
                isAuthenticated={isAuthenticated}
                userDisplayName={userDisplayName}
                onOpenAuthModal={() => openAuthModal("signin")}
                onOpenUpgradeModal={(reason) => {
                  setUpgradeModalReason(reason);
                  setIsUpgradeModalOpen(true);
                }}
                onNavigateToVault={handleNavigateToVault}
              />
            </React.Suspense>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* SECTION 5: CREATOR PORTFOLIOS & LEADERBOARD              */}
        {/* ======================================================== */}
        {activeSection === 'creators' && (
          <motion.div
            key="section-creators"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-black/50 to-black/80 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-400/40 text-amber-300 font-bold tracking-wider">
                    MODULE 05 · COMMUNITY SPOTLIGHT &amp; RANKINGS
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    GROUP'S FAVORITE PLANETS · REALTIME LEADERBOARD
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
                  🏆 Group's Favorite Planets Leaderboard
                </h1>
                <p className="text-xs sm:text-sm text-white/70 font-sans mt-1 max-w-2xl">
                  Explore the community&apos;s top-voted planets and inspect exclusive cinematic trailers, unique verification story cards, and complete 5-photo sci-fi dossiers.
                </p>
              </div>
            </div>

            <div className="w-full">
              <React.Suspense fallback={<HubModuleLoading label="COMPUTING LEADERBOARDS..." />}>
                <CreatorLeaderboard />
              </React.Suspense>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* SECTION 5: LORE & GOVERNANCE PORTAL                      */}
        {/* ======================================================== */}
        {activeSection === 'governance' && (
          <motion.div
            key="section-governance"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <React.Suspense fallback={<HubModuleLoading label="LOADING GOVERNANCE PORTAL..." />}>
              <LoreGovernancePortal
                onNavigateToContest={() => {
                  window.location.href = '/contest';
                }}
                onOpenCreator={(u) => {
                  setSelectedCreatorUsername(u);
                  setActiveSection('creators');
                  if (onOpenCreator) onOpenCreator(u);
                }}
                onOpenUpgradeModal={(reason) => {
                  setUpgradeModalReason(reason);
                  setIsUpgradeModalOpen(true);
                }}
              />
            </React.Suspense>
          </motion.div>
        )}

        {/* Stable Compliance Footer inside Community Hub Scroller */}
        <footer
          style={{ overflowAnchor: 'none' }}
          className="relative z-10 w-full shrink-0 border-t border-white/10 bg-[#050811]/95 rounded-2xl py-4 px-4 sm:px-6 mt-8 text-center space-y-2"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] sm:text-xs font-mono text-white/50">
            <div>
              © 2027 SILLOW MILL <span className="text-white/25">/</span> ALL RIGHTS RESERVED
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] sm:text-[11px]">
              <a
                href="/privacy"
                className="text-white/65 hover:text-cyan-300 transition-colors underline-offset-4 hover:underline"
              >
                Privacy Policy
              </a>
              <span className="text-white/25">·</span>
              <a
                href="/kyc"
                className="text-white/65 hover:text-cyan-300 transition-colors underline-offset-4 hover:underline"
              >
                KYC Verification
              </a>
              <span className="text-white/25">·</span>
              <span className="text-cyan-400/90">ÄKINOYA LIVE PROTOCOL</span>
              <span className="text-white/25">·</span>
              <span>ARCHIVE ACCESS SECURED</span>
            </div>
          </div>

          <div className="max-w-7xl mx-auto pt-2 border-t border-white/10 text-[10px] sm:text-[11px] font-mono text-white/45 flex flex-wrap items-center justify-center gap-1 sm:gap-2 leading-relaxed">
            <span>Sillow Mill</span>
            <span className="text-white/25">·</span>
            <span>Enterprise No. (KBO): 1041.720.513</span>
            <span className="text-white/25">·</span>
            <span>VAT: BE 1041.720.513</span>
            <span className="text-white/25">·</span>
            <a href="mailto:Odi@sillowmill.com" className="text-white/60 hover:text-cyan-300 transition-colors">
              Odi@sillowmill.com
            </a>
            <span className="text-white/25">·</span>
            <span>KBC BE97 7460 3951 7915</span>
          </div>
        </footer>
      </main>
      </div>
          </>
        );
      })()}

      {/* ======================================================== */}
      {/* FREEMIUM PAYWALL UPGRADE MODAL (€60/YEAR ANNUAL PASS)    */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isUpgradeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#060a12] border border-cyan-500/40 rounded-2xl p-5 sm:p-8 shadow-[0_0_60px_rgba(56,189,248,0.25)] space-y-5 my-auto"
            >
              <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-bold uppercase tracking-wider">
                    CREATIVE VAULT PASS
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">
                    €60/YEAR (~€5/MONTH)
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                  Unlock Full Creative Vault
                </h3>
                <p className="text-xs text-white/70 font-sans mt-1">
                  {upgradeModalReason}
                </p>
              </div>

              {/* Value Feature Bullets */}
              <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2 text-xs font-sans text-white/80">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Unrestricted 1-Click Downloads for All 4K Wallpapers &amp; Art</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Full Ableton Live &amp; Modular Synth DAW Project Templates (.ALS)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Uncompressed 24-Bit / 96kHz VIP Audio Masters &amp; Project Files</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Unreleased Video Visualizers &amp; 3D Production Shaders</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Binding Lore Governance Votes &amp; Wave 2 Merch Priority Whitelist</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled={isMembershipLaunchLocked || isSubscribing}
                  onClick={handleStripeUpgrade}
                  className={
                    isMembershipLaunchLocked
                      ? "w-full min-h-[48px] py-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-semibold text-amber-300 bg-amber-950/60 border border-amber-500/40 cursor-not-allowed flex items-center justify-center gap-2 select-none shadow-md"
                      : "w-full min-h-[48px] py-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
                  }
                >
                  {isMembershipLaunchLocked ? (
                    <Lock className="w-4 h-4 text-yellow-400 shrink-0" />
                  ) : (
                    <CreditCard className="w-4 h-4 text-black" />
                  )}
                  <span className="whitespace-normal break-words text-center leading-snug">
                    {isMembershipLaunchLocked
                      ? 'LAUNCHES 09/01/2027 · €60/YEAR (~€5/MONTH)'
                      : isSubscribing
                      ? 'INITIALIZING STRIPE...'
                      : 'ACTIVATE ANNUAL MEMBERSHIP · €60/YEAR (~€5/MONTH)'}
                  </span>
                </button>

                <div className="text-center text-[11px] font-mono text-white/50 flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span>The portal is currently in preview-only mode until launch on 09/01/2027.</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Download Alert Toast */}
      <AnimatePresence>
        {downloadToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-cyan-950/95 border border-cyan-400 text-white font-mono text-xs shadow-2xl flex items-center gap-3 backdrop-blur-none lg:backdrop-blur-md"
          >
            <Download className="w-5 h-5 text-cyan-400 animate-bounce" />
            <div>
              <div className="font-bold text-cyan-300">Vault Download Active</div>
              <div className="text-[11px] text-white/80">{downloadToast}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Artist Verification Modal */}
      <AnimatePresence>
        {isArtistModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#070b14] border border-purple-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.25)] space-y-5"
            >
              <button
                type="button"
                onClick={() => setIsArtistModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white tracking-wide">
                    Pro Audio Syndicate · Artist Verification
                  </h3>
                  <p className="text-xs text-purple-300/80 font-mono">
                    Unlock #plugins-deals-vault, master chains &amp; stem swaps
                  </p>
                </div>
              </div>

              {artistSuccess ? (
                <div className="p-6 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                  <h4 className="text-sm font-bold text-white">Artist Credentials Verified!</h4>
                  <p className="text-xs text-white/70">
                    Welcome to the Pro Audio Lounge. Unlocking #plugins-deals-vault...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleArtistVerificationSubmit} className="space-y-4">
                  <p className="text-xs text-white/70 font-sans leading-relaxed">
                    Verified artists, music producers, and sound designers receive lifetime access to curated VST/AU discounts (FabFilter, UAD), custom Ableton 12 / Bitwig racks, and production stems.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-white/70 uppercase">
                      Artist / Producer Alias
                    </label>
                    <input
                      type="text"
                      required
                      value={artistAlias || userDisplayName}
                      onChange={(e) => setArtistAlias(e.target.value)}
                      placeholder="e.g. Sillow Mill, Vance, etc."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-purple-400 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-white/70 uppercase">
                      Primary Genre / Discipline
                    </label>
                    <select
                      value={artistGenre}
                      onChange={(e) => setArtistGenre(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-purple-400 text-xs text-white outline-none font-mono"
                    >
                      <option value="Electronic / Ambient Sound Design">Electronic / Ambient Sound Design</option>
                      <option value="Cinematic / Hybrid Orchestral">Cinematic / Hybrid Orchestral</option>
                      <option value="Drum & Bass / Neurofunk">Drum & Bass / Neurofunk</option>
                      <option value="Techno / Industrial">Techno / Industrial</option>
                      <option value="Hip-Hop / Lo-Fi Beats">Hip-Hop / Lo-Fi Beats</option>
                      <option value="Game Audio / Interactive FMOD">Game Audio / Interactive FMOD</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-white/70 uppercase">
                      Portfolio or Music Link (SoundCloud, Spotify, YouTube, Bandcamp)
                    </label>
                    <input
                      type="url"
                      value={artistLink}
                      onChange={(e) => setArtistLink(e.target.value)}
                      placeholder="https://soundcloud.com/your-artist-profile"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-purple-400 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={artistSubmitting}
                      className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{artistSubmitting ? 'VERIFYING CREDENTIALS...' : 'CONFIRM & VERIFY ARTIST STATUS'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleInstantArtistVerify}
                      className="w-full min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 border border-purple-500/30 text-purple-300 font-mono text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Instant Syndicate Access (Demo / Fast Pass)</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
