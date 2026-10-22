import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { useVipAccess, setDeviceSession, getOrCreateDeviceId } from '../context/VipAccessContext';
import { useAuth } from '../context/AuthContext';
import {
  useHolderName,
  getHolderName,
  saveHolderName,
  clearHolderName,
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
  deleteCertificate,
  getMasterCertificate,
  downloadCertificatePng,
  deriveEditionNumber,
  TOTAL_EDITION_LIMIT,
  hasAnyStoredCertificate,
} from '../utils/certificate';
import { checkVipTokenStatus, OTHER_ACCOUNT_VIP_ERROR, isFounderEmail } from '../lib/vipTokens';

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
  const { user, profile, openAuthModal, redeemVipCode, isVip, hasVipPass, role } = useAuth();

  const isUserVip = Boolean(
    role !== 'FREE' &&
    role !== 'GUEST' &&
    (
      isVip ||
      hasVipPass ||
      profile?.has_vip_pass ||
      profile?.is_vip ||
      role === 'VIP_GUEST' ||
      role === 'CREATOR'
    )
  );

  // Extract query params: token / id, enc (NTAG 424 DNA dynamic cipher), claim (transfer key)
  const [queryParams] = useState<{
    token: string;
    enc: string | null;
    cmac: string | null;
    claim: string | null;
  }>(() => {
    if (typeof window === 'undefined') {
      return { token: '', enc: null, cmac: null, claim: null };
    }
    const params = new URLSearchParams(window.location.search);
    const pathToken = window.location.pathname.replace(/^\/verify\/?/, '').replace(/\/+$/, '').trim();
    const token =
      tokenIdFromRoute ||
      pathToken ||
      params.get('token') ||
      params.get('id') ||
      params.get('pass') ||
      '';

    return {
      token: token ? token.toUpperCase().replace(/^#/, '') : '',
      enc: params.get('enc'),
      cmac: params.get('cmac'),
      claim: params.get('claim'),
    };
  });

  const activeToken = queryParams.token || '';
  const isMaster = Boolean(activeToken && activeToken === 'AKN-VIP-2027-X0914');
  const derivedEdition = activeToken ? deriveEditionNumber(activeToken) : 0;

  // Per-pass stored holder name and certificate (isolated per Pass ID)
  const localStoredName = useHolderName(activeToken);
  const localStoredCert = useCertificate(activeToken);

  // Claim state (for unassigned passes)
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  // Verification state from server
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [isDnaAuthentic, setIsDnaAuthentic] = useState<boolean>(false);
  const [dnaError, setDnaError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('VERIFYING AUTHENTICITY');

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
    tokenId: activeToken ? `#${activeToken}` : '',
    edition: isMaster ? 'Founders Pass (#0)' : (activeToken ? `${derivedEdition} of 100` : 'Pass Required'),
    editionNumber: isMaster ? 0 : derivedEdition,
    origin: 'Genesis Archive (Leuven Origin)',
    issueDate: '09.01.2027',
    coordinates: "RA 04h 35m / +16° 30'",
    status: activeToken ? 'Unclaimed VIP Pass — Ready for Registration' : 'No Valid Pass ID Provided',
    ownerName: '',
    ownerEmail: null,
    isClaimed: false,
    registeredAt: null,
    certificate: null,
  });

  // UI helpers
  const [copiedToken, setCopiedToken] = useState(false);

  // Determine if this pass is officially claimed by the active account or previously
  const isUserLoggedIn = Boolean(user || profile);
  const currentUserEmail = (user?.email || profile?.email || '').trim().toLowerCase();
  const isFounderAccount = isFounderEmail(currentUserEmail);

  // Check if this specific pass has been officially claimed in database or storage
  const isPassClaimedInRecord = Boolean(
    passData.isClaimed &&
    passData.ownerName &&
    passData.ownerName.trim().length > 0 &&
    passData.status !== 'Unclaimed VIP Pass — Ready for Registration' &&
    passData.status !== 'UNASSIGNED / READY TO CLAIM' &&
    passData.status !== 'FOUNDERS PASS (#0) / READY TO CLAIM'
  );

  const isClaimedByUser = Boolean(
    isUserLoggedIn &&
    isPassClaimedInRecord && (
      (isMaster && isFounderAccount && (
        profile?.vip_code_redeemed === activeToken ||
        (passData.ownerEmail && isFounderEmail(passData.ownerEmail))
      )) ||
      (!isMaster && (
        profile?.vip_code_redeemed === activeToken ||
        (passData.ownerEmail && currentUserEmail === passData.ownerEmail.toLowerCase())
      ))
    )
  );

  const hasClaimedPass = Boolean(
    isPassClaimedInRecord && (
      isClaimedByUser ||
      (isUserLoggedIn && passData.ownerEmail && (currentUserEmail === passData.ownerEmail.toLowerCase()))
    )
  );

  const isClaimed = Boolean(
    isPassClaimedInRecord && (
      hasClaimedPass ||
      Boolean(localStoredCert && localStoredCert.holderName && localStoredCert.holderName.trim().length > 0)
    )
  );

  const userAlreadyHoldsPass = Boolean(
    (isUserLoggedIn && (
      isUserVip ||
      profile?.has_vip_pass === true ||
      profile?.is_vip === true ||
      role === 'VIP_GUEST' ||
      role === 'CREATOR' ||
      Boolean(profile?.vip_code_redeemed)
    )) ||
    hasAnyStoredCertificate() ||
    Boolean(localStoredCert) ||
    (typeof window !== 'undefined' && (
      Boolean(localStorage.getItem('akinoya_patron_token')) ||
      Boolean(localStorage.getItem('akinoya_bingaa_certificates')) ||
      Boolean(localStorage.getItem('sillow_vip_device_access') === 'true') ||
      Boolean(sessionStorage.getItem('akinoya_vip_unlocked') === 'true') ||
      Boolean(localStorage.getItem('sillow_vip_bound_token')) ||
      localStorage.getItem('akinoya_patron_role') === 'CREATOR' ||
      localStorage.getItem('akinoya_patron_role') === 'VIP_GUEST'
    ))
  );

  const activeHolderName = isClaimed
    ? (passData.ownerName ||
       localStoredCert?.holderName ||
       localStoredName ||
       (isMaster && (profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Odi Selis')) ||
       profile?.full_name ||
       (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : null) ||
       user?.user_metadata?.full_name ||
       (isMaster ? 'Odi Selis' : 'Founding VIP Member'))
    : '';

  const activeHolderEmail = isClaimed
    ? (passData.ownerEmail ||
       localStoredCert?.holderEmail ||
       (isMaster ? (profile?.email || user?.email || 'odi.selis3@gmail.com') : profile?.email || user?.email))
    : null;

  const activeCertificate: BingaaCertificate =
    localStoredCert ||
    passData.certificate ||
    (isMaster
      ? {
          certificateId: 'COA-BNG1-001-FOUNDER',
          title: 'CERTIFICATE OF AUTHENTICITY — BINGÄA ISSUE #1',
          passId: activeToken,
          holderName: hasClaimedPass ? (activeHolderName || 'Odi Selis') : 'Unclaimed / Pending Registration',
          holderEmail: hasClaimedPass ? (activeHolderEmail || undefined) : undefined,
          editionNumber: 0,
          editionTotal: TOTAL_EDITION_LIMIT,
          status: hasClaimedPass ? 'MASTER FOUNDER ORIGINAL' : 'Unclaimed VIP Pass — Ready for Registration',
          emailVerified: Boolean(hasClaimedPass && activeHolderEmail),
          claimedAt: passData.registeredAt || (hasClaimedPass ? new Date().toISOString() : 'UNCLAIMED'),
          signatureAlgorithm: 'HMAC-SHA256',
          signature: hasClaimedPass
            ? 'A0B9C8D7E6F50413241516171819202122232425262728293031323334353637'
            : 'PENDING REGISTRATION',
        }
      : {
          certificateId: `COA-BNG1-${String(passData.editionNumber).padStart(3, '0')}-VERIFIED`,
          title: 'CERTIFICATE OF AUTHENTICITY — BINGÄA ISSUE #1',
          passId: activeToken,
          holderName: hasClaimedPass ? (activeHolderName || 'Founding VIP Member') : 'Unclaimed / Pending Registration',
          holderEmail: hasClaimedPass ? (activeHolderEmail || undefined) : undefined,
          editionNumber: passData.editionNumber,
          editionTotal: TOTAL_EDITION_LIMIT,
          status: hasClaimedPass ? 'OFFICIALLY VERIFIED' : 'Unclaimed VIP Pass — Ready for Registration',
          emailVerified: Boolean(hasClaimedPass && activeHolderEmail),
          claimedAt: passData.registeredAt || (hasClaimedPass ? new Date().toISOString() : 'UNCLAIMED'),
          signatureAlgorithm: 'HMAC-SHA256',
          signature: hasClaimedPass ? 'Sillow Mill · Creative Syndicate' : 'PENDING REGISTRATION',
        });

  const [isResettingPass, setIsResettingPass] = useState(false);

  const handleResetPass = async () => {
    if (!isFounderAccount) return;
    setIsResettingPass(true);
    soundManager.playTone(480, 0.05);
    try {
      clearHolderName(activeToken);
      deleteCertificate(activeToken);
      localStorage.removeItem('akinoya_pending_vip_pass');
      sessionStorage.removeItem('pending_vip_code');

      await fetch('/api/nfc/reset-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activeToken }),
      }).catch((e) => console.warn('Reset endpoint notice:', e));

      setDnaError(null);
      setPassData((prev) => ({
        ...prev,
        status: 'Unclaimed VIP Pass — Ready for Registration',
        ownerName: '',
        ownerEmail: null,
        isClaimed: false,
        registeredAt: null,
        certificate: null,
      }));

      await executeVerification(activeToken, queryParams.enc, queryParams.cmac);
      soundManager.playUnlockChime();
    } catch (err) {
      console.warn('Reset pass exception:', err);
    } finally {
      setIsResettingPass(false);
    }
  };

  // Execute verification against server-side NTAG engine
  const executeVerification = async (token: string, enc: string | null, cmac: string | null) => {
    // If no token is provided at all, require authorized authentication
    if (!token) {
      setIsDnaAuthentic(false);
      setStatusText('TOKEN REQUIRED');
      setDnaError('Authentication Required: Please scan your authentic Äkinoya NFC pass or enter via an authorized VIP invitation.');
      setIsValidating(false);
      return;
    }

    // If the logged-in user already holds a verified pass / Certificate of Authenticity and didn't provide a claim key,
    // do not trigger error loops against unowned/master passes
    if (userAlreadyHoldsPass && !queryParams.claim) {
      setIsValidating(false);
      setDnaError(null);
      return;
    }

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

    // Strict 1-to-1 email ownership validation in Supabase
    if (!isMaster) {
      const tokenStatus = await checkVipTokenStatus(token, user?.id, currentUserEmail);
      if (tokenStatus.isAlreadyClaimed) {
        if (tokenStatus.isClaimedByMe) {
          // Matches original owner
        } else {
          setIsDnaAuthentic(false);
          setStatusText('Ai! Deze VIP-pas is al geclaimd.');
          setDnaError('Ai! Deze VIP-pas is al geclaimd.');
          soundManager.playError();
          setIsValidating(false);
          return;
        }
      }
    } else {
      // Master Founder Pass (AKN-VIP-2027-X0914) strictly bound to odi.selis3@gmail.com
      if (!isFounderAccount) {
        setIsDnaAuthentic(false);
        setStatusText('FOUNDER ACCESS RESTRICTED');
        setDnaError('Restricted Access: The Founder Pass (#0) is strictly restricted to the primary founder credentials (Odi Selis).');
        soundManager.playError();
        setIsValidating(false);
        return;
      }
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

        if (data.pass) {
          const pass = data.pass;
          const isPassClaimed = Boolean(
            pass.isClaimed &&
            pass.ownerName &&
            pass.ownerName.trim().length > 0 &&
            pass.status !== 'Unclaimed VIP Pass — Ready for Registration'
          );

          // If pass is already claimed by another email in server store
          if (
            isPassClaimed &&
            pass.ownerEmail &&
            currentUserEmail &&
            pass.ownerEmail.trim().toLowerCase() !== currentUserEmail
          ) {
            setIsDnaAuthentic(false);
            setStatusText('Ai! Deze VIP-pas is al geclaimd.');
            setDnaError('Ai! Deze VIP-pas is al geclaimd.');
            soundManager.playError();
            setIsValidating(false);
            return;
          }

          setStatusText(
            data.isAuthentic
              ? 'AUTHENTIC'
              : (isMaster
                  ? (isPassClaimed ? 'MASTER FOUNDER ORIGINAL' : 'READY TO CLAIM')
                  : (isPassClaimed ? 'VERIFIED ORIGINAL' : 'READY TO CLAIM'))
          );
          setPassData((prev) => ({
            ...prev,
            ...pass,
            ownerName: isPassClaimed ? (pass.ownerName || prev.ownerName) : '',
            ownerEmail: isPassClaimed ? (pass.ownerEmail || prev.ownerEmail) : null,
            isClaimed: isPassClaimed,
            status: isMaster
              ? (isPassClaimed ? 'MASTER FOUNDER ORIGINAL' : 'Unclaimed VIP Pass — Ready for Registration')
              : (pass.status || (isPassClaimed ? 'OFFICIALLY VERIFIED' : 'Unclaimed VIP Pass — Ready for Registration')),
          }));

          if (isPassClaimed) {
            if (pass.certificate) {
              saveCertificate(pass.certificate);
            }
            if (pass.ownerName) {
              saveHolderName(pass.ownerName, token);
            }
          } else {
            // Clean up stale local storage and certificate for unclaimed/reset token
            clearHolderName(token);
            deleteCertificate(token);
          }
        }

        // Grant persistent VIP access only once the pass is claimed
        if (hasClaimedPass || (data.pass && data.pass.isClaimed && data.pass.ownerName)) {
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
      if (hasClaimedPass || localStoredCert) {
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

  // Guard on verify route: auto-redirect verified pass holders to their assets dossier
  useEffect(() => {
    if (userAlreadyHoldsPass && !queryParams.claim) {
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/?tab=assets#assets');
        }
        onNavigateHome();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [userAlreadyHoldsPass, queryParams.claim, onNavigateHome]);

  // Copy token ID
  const handleCopyToken = () => {
    navigator.clipboard?.writeText?.(activeToken);
    setCopiedToken(true);
    soundManager.playTone(880, 0.08);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Primary CTA Action: Claim VIP Invitation
  const handleClaimVipInvitation = () => {
    soundManager.playTone(660, 0.08);
    // Explicitly record pending VIP token in storage for auth binding
    localStorage.setItem('akinoya_pending_vip_pass', activeToken);
    sessionStorage.setItem('pending_vip_code', activeToken);
    localStorage.setItem('pending_role', 'VIP_GUEST');
    sessionStorage.setItem('pending_role', 'VIP_GUEST');

    if (user || profile) {
      executeClaimForUser(user, profile);
    } else {
      openAuthModal('signup');
    }
  };

  // Execute Claim for Authenticated User (binds Pass ID to user account)
  const executeClaimForUser = async (targetUser?: any, targetProfile?: any) => {
    if (isClaiming || dnaError) return;
    const currentUser = targetUser || user;
    const currentProfile = targetProfile || profile;

    if (!currentUser && !currentProfile) {
      // Record pending pass intent and open Auth Gateway modal
      localStorage.setItem('akinoya_pending_vip_pass', activeToken);
      sessionStorage.setItem('pending_vip_code', activeToken);
      localStorage.setItem('pending_role', 'VIP_GUEST');
      sessionStorage.setItem('pending_role', 'VIP_GUEST');
      openAuthModal('signup');
      return;
    }

    setIsClaiming(true);
    setClaimError(null);
    soundManager.playTone(660, 0.08);

    const rawName =
      currentProfile?.full_name ||
      (currentProfile?.first_name ? `${currentProfile.first_name} ${currentProfile.last_name || ''}`.trim() : null) ||
      currentUser?.user_metadata?.full_name ||
      currentUser?.user_metadata?.name ||
      (currentUser?.user_metadata?.first_name ? `${currentUser.user_metadata.first_name} ${currentUser.user_metadata.last_name || ''}`.trim() : null) ||
      currentUser?.email?.split('@')[0] ||
      (isMaster ? 'Odi Selis' : 'Founding VIP Member');

    const cleanName = sanitizeHolderName(rawName) || (isMaster ? 'Odi Selis' : 'Founding VIP Member');
    const cleanEmail = (currentUser?.email || currentProfile?.email || '').trim().toLowerCase();

    try {
      if (isMaster) {
        const isFounder = isFounderEmail(cleanEmail);
        if (!isFounder) {
          setClaimError('Ai! Deze VIP-pas is al geclaimd.');
          soundManager.playError();
          setIsClaiming(false);
          return;
        }
      } else {
        const tokenStatus = await checkVipTokenStatus(activeToken, currentUser?.id, cleanEmail);
        if (tokenStatus.isAlreadyClaimed) {
          if (tokenStatus.isClaimedByMe) {
            soundManager.playUnlockChime();
            setIsClaiming(false);
            return;
          }
          setClaimError('Ai! Deze VIP-pas is al geclaimd.');
          soundManager.playError();
          setIsClaiming(false);
          return;
        }
      }

      // 1. Call server-side NFC register endpoint (records pass in backend & syncs Blad1/VIP GUESTS row in Google Sheets)
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

      // 2. Permanently link VIP status to Supabase public.profiles & sync to Google Sheets Subscribers tab
      await redeemVipCode(activeToken);

      // 3. Issue and persist unique Certificate of Authenticity with authenticated claimant details
      const cert: BingaaCertificate = isMaster
        ? {
            ...(data?.certificate || {}),
            certificateId: (data && data.certificate?.certificateId) || 'COA-BNG1-001-FOUNDER',
            title: 'CERTIFICATE OF AUTHENTICITY — BINGÄA ISSUE #1',
            passId: activeToken,
            holderName: cleanName || 'Odi Selis',
            holderEmail: cleanEmail || 'odi.selis3@gmail.com',
            editionNumber: 0,
            editionTotal: TOTAL_EDITION_LIMIT,
            status: (data && data.certificate?.status) || 'MASTER FOUNDER ORIGINAL',
            emailVerified: Boolean(cleanEmail || true),
            claimedAt: (data && data.certificate?.claimedAt) || new Date().toISOString(),
            signatureAlgorithm: (data && data.certificate?.signatureAlgorithm) || 'HMAC-SHA256',
            signature: (data && data.certificate?.signature) || 'A0B9C8D7E6F50413241516171819202122232425262728293031323334353637',
          }
        : {
            ...(data?.certificate || {}),
            certificateId: (data && data.certificate?.certificateId) || `COA-BNG1-${String(passData.editionNumber).padStart(3, '0')}-VERIFIED`,
            title: 'CERTIFICATE OF AUTHENTICITY — BINGÄA ISSUE #1',
            passId: activeToken,
            holderName: cleanName,
            holderEmail: cleanEmail || undefined,
            editionNumber: passData.editionNumber,
            editionTotal: TOTAL_EDITION_LIMIT,
            status: (data && data.certificate?.status) || 'OFFICIALLY VERIFIED',
            emailVerified: Boolean(cleanEmail),
            claimedAt: (data && data.certificate?.claimedAt) || new Date().toISOString(),
            signatureAlgorithm: (data && data.certificate?.signatureAlgorithm) || 'HMAC-SHA256',
            signature: (data && data.certificate?.signature) || 'Sillow Mill · Creative Syndicate',
          };

      saveCertificate(cert);
      saveHolderName(cleanName, activeToken);
      setExplicitVipRouteActive(true);
      setDeviceSession(activeToken);
      unlockVip(activeToken);

      // Clean up pending tokens
      localStorage.removeItem('akinoya_pending_vip_pass');
      sessionStorage.removeItem('pending_vip_code');

      setPassData((prev) => ({
        ...prev,
        ownerName: cleanName,
        ownerEmail: cleanEmail,
        isClaimed: true,
        status: isMaster ? 'MASTER FOUNDER ORIGINAL' : 'CLAIMED / OFFICIALLY VERIFIED',
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
            onNavigateHome();
          }}
          className="inline-flex items-center gap-2 text-xs font-mono text-white/60 hover:text-white transition-colors cursor-pointer min-h-[44px] px-2 py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-white/50" />
          <span>Back to Home</span>
        </button>
        <div className="flex items-center gap-2">
          {isFounderAccount && (activeToken === 'AKN-VIP-2027-X001' || activeToken === 'AKN-VIP-2027-X0914') && (
            <button
              type="button"
              onClick={handleResetPass}
              disabled={isResettingPass}
              className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer transition-colors font-bold shadow-sm"
              title="Reset pass to fresh unclaimed state"
            >
              {isResettingPass ? 'RESETTING...' : 'RESET PASS (FRESH TEST)'}
            </button>
          )}
          <span className="text-[10px] sm:text-[11px] font-mono text-cyan-400 uppercase tracking-widest">
            ÄKINOYA PROTOCOL · 2027
          </span>
        </div>
      </div>


      {/* VIEW: LOGGED-IN VERIFIED PASS HOLDER NOTICE */}
      {userAlreadyHoldsPass && !queryParams.claim ? (
        <motion.div
          key="already-verified-holder-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-[#090d16] border border-emerald-500/40 p-5 sm:p-8 space-y-6 shadow-[0_0_40px_rgba(16,185,129,0.15)]"
        >
          {/* Header */}
          <div className="border-b border-white/10 pb-4 sm:pb-5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>VIP PASS ACTIVE &amp; REGISTERED</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold tracking-wider">
                OFFICIALLY VERIFIED
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide">
              VIP Pass Successfully Registered
            </h1>
            <p className="text-xs font-mono text-emerald-200/90 leading-relaxed">
              Your account already holds a verified Founding VIP Pass and active Certificate of Authenticity. You do not need to register again.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-950/50 border border-emerald-500/30 text-emerald-200 text-xs font-mono space-y-1">
            <div className="font-semibold text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Redirecting to Your Assets Dossier</span>
            </div>
            <p className="text-[11px] text-emerald-300/80">
              Taking you to your dashboard to view your unlocked visualizers, high-res certificate, and world...
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.replaceState({}, '', '/?tab=assets#assets');
                }
                onNavigateHome();
              }}
              className="w-full py-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.3)]"
            >
              <span>VIEW YOUR VERIFIED ASSETS</span>
            </button>

            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full py-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/15 border border-white/20 text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>RETURN TO HOME</span>
            </button>
          </div>
        </motion.div>
      ) : (dnaError && (
        dnaError === 'Ai! Deze VIP-pas is al geclaimd.' ||
        dnaError === 'ALREADY CLAIMED VIP LINK' ||
        dnaError === OTHER_ACCOUNT_VIP_ERROR ||
        dnaError === 'Pass already claimed'
      )) ? (
        <motion.div
          key="already-claimed-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-[#090d16] border border-red-500/40 p-5 sm:p-8 space-y-6 shadow-[0_0_40px_rgba(239,68,68,0.15)]"
        >
          {/* Header */}
          <div className="border-b border-white/10 pb-4 sm:pb-5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold text-rose-300 bg-rose-950/70 border border-rose-500/40 shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>AI! DEZE VIP-PAS IS AL GECLAIMD</span>
              </span>
              <span className="text-[10px] font-mono text-rose-400/90 font-bold tracking-wider">
                GEBLOKKEERD
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide">
              Ai! Deze VIP-pas is al geclaimd.
            </h1>
            <p className="text-xs font-mono text-rose-200/95 leading-relaxed font-semibold">
              Ai! Deze VIP-pas is al geclaimd. Deze unieke VIP-pas is permanent gekoppeld aan een ander e-mailaccount.
            </p>
          </div>

          {/* If the active user is already VIP */}
          {isUserVip ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/80 to-teal-950/70 border border-emerald-500/50 text-emerald-300 font-mono text-xs flex items-center gap-3 shadow-[0_0_16px_rgba(16,185,129,0.2)]">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-200">VIP PASS ACTIVE — LINKED TO ACCOUNT</div>
                  <div className="text-[10px] text-emerald-300/80 mt-0.5">
                    Your account already has full VIP access unlocked. You do not need to re-claim any invitation links.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onNavigateHome}
                className="w-full py-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px]"
              >
                <span>RETURN TO COMMUNITY HUB</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-mono text-rose-200/80 bg-rose-950/40 border border-rose-500/30 p-3.5 rounded-xl leading-relaxed">
                If this is your pass, please sign in with the original account you used to claim it. Your VIP entitlements are permanently tied to your profile.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  className="w-full py-3 px-4 rounded-xl font-mono text-xs font-bold bg-white/10 hover:bg-white/15 border border-white/20 text-white flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SIGN IN TO MY ACCOUNT</span>
                </button>

                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="w-full py-3 px-4 rounded-xl font-mono text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
                >
                  <span>RETURN TO HOME</span>
                </button>
              </div>

              {isFounderAccount && (
                <div className="pt-2 border-t border-white/10 text-center">
                  <button
                    type="button"
                    onClick={handleResetPass}
                    disabled={isResettingPass}
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-200 underline cursor-pointer p-1"
                  >
                    {isResettingPass ? 'Resetting Pass...' : `[TEST MODE]: Clear & Reset ${activeToken} to Fresh Unassigned Status`}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      ) : dnaError ? (
        <motion.div
          key="restricted-security-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-[#090d16] border border-rose-500/40 p-5 sm:p-8 space-y-6 shadow-[0_0_40px_rgba(244,63,94,0.15)]"
        >
          {/* Header */}
          <div className="border-b border-white/10 pb-4 sm:pb-5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold text-rose-300 bg-rose-950/70 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>ACCESS RESTRICTED · SECURE PROTOCOL</span>
              </span>
              <span className="text-[10px] font-mono text-rose-400/90 font-bold tracking-wider">
                {statusText || 'RESTRICTED'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide">
              {statusText === 'TOKEN REQUIRED' ? 'Authorized Invitation Required' : 'Restricted Founder / VIP Access'}
            </h1>
            <p className="text-xs font-mono text-rose-200/95 leading-relaxed font-semibold">
              {dnaError}
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-mono text-rose-200/80 bg-rose-950/40 border border-rose-500/30 p-3.5 rounded-xl leading-relaxed">
              {statusText === 'TOKEN REQUIRED'
                ? 'To view or activate an Äkinoya VIP Pass or Founder Pass, you must access this page via a valid NFC pass scan or encrypted invitation URL.'
                : isMaster
                  ? 'The Founder Pass (#0) is exclusively reserved for the primary founder account. Please sign in with founder credentials to manage this pass.'
                  : 'This token could not be verified. Please verify the URL or scan your physical NFC card again.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => openAuthModal('signin')}
                className="w-full py-3 px-4 rounded-xl font-mono text-xs font-bold bg-white/10 hover:bg-white/15 border border-white/20 text-white flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
              >
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>SIGN IN TO AN ACCOUNT</span>
              </button>

              <button
                type="button"
                onClick={onNavigateHome}
                className="w-full py-3 px-4 rounded-xl font-mono text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
              >
                <span>RETURN TO HOME</span>
              </button>
            </div>

            {isFounderAccount && (
              <div className="pt-2 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={handleResetPass}
                  disabled={isResettingPass}
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-200 underline cursor-pointer p-1"
                >
                  {isResettingPass ? 'Resetting Pass...' : `[FOUNDER RESET]: Clear & Reset ${activeToken} to Fresh Unassigned Status`}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      ) : !isClaimed ? (
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
                Unclaimed VIP Pass — Ready for Registration
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide">
              Claim Your Äkinoya Founding Pass
            </h1>
            <p className="text-xs font-mono text-white/60 leading-relaxed">
              {isMaster ? 'Founders Pass (#0)' : `Founding Physical Edition #${passData.editionNumber} of ${TOTAL_EDITION_LIMIT}`}. This card is unassigned. Create an account or sign in to permanently claim VIP status, unlock the full portal, and issue your official Certificate of Authenticity.
            </p>
          </div>

          {/* Direct Claim Action Section (No loose name/email inputs) */}
          <div className="space-y-4">
            {claimError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-[11px] font-mono text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-rose-300">Claim Error</div>
                  <div className="text-rose-200/80 mt-0.5">{claimError}</div>
                </div>
              </div>
            )}

            {user || profile ? (
              /* User is authenticated: 1-click claim to account */
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-cyan-400/80 block">Logged in as</span>
                    <span className="text-white font-medium truncate block">{profile?.email || user?.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('akinoya_pending_vip_pass', activeToken);
                      sessionStorage.setItem('pending_vip_code', activeToken);
                      openAuthModal('signin');
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer shrink-0"
                  >
                    Switch Account
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isClaiming || isValidating}
                  onClick={() => executeClaimForUser(user, profile)}
                  className="w-full py-4 px-6 rounded-xl font-mono text-sm sm:text-base font-extrabold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 text-black flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:shadow-[0_0_40px_rgba(245,158,11,0.7)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]"
                >
                  {isClaiming ? (
                    <>
                      <Sparkles className="w-5 h-5 animate-spin text-black shrink-0" />
                      <span>BEZIG MET CLAIMEN...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-black shrink-0" />
                      <span>Claim nu!</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] font-mono text-white/40 text-center leading-relaxed">
                  Your account will permanently gain VIP Guest status across all private channels and syndicate releases.
                </p>
              </div>
            ) : (
              /* User is unauthenticated: Direct CTAs to Register or Sign In */
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/60 to-yellow-950/40 border border-amber-500/40 text-amber-200 text-xs font-mono space-y-1 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <div className="font-bold text-amber-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Maak een account aan om te claimen</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    Heb je nog geen account? Maak er eerst een aan om deze VIP-pas automatisch te claimen en permanent te koppelen aan je nieuwe profiel.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isValidating}
                  onClick={handleClaimVipInvitation}
                  className="w-full py-4 px-6 rounded-xl font-mono text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] min-h-[50px]"
                >
                  <Sparkles className="w-4 h-4 text-black shrink-0" />
                  <span>MAAK ACCOUNT &amp; CLAIM VIP-PAS →</span>
                </button>

                <button
                  type="button"
                  disabled={isValidating}
                  onClick={() => {
                    localStorage.setItem('akinoya_pending_vip_pass', activeToken);
                    sessionStorage.setItem('pending_vip_code', activeToken);
                    localStorage.setItem('pending_role', 'VIP_GUEST');
                    sessionStorage.setItem('pending_role', 'VIP_GUEST');
                    openAuthModal('signin');
                  }}
                  className="w-full py-3 px-4 rounded-xl font-mono text-xs font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 hover:border-amber-400/40 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>AL EEN ACCOUNT? INLOGGEN OM TE CLAIMEN</span>
                </button>

                <p className="text-[10px] font-mono text-white/40 text-center leading-relaxed pt-1">
                  Supports Google 1-Click Login and Email Registration. VIP status and Certificate of Authenticity are automatically bound to your account in one step.
                </p>
              </div>
            )}
          </div>

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
              <span className="text-amber-400 font-semibold">Unclaimed VIP Pass — Ready for Registration</span>
            </div>
          </div>

          {/* Official Certificate Preview */}
          <div className="space-y-2 pt-2">
            <div className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider text-center">
              CERTIFICATE OF AUTHENTICITY PREVIEW
            </div>
            <div className="rounded-xl overflow-hidden shadow-[0_0_35px_rgba(245,158,11,0.15)]">
              <CertificateOfAuthenticity certificate={activeCertificate} compact />
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
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {hasClaimedPass ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span>OFFICIALLY VERIFIED &amp; ACTIVE</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40">
                      <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>VIP PASS UNLOCKED — STRICTLY BOUND TO THIS ACCOUNT</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-gradient-to-r from-amber-400 to-amber-200 text-black">
                      ROLE: VIP
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-500/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                      <span>VIP INVITATION DETECTED</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold text-amber-300 bg-amber-950/70 border border-amber-500/40">
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Unclaimed VIP Pass — Ready for Registration</span>
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-lg sm:text-2xl font-display font-bold text-white tracking-wide">
                Official Digital Passport
              </h1>
              <p className="text-[11px] sm:text-xs font-mono text-white/50">
                {hasClaimedPass ? (
                  <>
                    Registered Founding VIP Holder: <strong className="text-cyan-300">{activeHolderName}</strong>
                    {activeHolderEmail && (
                      <span className="text-white/40 font-mono text-[10px] ml-1.5">({activeHolderEmail})</span>
                    )}
                  </>
                ) : (
                  <>
                    Founding Physical Edition: <strong className="text-amber-300">{passData.edition}</strong>
                    <span className="text-white/40 font-mono text-[10px] ml-1.5">· Claim below to permanently bind to your account</span>
                  </>
                )}
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

          {/* Action Button: Open Visualizer Hub / Claim VIP Invitation */}
          <div className="space-y-3 pt-1">
            {!hasClaimedPass ? (
              <button
                type="button"
                disabled={isClaiming || isValidating}
                onClick={handleClaimVipInvitation}
                className="w-full py-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                {isClaiming ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-black shrink-0" />
                    <span>CLAIMING VIP INVITATION...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black shrink-0" />
                    <span>CLAIM VIP INVITATION →</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onOpenVisualizerHub) {
                    onOpenVisualizerHub();
                  } else {
                    onNavigateHome();
                  }
                }}
                className="w-full py-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.35)] min-h-[48px]"
              >
                <AudioWaveform className="w-4 h-4 text-black shrink-0" />
                <span>OPEN VISUALIZER HUB &amp; VIP ASSETS</span>
              </button>
            )}

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
          <div className="rounded-2xl bg-[#050812]/95 border border-white/10 backdrop-blur-xl shadow-2xl p-5 sm:p-6 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">
                  PROVENANCE METADATA
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300/80 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/30 font-bold">
                NXP NTAG 424 DNA
              </span>
            </div>
            <div className="divide-y divide-white/10">
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-white/60 font-medium">TOKEN ID</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{passData.tokenId}</span>
                  <button onClick={handleCopyToken} className="p-1 text-white/50 hover:text-white cursor-pointer transition-colors" title="Copy Token ID">
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/60" />}
                  </button>
                </div>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-white/60 font-medium">REGISTERED HOLDER</span>
                <span className={`font-bold ${activeHolderName ? 'text-cyan-300' : 'text-amber-300/80'}`}>
                  {activeHolderName ? activeHolderName.toUpperCase() : 'UNCLAIMED / PENDING'}
                </span>
              </div>
              {activeHolderEmail && (
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-white/60 font-medium">REGISTERED EMAIL</span>
                  <span className="text-white font-medium font-mono text-[11px] sm:text-xs">{activeHolderEmail}</span>
                </div>
              )}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-white/60 font-medium">EDITION</span>
                <span className="text-white font-semibold">
                  {isMaster
                    ? 'Founders Pass (#0)'
                    : `Founding Member Copy #${passData.editionNumber} of ${TOTAL_EDITION_LIMIT}`}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-white/60 font-medium">ORIGIN</span>
                <span className="text-white/90">{passData.origin}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-white/60 font-medium">COORDINATES</span>
                <span className="text-white/90">{passData.coordinates}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-white/60 font-medium">STATUS</span>
                <span className={`font-bold ${hasClaimedPass || passData.isClaimed ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {hasClaimedPass || passData.isClaimed
                    ? (isMaster ? 'MASTER FOUNDER ORIGINAL' : 'CLAIMED / OFFICIALLY VERIFIED')
                    : 'UNCLAIMED'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
