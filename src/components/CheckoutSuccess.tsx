import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, QrCode, Sparkles, ArrowRight, ShieldCheck, Download, ExternalLink, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

interface CheckoutSuccessProps {
  onEnterPortal?: () => void;
  onBackToComic?: () => void;
}

export const CheckoutSuccess: React.FC<CheckoutSuccessProps> = ({ onEnterPortal, onBackToComic }) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [orderDetails, setOrderDetails] = useState<{
    customerName?: string;
    customerEmail?: string;
    passId?: string;
    amount?: number;
    status?: string;
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
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setOrderDetails({
              customerName: data.customerName || data.session?.customer_details?.name || 'Collector',
              customerEmail: data.customerEmail || data.session?.customer_details?.email,
              passId: data.passId,
              amount: (data.session?.amount_total || 1499) / 100,
              status: data.status || 'paid',
            });
            // Automatically grant VIP portal unlock in sessionStorage
            try {
              sessionStorage.setItem('akinoya_vip_unlocked', 'true');
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
            <span>PAYMENT CONFIRMED · WAVE 2 ALLOCATION SECURED</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            Welcome to the Lore, {orderDetails.customerName || 'Collector'}.
          </h1>

          <p className="text-xs sm:text-sm text-white/70 font-mono max-w-lg mx-auto leading-relaxed">
            Your pre-order for <strong className="text-white">Bingäa — Limited Edition Comic</strong> (€14,99) has been verified via Stripe.
          </p>
        </div>

        {/* Pass ID / Entitlement Badge */}
        <div className="p-4 sm:p-5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-2 text-left">
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
            <span className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>OFFICIAL PASS ID & ENTITLEMENT KEY</span>
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
              <span className="text-xs text-white font-semibold">WAVE 2 (1/125)</span>
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
