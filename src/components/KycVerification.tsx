import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowLeft, Building2, Landmark, CheckCircle, Copy, Check, FileCheck } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface KycVerificationProps {
  onBackToHome?: () => void;
}

export const KycVerification: React.FC<KycVerificationProps> = ({ onBackToHome }) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleBack = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleCopy = (key: string, val: string) => {
    navigator.clipboard?.writeText?.(val);
    setCopiedKey(key);
    soundManager.playTone(880, 0.08);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white py-10 px-4 sm:px-6 lg:px-8 relative z-20">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation / Back Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-cyan-950 text-white/80 hover:text-cyan-300 border border-white/10 hover:border-cyan-400/40 text-xs font-mono transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Äkinoya Portal</span>
          </button>

          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40 font-semibold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>OFFICIAL KBO VERIFIED</span>
          </span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <FileCheck className="w-6 h-6" />
            <span className="text-xs font-mono tracking-widest uppercase">Legal Identification & Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-wide">
            KYC & Legal Entity Verification — Sillow Mill
          </h1>
          <p className="text-xs sm:text-sm text-white/60 font-mono">
            Official commercial registration records pursuant to the Belgian Crossroads Bank for Enterprises (KBO / CBE) and FPS Finance.
          </p>
        </div>

        {/* Legal Registry Box */}
        <div className="bg-black/60 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-5 sm:p-7 space-y-5 shadow-[0_0_30px_rgba(56,189,248,0.12)]">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-cyan-300 uppercase tracking-wide border-b border-white/10 pb-3">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <h2>Belgian Enterprise Registration (KBO / VAT)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Entity Name */}
            <div className="bg-black/80 border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-white/40 block">LEGAL ENTITY NAME</span>
                <span className="font-bold text-white text-sm">Sillow Mill</span>
              </div>
              <span className="text-[10px] text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                Registered
              </span>
            </div>

            {/* Representative */}
            <div className="bg-black/80 border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-white/40 block">REPRESENTATIVE</span>
                <span className="font-bold text-white text-sm">Odi</span>
              </div>
              <span className="text-[10px] text-white/50">Owner / Principal</span>
            </div>

            {/* KBO Number */}
            <div className="bg-black/80 border border-cyan-500/30 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-cyan-300/80 block">ENTERPRISE NUMBER (KBO / CBE)</span>
                <span className="font-bold text-cyan-300 text-sm select-all">1041.720.513</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('kbo', '1041.720.513')}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-950 text-white/70 hover:text-cyan-300 border border-white/10 transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                title="Copy KBO"
              >
                {copiedKey === 'kbo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'kbo' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* VAT Number */}
            <div className="bg-black/80 border border-cyan-500/30 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-cyan-300/80 block">VAT IDENTIFICATION (BTW)</span>
                <span className="font-bold text-cyan-300 text-sm select-all">BE 1041.720.513</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('vat', 'BE 1041.720.513')}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-950 text-white/70 hover:text-cyan-300 border border-white/10 transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                title="Copy VAT"
              >
                {copiedKey === 'vat' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'vat' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Bank details */}
            <div className="bg-black/80 border border-white/10 rounded-xl p-3.5 flex items-center justify-between md:col-span-2">
              <div>
                <span className="text-[10px] text-white/40 block">OFFICIAL BANK ACCOUNT (KBC BANK)</span>
                <span className="font-bold text-white text-xs sm:text-sm tracking-wider select-all">
                  BE97 7460 3951 7915 · KBC Bank (BIC: KREDBEBB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('iban', 'BE97 7460 3951 7915')}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-950 text-white/70 hover:text-cyan-300 border border-white/10 transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                title="Copy IBAN"
              >
                {copiedKey === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'iban' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Invoicing & Delivery Compliance */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-7 space-y-3 text-xs sm:text-sm text-white/80 font-mono leading-relaxed">
          <h3 className="font-display font-bold text-white text-sm uppercase tracking-wide">
            Invoicing, Pre-Orders & Payment Verification
          </h3>
          <p>
            Each pre-order of the official <strong>"Bingäa — Limited Edition Comic"</strong> (€14.99) is linked to a unique verification code (ORD reference) and registered under Belgian enterprise number <strong>1041.720.513</strong> (VAT: BE 1041.720.513).
          </p>
          <p>
            Upon payment via KBC Bank SEPA transfer or credit/debit card, a proof of purchase is dispatched to the provided email address, featuring the official Belgian VAT credentials for personal and corporate accounting.
          </p>
          <div className="pt-2">
            <span className="text-white/40">Questions regarding invoices or identity verification? </span>
            <a href="mailto:Odi@sillowmill.com" className="text-cyan-300 underline font-semibold">
              Odi@sillowmill.com
            </a>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-4 text-xs font-mono text-white/40 border-t border-white/10">
          Sillow Mill · Enterprise No. (KBO): 1041.720.513 · VAT: BE 1041.720.513 · Odi@sillowmill.com · KBC BE97 7460 3951 7915
        </div>
      </div>
    </div>
  );
};
