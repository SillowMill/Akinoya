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
  const autoClaimAttemptedRef = useRef(false);

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

  // Auto-record pending VIP pass token in storage for seamless auth claim binding
  useEffect(() => {
    if (typeof window !== 'undefined' && activeToken && !isMaster && isValidPassId(activeToken)) {
      localStorage.setItem('akinoya_pending_vip_pass', activeToken);
      sessionStorage.setItem('pending_vip_code', activeToken);
    }
  }, [activeToken, isMaster]);

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
    editionNumber: isMaster ? 0 : derivedEdition,
    origin: 'Genesis Archive (Leuven Origin)',
    issueDate: '09.01.2027',
    coordinates: "RA 04h 35m / +16° 30'",
    status: isMaster
      ? (localStoredName || localStoredCert ? 'MASTER FOUNDER ORIGINAL' : 'FOUNDERS PASS (#0) / READY TO CLAIM')
      : (localStoredName || localStoredCert ? 'OFFICIALLY VERIFIED' : 'UNASSIGNED / READY TO CLAIM'),
    ownerName: localStoredName || '',
    ownerEmail: null,
    isClaimed: Boolean(localStoredName || localStoredCert),
    registeredAt: localStoredCert?.claimedAt || null,
    certificate: localStoredCert || null,
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
    passData.status !== 'UNASSIGNED / READY TO CLAIM' &&
    passData.status !== 'FOUNDERS PASS (#0) / READY TO CLAIM'
  );

  const isClaimedByUser = Boolean(
    isUserLoggedIn && (
      (isMaster && isFounderAccount && (
        profile?.vip_code_redeemed === activeToken ||
        (isPassClaimedInRecord && passData.ownerEmail && isFounderEmail(passData.ownerEmail)) ||
        Boolean(localStoredCert)
      )) ||
      (!isMaster && (
        profile?.vip_code_redeemed === activeToken ||
        (isPassClaimedInRecord && passData.ownerEmail && currentUserEmail === passData.ownerEmail.toLowerCase()) ||
        Boolean(localStoredCert && localStoredCert.passId === activeToken)
      ))
    )
  );

  const hasClaimedPass = Boolean(
    isClaimedByUser ||
    (isUserLoggedIn && isPassClaimedInRecord && passData.ownerEmail && (currentUserEmail === passData.ownerEmail.toLowerCase()))
  );

  const isClaimed = Boolean(
    hasClaimedPass ||
    isPassClaimedInRecord ||
    Boolean(localStoredCert && localStoredCert.holderName && localStoredCert.holderName.trim().length > 0)
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
          holderName: activeHolderName || 'Odi Selis',
          holderEmail: activeHolderEmail || undefined,
          editionNumber: 0,
          editionTotal: TOTAL_EDITION_LIMIT,
          status: hasClaimedPass ? 'MASTER FOUNDER ORIGINAL' : 'FOUNDERS PASS (#0) / READY TO CLAIM',
          emailVerified: Boolean(activeHolderEmail),
          claimedAt: passData.registeredAt || (hasClaimedPass ? new Date().toISOString() : 'UNCLAIMED'),
          signatureAlgorithm: 'HMAC-SHA256',
          signature: 'A0B9C8D7E6F50413241516171819202122232425262728293031323334353637',
        }
      : {
          certificateId: `COA-BNG1-${String(passData.editionNumber).padStart(3, '0')}-VERIFIED`,
          title: 'CERTIFICATE OF AUTHENTICITY — BINGÄA ISSUE #1',
          passId: activeToken,
          holderName: activeHolderName || 'Founding VIP Member',
          editionNumber: passData.editionNumber,
          editionTotal: TOTAL_EDITION_LIMIT,
          status: hasClaimedPass ? 'OFFICIALLY VERIFIED' : 'UNASSIGNED / READY TO CLAIM',
          emailVerified: Boolean(activeHolderEmail),
          claimedAt: passData.registeredAt || (hasClaimedPass ? new Date().toISOString() : 'UNCLAIMED'),
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

    // Strict ownership validation in Supabase
    if (!isMaster) {
      const tokenStatus = await checkVipTokenStatus(token, user?.id, currentUserEmail);
      if (tokenStatus.isAlreadyClaimed) {
        if (tokenStatus.isClaimedByMe) {
          // If it matches the original owner: seamlessly grant/maintain VIP access!
        } else {
          setIsDnaAuthentic(false);
          setStatusText('ALREADY CLAIMED');
          setDnaError(OTHER_ACCOUNT_VIP_ERROR);
          soundManager.playError();
          setIsValidating(false);
          return;
        }
      }
    } else {
      // It is the Master Founder Pass (AKN-VIP-2027-X0914)
      if (currentUserEmail) {
        if (!isFounderEmail(currentUserEmail) && profile?.role !== 'CREATOR') {
          setIsDnaAuthentic(false);
          setStatusText('RESTRICTED');
          setDnaError(OTHER_ACCOUNT_VIP_ERROR);
          soundManager.playError();
          setIsValidating(false);
          return;
        }
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
        setStatusText(data.isAuthentic ? 'AUTHENTIC' : (isMaster ? 'MASTER FOUNDER ORIGINAL' : 'VERIFIED'));

        if (data.pass) {
          const pass = data.pass;
          const isPassClaimed = Boolean(pass.isClaimed && pass.ownerName);
          setPassData((prev) => ({
            ...prev,
            ...pass,
            ownerName: pass.ownerName || prev.ownerName,
            ownerEmail: pass.ownerEmail || prev.ownerEmail,
            isClaimed: isPassClaimed || prev.isClaimed,
            status: isMaster
              ? (isPassClaimed ? 'MASTER FOUNDER ORIGINAL' : 'FOUNDERS PASS (#0) / READY TO CLAIM')
              : (pass.status || prev.status),
          }));

          if (pass.certificate) {
            saveCertificate(pass.certificate);
          }
          if (pass.ownerName) {
            saveHolderName(pass.ownerName, token);
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
        const isFounder = isFounderEmail(cleanEmail) || currentProfile?.role === 'CREATOR';
        if (!isFounder) {
          setClaimError(
            'The Founders Pass (#0) is reserved for the creator (Odi Selis). Please sign in with odi.selis3@gmail.com or Odi@sillowmill.com.'
          );
          soundManager.playError();
          setIsClaiming(false);
          return;
        }
      } else {
        const tokenStatus = await checkVipTokenStatus(activeToken, currentUser?.id, cleanEmail);
        if (tokenStatus.isAlreadyClaimed) {
          if (tokenStatus.isClaimedByMe) {
            // Already claimed by this user!
            soundManager.playUnlockChime();
            return;
          }
          setClaimError(OTHER_ACCOUNT_VIP_ERROR);
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
            holderEmail: cleanEmail || undefined,
            editionNumber: 0,
            editionTotal: TOTAL_EDITION_LIMIT,
            status: (data && data.certificate?.status) || 'MASTER FOUNDER ORIGINAL',
            emailVerified: Boolean(cleanEmail),
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

  // Auto-execute claim as soon as an unassigned pass is authenticated via login or registration
  useEffect(() => {
    if (
      !isValidating &&
      !isClaimedByUser &&
      (user || profile) &&
      !autoClaimAttemptedRef.current &&
      !isClaiming &&
      !dnaError
    ) {
      if (isMaster) {
        const email = (user?.email || profile?.email || '').trim().toLowerCase();
        if (!isFounderEmail(email) && profile?.role !== 'CREATOR') {
          return;
        }
      }
      autoClaimAttemptedRef.current = true;
      executeClaimForUser(user, profile);
    }
  }, [user, profile, isClaimedByUser, isValidating, isMaster, dnaError, isClaiming]);

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
        <span className="text-[10px] sm:text-[11px] font-mono text-cyan-400 uppercase tracking-widest">
          ÄKINOYA PROTOCOL · 2027
        </span>
      </div>

      {/* Security Warning if Cloned/Invalid */}
      {dnaError && dnaError !== 'ALREADY CLAIMED VIP LINK' && dnaError !== OTHER_ACCOUNT_VIP_ERROR && (
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

      {/* VIEW: ALREADY CLAIMED / OTHER ACCOUNT VIP LINK SCREEN */}
      {dnaError && (dnaError === 'ALREADY CLAIMED VIP LINK' || dnaError === OTHER_ACCOUNT_VIP_ERROR) ? (
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
                <span>THIS VIP LINK BELONGS TO ANOTHER ACCOUNT</span>
              </span>
              <span className="text-[10px] font-mono text-rose-400/90 font-bold tracking-wider">
                LOCKED
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide">
              VIP Pass Belongs to Another Account
            </h1>
            <p className="text-xs font-mono text-rose-200/95 leading-relaxed font-semibold">
              THIS VIP LINK BELONGS TO ANOTHER ACCOUNT. Logging in here will create a standard Free account.
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
            </div>
          )}
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
                UNASSIGNED
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
                  className="w-full py-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
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

                <p className="text-[10px] font-mono text-white/40 text-center leading-relaxed">
                  Your account will permanently gain VIP Guest status across all private channels and syndicate releases.
                </p>
              </div>
            ) : (
              /* User is unauthenticated: Direct CTAs to Register or Sign In */
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={isValidating}
                  onClick={handleClaimVipInvitation}
                  className="w-full py-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] min-h-[48px]"
                >
                  <Sparkles className="w-4 h-4 text-black shrink-0" />
                  <span>CLAIM VIP INVITATION →</span>
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
                  <span>SIGN IN TO CLAIM</span>
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
              <span className="text-amber-400 font-semibold">UNCLAIMED / READY TO ONBOARD</span>
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
                      <span>VIP PASS UNLOCKED — STRIKT GEKOPPELD AAN DIT ACCOUNT</span>
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
                      <span>UNCLAIMED — BIND TO YOUR ACCOUNT</span>
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
