import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  QrCode,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Download,
  ExternalLink,
  RefreshCw,
  HardDrive,
  BookOpen,
  Crown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';
import { useAuth } from '../context/AuthContext';

interface CheckoutSuccessProps {
  onEnterPortal?: () => void;
  onBackToComic?: () => void;
}

export const CheckoutSuccess: React.FC<CheckoutSuccessProps> = ({ onEnterPortal, onBackToComic }) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [sessionId, setSessionId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [orderDetails, setOrderDetails] = useState<{
    customerName?: string;
    customerEmail?: string;
    passId?: string;
    amount?: number;
    status?: string;
    productTitle?: string;
    product?: string;
  }>({});

  useEffect(() => {
    // Launch celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#06b6d4', '#10b981', '#ffffff'],
      });
      soundManager.playTone(880, 0.15);
      setTimeout(() => soundManager.playTone(1320, 0.2), 150);
    } catch {
      // Ignore
    }

    // Extract session_id from URL
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session_id') || '';
    setSessionId(sid);

    if (sid) {
      fetch(`/api/checkout/session/${sid}`)
        .then(async (res) => {
          if (!res.ok) return null;
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) return null;
          return res.json().catch(() => null);
        })
        .then((data) => {
          if (data) {
            const prod = data.product || data.order?.product || data.session?.metadata?.product || 'comic';
            setOrderDetails({
              customerName: data.customerName || data.session?.customer_details?.name || 'Collector',
              customerEmail: data.customerEmail || data.session?.customer_details?.email,
              passId: data.passId,
              amount: data.amount || (data.session?.amount_total ? data.session.amount_total / 100 : 14.99),
              status: data.status || 'paid',
              productTitle: data.productTitle || data.session?.metadata?.product_title || data.session?.line_items?.data?.[0]?.description,
              product: prod,
            });

            // Automatically grant VIP portal unlock in sessionStorage
            try {
              sessionStorage.setItem('akinoya_vip_unlocked', 'true');
              const ownedStr = localStorage.getItem('akinoya_owned_products');
              const list: string[] = ownedStr ? JSON.parse(ownedStr) : [];
              if (prod && !list.includes(prod)) {
                list.push(prod);
                localStorage.setItem('akinoya_owned_products', JSON.stringify(list));
              }
            } catch {
              // ignore
            }
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching session details:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleUnlockAndEnter = () => {
    try {
      sessionStorage.setItem('akinoya_vip_unlocked', 'true');
    } catch {
      // ignore
    }
    if (onEnterPortal) {
      onEnterPortal();
    } else {
      window.location.href = '/';
    }
  };

  const isComic =
    orderDetails.product === 'comic' ||
    orderDetails.product === 'comic-physical' ||
    (Boolean(orderDetails.productTitle?.toLowerCase().includes('comic')) &&
      !orderDetails.productTitle?.toLowerCase().includes('digital'));

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white py-12 px-4 sm:px-6 lg:px-8 relative z-20 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl w-full bg-black/80 backdrop-blur-2xl border border-cyan-500/40 rounded-3xl p-6 sm:p-10 shadow-[0_0_50px_rgba(56,189,248,0.2)] text-center space-y-6"
      >
        {/* Glow check icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_35px_rgba(16,185,129,0.35)] animate-pulse">
          <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>

        {/* Header Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-[10px] sm:text-[11px] font-mono text-cyan-300 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>PAYMENT CONFIRMED · ORDER SECURED</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            Welcome to the Lore, {orderDetails.customerName || 'Collector'}.
          </h1>

          <p className="text-xs sm:text-sm text-white/70 font-mono max-w-lg mx-auto leading-relaxed">
            Your order for <strong className="text-white">{orderDetails.productTitle || "Sillow Mill — Bingäa (Collector's Graphic Novel)"}</strong> (€ {(orderDetails.amount || 14.99).toFixed(2)}) has been verified via Stripe.
          </p>
        </div>

        {/* Specific Post-Purchase Account & Delivery Success Banners */}
        {!isComic ? (
          /* Add-ons & Memberships Banner */
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-[#071318]/90 to-emerald-950/80 border border-emerald-400/50 text-left space-y-2 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>ALL ASSETS WILL BE UPDATED TO YOUR ACCOUNT</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[9px] font-semibold">
                VAULT SYNC ACTIVE
              </span>
            </div>
            <p className="text-xs font-sans text-emerald-100/90 leading-relaxed">
              All assets will be updated to your account. Your deliverables, stem packs, and DAW project templates are permanently bound to your profile and available immediately in the Drive Asset Vault.
            </p>
            <div className="pt-1">
              <a
                href="/community#downloads"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>OPEN DRIVE ASSET VAULT</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          /* Comic Books / Physical Drops Banner */
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-[#081224]/90 to-cyan-950/80 border border-cyan-400/50 text-left space-y-2 shadow-[0_0_25px_rgba(56,189,248,0.2)]">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-2 font-bold text-cyan-300">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>DIGITAL OWNERSHIP CERTIFICATE</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[9px] font-semibold">
                AUTHENTICITY KEY
              </span>
            </div>
            <p className="text-xs font-sans text-cyan-100/90 leading-relaxed">
              {isAuthenticated
                ? "Your official Certificate of Authenticity has been bound to your active account profile."
                : "Create an account to get your certificate linked to your official digital ownership certificate."}
            </p>
            {!isAuthenticated && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => openAuthModal('signup', 'Create your account to claim and link your official Certificate of Authenticity.')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>CREATE ACCOUNT TO GET YOUR CERTIFICATE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pass ID / Entitlement Badge */}
        <div className="p-4 sm:p-5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-2 text-left">
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
            <span className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>OFFICIAL PASS ID &amp; ENTITLEMENT KEY</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[9px] font-semibold">
              ACTIVE VIP STATUS
            </span>
          </div>

          <div className="bg-black/90 border border-white/10 rounded-xl p-3 flex items-center justify-between font-mono">
            <div>
              <span className="text-[10px] text-white/40 block">PASSHOLDER KEY</span>
              <span className="text-sm sm:text-base font-bold text-cyan-200 tracking-wider select-all">
                {orderDetails.passId || (sessionId ? `PASS-BINGAA-${sessionId.slice(-8).toUpperCase()}` : 'PASS-BINGAA-SECURED')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-white/40 block">ALLOCATION</span>
              <span className="text-xs text-white font-semibold">WAVE 2 (1/100)</span>
            </div>
          </div>

          <div className="text-[11px] text-white/60 font-mono flex items-center gap-1.5 pt-1">
            <QrCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              Confirmation dispatched to <strong className="text-white">{orderDetails.customerEmail || 'your email'}</strong> (cc: Odi@sillowmill.com).
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleUnlockAndEnter}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-xs sm:text-sm font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-all cursor-pointer shadow-[0_0_25px_rgba(56,189,248,0.35)] flex items-center justify-center gap-2"
          >
            <span>ENTER ÄKINOYA VIP PORTAL</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>

          <button
            onClick={() => {
              if (onBackToComic) onBackToComic();
              else window.location.href = '/';
            }}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-xs sm:text-sm font-mono text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
          >
            Return to Store
          </button>
        </div>
      </motion.div>
    </div>
  );
};
