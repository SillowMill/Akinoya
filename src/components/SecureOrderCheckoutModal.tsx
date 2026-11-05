import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Crown,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import bingaaComicCover from '../assets/images/bingaa_comic_cover.jpg';
import akinoyaPassCard from '../assets/images/akinoya_pass_card_1790852652003.jpg';
import stage03Img from '../assets/images/stage_03_cockpit_previs_wireframe.jpg';
import stage05Img from '../assets/images/stage_05_cinematic_color_grading_waveform.jpg';

export interface CheckoutProductInfo {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  priceValue: string;
  isPhysical?: boolean;
  image?: string;
  allocationNotice?: string;
  deliveryNotice?: string;
}

export const isPhysicalProduct = (product?: Partial<CheckoutProductInfo> | null): boolean => {
  if (!product) return false;
  // If explicitly specified as false (e.g. Digital Copy of Bingäa €9.99, Vocal Pack €19.99), it is strictly digital
  if (product.isPhysical === false) return false;
  // Digital add-on product IDs are never physical
  if (product.id === 'comic-digital' || product.id === 'vocal' || product.id === 'workflow' || product.id === 'logic-visualizer') {
    return false;
  }
  // Physical deliveries: Annual Member Pass (€60) & Physical Comic Hardcover/Softcover Print (€14.99)
  if (product.isPhysical === true || product.id === 'membership' || product.id === 'comic') {
    return true;
  }
  return false;
};

export interface SecureOrderCheckoutModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  product?: Partial<CheckoutProductInfo>;
}

export const getResolvedProductImage = (product: CheckoutProductInfo): string => {
  if (product.image) return product.image;
  if (product.id === 'membership') return akinoyaPassCard;
  if (product.id === 'workflow' || product.id === 'logic-visualizer') return stage03Img;
  if (product.id === 'vocal') return stage05Img;
  return bingaaComicCover;
};

export const getResolvedProductEmoji = (product: CheckoutProductInfo): string => {
  if (product.id === 'membership') return '👑';
  if (product.id === 'workflow' || product.id === 'logic-visualizer') return '🎛️';
  if (product.id === 'vocal') return '🎙️';
  if (product.id === 'comic' || product.id === 'comic-digital') return '📖';
  return '💎';
};

export const SecureOrderCheckoutModal: React.FC<SecureOrderCheckoutModalProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  product: controlledProduct,
}) => {
  const { user, profile, isAuthenticated, signUpWithEmail } = useAuth();

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isCheckoutOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const [checkoutProduct, setCheckoutProduct] = useState<CheckoutProductInfo>({
    id: 'comic',
    title: "Sillow Mill — Bingäa (Collector's Graphic Novel)",
    subtitle: "Bingäa Issue #01 — Collector's Print",
    badge: "PHYSICAL PRINT · COLLECTOR'S ITEM",
    priceValue: "14.99",
    isPhysical: true,
    image: bingaaComicCover,
    allocationNotice: "Wave 2 Allocation · QR Code Verified",
    deliveryNotice: "Free Express Delivery",
  });

  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutAptBus, setCheckoutAptBus] = useState("");
  const [checkoutCity, setCheckoutCity] = useState("");
  const [checkoutPassword, setCheckoutPassword] = useState("");
  const [checkoutConfirmPassword, setCheckoutConfirmPassword] = useState("");
  const [showCheckoutPassword, setShowCheckoutPassword] = useState(false);
  const [showCheckoutConfirmPassword, setShowCheckoutConfirmPassword] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [isOrderProcessing, setIsOrderProcessing] = useState(false);

  const isPasswordReady = Boolean(
    isAuthenticated ||
    (checkoutPassword.length >= 6 && checkoutPassword === checkoutConfirmPassword)
  );

  const handleOpenCheckout = (prod?: Partial<CheckoutProductInfo>) => {
    if (prod) {
      const isPhys = isPhysicalProduct(prod);
      setCheckoutProduct((prev) => ({
        ...prev,
        ...prod,
        isPhysical: isPhys,
      }));
    }

    // Smart auto-fill for existing accounts and previous purchases
    const savedEmail = (typeof window !== 'undefined' ? localStorage.getItem('sillow_checkout_email') : '') || '';
    const savedName = (typeof window !== 'undefined' ? localStorage.getItem('sillow_checkout_name') : '') || '';
    const savedAddress = (typeof window !== 'undefined' ? localStorage.getItem('sillow_checkout_address') : '') || '';
    const savedCity = (typeof window !== 'undefined' ? localStorage.getItem('sillow_checkout_city') : '') || '';
    const savedAptBus = (typeof window !== 'undefined' ? localStorage.getItem('sillow_checkout_apt_bus') : '') || '';

    const uName = (
      profile?.full_name ||
      (user?.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata?.last_name || ''}`.trim() : user?.user_metadata?.full_name) ||
      ''
    ).trim();
    const uEmail = (profile?.email || user?.email || '').trim();

    const finalEmail = uEmail || savedEmail;
    if (finalEmail) setCheckoutEmail(finalEmail);

    const finalName = uName || savedName;
    if (finalName) setCheckoutName(finalName);

    if (savedAddress) setCheckoutAddress(savedAddress);
    if (savedCity) setCheckoutCity(savedCity);
    if (savedAptBus) setCheckoutAptBus(savedAptBus);

    setCheckoutError("");
    setIsOrderProcessing(false);
    setInternalIsOpen(true);
    soundManager.playTone(660, 0.08);
  };

  const handleResetCheckout = () => {
    setIsOrderProcessing(false);
    setCheckoutError("");
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  // Global Checkout Open Listener (routes any member pass or add-on checkout request)
  useEffect(() => {
    const handleGlobalCheckout = (e: Event) => {
      const customEvent = e as CustomEvent<Partial<CheckoutProductInfo>>;
      handleOpenCheckout(customEvent.detail);
    };

    window.addEventListener('akinoya-open-checkout', handleGlobalCheckout);
    return () => window.removeEventListener('akinoya-open-checkout', handleGlobalCheckout);
  }, [user, profile]);

  // Sync controlled product if provided
  useEffect(() => {
    if (controlledProduct) {
      const isPhys = isPhysicalProduct(controlledProduct);
      setCheckoutProduct((prev) => ({
        ...prev,
        ...controlledProduct,
        isPhysical: isPhys,
      }));
    }
  }, [controlledProduct]);

  // Strict Scroll Lock & Safari Mobile Viewport Stabilization when Checkout is open
  useEffect(() => {
    if (!isCheckoutOpen) return;

    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyWidth = document.body.style.width;
    const originalTouchAction = document.body.style.touchAction;

    document.body.classList.add('checkout-modal-open');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.touchAction = 'none';

    const preventTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest?.('.checkout-modal-scrollable')) {
        if (e.cancelable) e.preventDefault();
      }
    };
    document.addEventListener('touchmove', preventTouch, { passive: false });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleResetCheckout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('checkout-modal-open');
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.width = originalBodyWidth;
      document.body.style.touchAction = originalTouchAction;
      document.removeEventListener('touchmove', preventTouch);
      window.removeEventListener('keydown', handleKeyDown);
      window.scrollTo(0, scrollY);
    };
  }, [isCheckoutOpen]);

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

      // Validate embedded password setup for automated account creation
      if (!isAuthenticated) {
        if (!checkoutPassword || checkoutPassword.length < 6) {
          setIsOrderProcessing(false);
          setCheckoutError('Password must contain at least 6 characters.');
          return;
        }
        if (checkoutPassword !== checkoutConfirmPassword) {
          setIsOrderProcessing(false);
          setCheckoutError('Passwords do not match. Please ensure both passwords match exactly.');
          return;
        }
      }

      if (checkoutProduct.isPhysical) {
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
      }

      // Persist customer shipping details in localStorage for seamless smart auto-fill
      try {
        localStorage.setItem('sillow_checkout_email', sanitizedEmail);
        localStorage.setItem('sillow_checkout_name', sanitizedName);
        if (sanitizedAddress) localStorage.setItem('sillow_checkout_address', sanitizedAddress);
        if (sanitizedCity) localStorage.setItem('sillow_checkout_city', sanitizedCity);
        if (sanitizedAptBus) localStorage.setItem('sillow_checkout_apt_bus', sanitizedAptBus);

        const storedOwned = localStorage.getItem('akinoya_owned_products');
        const ownedList: string[] = storedOwned ? JSON.parse(storedOwned) : [];
        if (!ownedList.includes(checkoutProduct.id)) {
          ownedList.push(checkoutProduct.id);
          localStorage.setItem('akinoya_owned_products', JSON.stringify(ownedList));
        }
      } catch {}

      // Automatically register user session if credentials supplied
      if (!isAuthenticated && checkoutPassword) {
        const parts = sanitizedName.split(' ');
        const first = parts[0] || 'Collector';
        const last = parts.slice(1).join(' ') || '';
        await signUpWithEmail(sanitizedEmail, checkoutPassword, first, last).catch(() => {});
      }

      const fullAddress = sanitizedAptBus
        ? `${sanitizedAddress}, ${sanitizedAptBus}`
        : sanitizedAddress;

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: checkoutProduct.id,
          productTitle: checkoutProduct.title,
          amount: parseFloat(checkoutProduct.priceValue),
          isPhysical: Boolean(checkoutProduct.isPhysical),
          customerEmail: sanitizedEmail,
          customerName: sanitizedName,
          customerPassword: checkoutPassword || undefined,
          shippingAddress: checkoutProduct.isPhysical ? fullAddress : undefined,
          apartmentBus: checkoutProduct.isPhysical ? (sanitizedAptBus || undefined) : undefined,
          shippingCity: checkoutProduct.isPhysical ? (sanitizedCity || undefined) : undefined,
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

  if (!isCheckoutOpen && !controlledIsOpen) return null;

  return typeof document !== 'undefined'
    ? createPortal(
        <AnimatePresence>
          {isCheckoutOpen && (
            <div
              className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl overflow-hidden select-none"
              style={{
                zIndex: 100000,
                touchAction: 'none',
                paddingBottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))',
              }}
            >
              {/* Backdrop click to dismiss */}
              <div
                className="fixed inset-0 bg-transparent cursor-pointer"
                onClick={handleResetCheckout}
                aria-hidden="true"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 14 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="checkout-modal-card relative z-10 w-full max-w-xl md:max-w-2xl flex flex-col bg-[#070b12] border border-cyan-500/40 rounded-2xl sm:rounded-3xl shadow-[0_0_60px_rgba(56,189,248,0.25)] overflow-hidden my-auto overscroll-contain select-text"
                style={{
                  maxHeight: 'min(88dvh, 760px)',
                  touchAction: 'pan-y',
                }}
              >
                {/* Ambient Glow */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-44 h-44 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Pinned Top Bar with Close Button */}
                <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#070b12]/95 backdrop-blur-md z-20">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base select-none shrink-0" role="img" aria-label="Product Vault Icon">
                      {getResolvedProductEmoji(checkoutProduct)}
                    </span>
                    <span className="text-[11px] font-mono text-cyan-300 uppercase tracking-wider font-semibold truncate">
                      SECURE ORDER CHECKOUT · {checkoutProduct.badge}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetCheckout}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center touch-manipulation ml-2 shrink-0"
                    aria-label="Close checkout"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Content Body with Internal Overflow */}
                <div
                  className="checkout-modal-scrollable flex-1 overflow-y-auto px-4 sm:px-6 md:px-7 py-4 space-y-4 overscroll-contain [scrollbar-width:thin] touch-pan-y"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom, 0px) + 24px))',
                  }}
                >
                  {/* Header Item Title */}
                  <div>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white mb-3">
                      {checkoutProduct.title}
                    </h3>

                    {/* Dynamic Order Summary Card */}
                    <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-black/60 border border-white/10 mb-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative w-13 h-13 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-cyan-400/40 bg-[#09152b] shrink-0 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.25)]">
                          <img
                            src={getResolvedProductImage(checkoutProduct)}
                            alt={checkoutProduct.title}
                            className="w-full h-full object-cover object-center"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute bottom-1 right-1 w-5 h-5 rounded-md bg-black/80 backdrop-blur-sm border border-cyan-400/40 flex items-center justify-center text-[10px] shadow-sm select-none">
                            {getResolvedProductEmoji(checkoutProduct)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-semibold text-white truncate">
                            {checkoutProduct.subtitle}
                          </div>
                          <div className="text-[10px] font-mono text-cyan-300/80 truncate mt-0.5">
                            {checkoutProduct.allocationNotice || "Direct Digital Provisioning · Never Lose Your Files Guarantee"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-3">
                        <div className="text-sm sm:text-base font-display font-bold text-cyan-300 whitespace-nowrap inline-flex items-baseline gap-1">
                          <span>€</span>
                          <span>{checkoutProduct.priceValue}</span>
                        </div>
                        <div className="text-[10px] font-mono text-emerald-400">
                          {checkoutProduct.deliveryNotice || (checkoutProduct.isPhysical ? "Free Express Delivery" : "Instant Digital Sync")}
                        </div>
                      </div>
                    </div>

                    {/* Membership Physical Welcome Booklet & Pass Assurance */}
                    {checkoutProduct.id === 'membership' && (
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/80 via-yellow-950/50 to-amber-950/80 border border-amber-400/50 text-amber-200 flex items-start gap-3 shadow-[0_0_20px_rgba(245,158,11,0.2)] mb-4">
                        <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-400 shrink-0 mt-0.5">
                          <Crown className="w-4 h-4 text-amber-300" />
                        </div>
                        <div className="text-left text-xs leading-relaxed space-y-0.5">
                          <span className="font-mono font-bold uppercase tracking-wider text-amber-300 block text-[11px]">
                            Annual Member Pass · Physical Collector Edition
                          </span>
                          <span className="text-amber-100/90 font-sans text-[11.5px] block leading-normal">
                            Your Annual Pioneer Membership includes the physical collector welcome booklet, pass card &amp; signed bookmark shipped directly to your address, plus instant digital vault linking.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Never Lose Your Files Guarantee Widget (Strict English Copy) */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/70 via-cyan-950/40 to-emerald-950/70 border border-emerald-400/40 text-emerald-200 flex items-start gap-3 shadow-[0_0_20px_rgba(16,185,129,0.15)] mb-4">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 shrink-0 mt-0.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-left text-xs leading-relaxed space-y-0.5">
                        <span className="font-mono font-bold uppercase tracking-wider text-emerald-300 block text-[11px]">
                          NEVER LOSE YOUR FILES GUARANTEE
                        </span>
                        <span className="text-emerald-100/90 font-sans text-[11.5px] block leading-normal">
                          By entering your details below and setting up your password, a free Sillow Mill account will automatically be created. Your purchased stems, comics, and assets will be instantly and permanently linked to your profile, accessible anytime via the Drive Asset Vault.
                        </span>
                      </div>
                    </div>

                    {/* Stripe Supported Payment Methods Showcase */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-b from-cyan-950/40 via-black/80 to-black border border-cyan-500/30 shadow-[0_0_20px_rgba(56,189,248,0.12)] mb-4 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                          <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                          <span>POWERED BY STRIPE CHECKOUT</span>
                        </div>
                        <span className="text-[9px] text-white/50 font-mono flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-cyan-400" />
                          <span>256-Bit TLS</span>
                        </span>
                      </div>

                      <p className="text-xs text-white/70 font-mono leading-relaxed">
                        {checkoutProduct.id === 'membership'
                          ? 'Automated recurring annual billing (€60.00/yr) via SEPA Direct Debit (domiciliëring), Apple Pay, Google Pay, or Credit/Debit Card. Renews annually until cancelled in your billing settings.'
                          : 'Instant verification with Bancontact, iDEAL, Apple Pay, Google Pay, or Credit/Debit card.'}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-center">
                        <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-white/80 flex flex-col items-center justify-center">
                          <span className="text-cyan-400 font-bold">{checkoutProduct.id === 'membership' ? 'SEPA Debit' : 'Bancontact'}</span>
                          <span className="text-[9px] text-white/40">{checkoutProduct.id === 'membership' ? 'Domiciliëring' : 'Instant BE'}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-white/80 flex flex-col items-center justify-center">
                          <span className="text-purple-400 font-bold">{checkoutProduct.id === 'membership' ? 'Direct Debit' : 'iDEAL'}</span>
                          <span className="text-[9px] text-white/40">{checkoutProduct.id === 'membership' ? 'EU Recurring' : 'Netherlands'}</span>
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
                      {/* Contact Details */}
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                              FULL NAME <span className="text-cyan-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              autoComplete="name"
                              value={checkoutName}
                              onChange={(e) => setCheckoutName(e.target.value)}
                              placeholder="Alex Thorne"
                              className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                              EMAIL ADDRESS <span className="text-cyan-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              inputMode="email"
                              autoComplete="email"
                              value={checkoutEmail}
                              onChange={(e) => setCheckoutEmail(e.target.value)}
                              placeholder="alex@example.com"
                              className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
                            />
                          </div>
                        </div>

                        {/* Embedded Password Setup for Automated Account Creation */}
                        {!isAuthenticated ? (
                          <div className="space-y-2 pt-1 border-t border-white/10 mt-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                                  ACCOUNT PASSWORD <span className="text-cyan-400">*</span>
                                </label>
                                <div className="relative flex items-center">
                                  <input
                                    type={showCheckoutPassword ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    value={checkoutPassword}
                                    onChange={(e) => setCheckoutPassword(e.target.value)}
                                    placeholder="Min. 6 characters"
                                    className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl pl-3 pr-9 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowCheckoutPassword(!showCheckoutPassword)}
                                    className="absolute right-2.5 text-white/40 hover:text-white p-1 cursor-pointer"
                                    aria-label={showCheckoutPassword ? 'Hide password' : 'Show password'}
                                  >
                                    {showCheckoutPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                                  CONFIRM PASSWORD <span className="text-cyan-400">*</span>
                                </label>
                                <div className="relative flex items-center">
                                  <input
                                    type={showCheckoutConfirmPassword ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    value={checkoutConfirmPassword}
                                    onChange={(e) => setCheckoutConfirmPassword(e.target.value)}
                                    placeholder="Repeat password"
                                    className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl pl-3 pr-9 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowCheckoutConfirmPassword(!showCheckoutConfirmPassword)}
                                    className="absolute right-2.5 text-white/40 hover:text-white p-1 cursor-pointer"
                                    aria-label={showCheckoutConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                  >
                                    {showCheckoutConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Real-time UX Password Validation Checklist */}
                            <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono px-0.5">
                              <div className={`flex items-center gap-1.5 transition-colors ${checkoutPassword.length >= 6 ? 'text-emerald-400 font-bold' : 'text-white/40'}`}>
                                {checkoutPassword.length >= 6 ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span className="w-1.5 h-1.5 rounded-full bg-white/30" />}
                                <span>At least 6 characters</span>
                              </div>
                              <div className={`flex items-center gap-1.5 transition-colors ${checkoutPassword && checkoutPassword === checkoutConfirmPassword ? 'text-emerald-400 font-bold' : checkoutConfirmPassword ? 'text-rose-400 font-medium' : 'text-white/40'}`}>
                                {checkoutPassword && checkoutPassword === checkoutConfirmPassword ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span className="w-1.5 h-1.5 rounded-full bg-white/30" />}
                                <span>Passwords match</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-2 text-xs font-mono text-cyan-200 mt-1">
                            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span className="truncate">Active Account Linked: <strong className="text-white">{user?.email}</strong> (Vault sync active)</span>
                          </div>
                        )}

                        {/* Physical Shipping Fields (Strictly for Physical Deliveries: Annual Member Pass €60 & Physical Bingäa Hardcover Print €14.99) */}
                        {checkoutProduct.isPhysical ? (
                          <div className="space-y-2.5 pt-2 border-t border-white/10">
                            <div className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                              <span>PHYSICAL DELIVERY SHIPPING ADDRESS</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2">
                                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                                  STREET &amp; HOUSE NO. <span className="text-cyan-400">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  autoComplete="street-address"
                                  value={checkoutAddress}
                                  onChange={(e) => setCheckoutAddress(e.target.value)}
                                  placeholder="Street &amp; House No. (e.g. Keizersstraat 10)"
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
                                  placeholder="Bus / Apt"
                                  className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                                CITY &amp; POSTAL CODE <span className="text-cyan-400">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                autoComplete="postal-code"
                                value={checkoutCity}
                                onChange={(e) => setCheckoutCity(e.target.value)}
                                placeholder="e.g. 2000 Antwerpen"
                                className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-cyan-950/35 border border-cyan-500/30 text-[11px] sm:text-xs font-sans text-cyan-200 flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-cyan-300 font-mono font-bold uppercase text-[10px] block">
                                Instant Access · Hub Delivery:
                              </strong>
                              <span>
                                Instantly unlocked and securely stored in your <strong>Asset Vault inside the Hub</strong> upon purchase. Access anytime across mobile, tablet, and desktop.
                              </span>
                            </div>
                          </div>
                        )}
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
                        disabled={isOrderProcessing || !isPasswordReady}
                        className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-950/60 disabled:border disabled:border-cyan-500/20 disabled:text-white/30 disabled:cursor-not-allowed text-black transition-all cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.3)] flex items-center justify-center gap-2 mt-2"
                      >
                        {isOrderProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            <span>INITIALIZING STRIPE CHECKOUT...</span>
                          </>
                        ) : (
                          <>
                            <span className="whitespace-nowrap inline-flex items-baseline gap-1">
                              <span>CONTINUE TO STRIPE CHECKOUT (</span>
                              <span>€</span>
                              <span>{checkoutProduct.priceValue}</span>
                              {checkoutProduct.id === 'membership' && <span className="text-[10px] text-black/70 font-mono">/YR</span>}
                              <span>)</span>
                            </span>
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
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null;
};
