import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowLeft, Mail, Building2, Landmark, FileText, CheckCircle2 } from 'lucide-react';

interface PrivacyPolicyProps {
  onBackToHome?: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBackToHome }) => {
  const handleBack = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.location.href = '/';
    }
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

          <span className="text-[11px] font-mono text-cyan-400/80 uppercase tracking-wider">
            GDPR COMPLIANT
          </span>
        </div>

        {/* Title Banner */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-xs font-mono tracking-widest uppercase">Privacy Statement</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-wide">
            Privacy Policy — Sillow Mill
          </h1>
          <p className="text-xs sm:text-sm text-white/60 font-mono">
            Last updated: October 2026 · In compliance with the General Data Protection Regulation (GDPR / Regulation (EU) 2016/679).
          </p>
        </div>

        {/* 1. Data Controller */}
        <section className="bg-black/60 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-5 sm:p-7 space-y-4 shadow-[0_0_30px_rgba(56,189,248,0.12)]">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-cyan-300 uppercase tracking-wide">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <h2>1. Data Controller (Verantwoordelijke)</h2>
          </div>

          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            The data controller responsible for the processing of personal data collected through this website, member portals, and pre-order transactions is the registered Belgian entity <strong>Sillow Mill</strong>:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-black/80 border border-white/10 rounded-xl p-4">
            <div>
              <span className="text-white/40 block text-[10px]">TRADE NAME & ENTITY</span>
              <span className="font-bold text-white">Sillow Mill</span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px]">REPRESENTED BY</span>
              <span className="font-bold text-white">Odi</span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px]">ENTERPRISE NUMBER (KBO / CBE)</span>
              <span className="font-bold text-cyan-300 select-all">1041.720.513</span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px]">VAT IDENTIFICATION NUMBER</span>
              <span className="font-bold text-cyan-300 select-all">BE 1041.720.513</span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px]">BANKING PARTNER (KBC)</span>
              <span className="font-bold text-white">BE97 7460 3951 7915</span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px]">EMAIL FOR PRIVACY & SUPPORT</span>
              <a href="mailto:Odi@sillowmill.com" className="font-bold text-cyan-300 hover:underline">
                Odi@sillowmill.com
              </a>
            </div>
          </div>
        </section>

        {/* 2. What Personal Data Do We Collect? */}
        <section className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-7 space-y-3">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-white uppercase tracking-wide">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h2>2. What Personal Data Do We Collect?</h2>
          </div>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
            We only collect personal information strictly required to process your pre-order, secure your VIP allocation, and fulfill physical shipment drops:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-white/70 space-y-1.5 pl-2 font-mono">
            <li>First and last name for collector registration and parcel dispatch;</li>
            <li>Email address for instant order confirmation, digital verification keys, and tracking notices;</li>
            <li>Shipping address (street, postal code, city, country) for physical graphic novel delivery;</li>
            <li>Payment reference (ORD code) for automated SEPA wire transfer reconciliation via KBC Bank;</li>
            <li>Technical session identifiers and IP logs for fraud prevention and secure protocol access.</li>
          </ul>
        </section>

        {/* 3. Purpose & Legal Basis */}
        <section className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-7 space-y-3">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-white uppercase tracking-wide">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h2>3. Purposes & Legal Basis for Processing</h2>
          </div>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
            Data processing is conducted pursuant to Article 6(1)(b) GDPR (performance of a pre-order purchase contract) and Article 6(1)(c) GDPR (compliance with Belgian tax and statutory commercial accounting laws):
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-white/70 space-y-1.5 pl-2 font-mono">
            <li>Execution and physical fulfillment of "Sillow Mill — Bingäa (Collector's Graphic Novel)" pre-orders (€14.99);</li>
            <li>Authenticating priority access keys tied to the embedded QR code collector edition;</li>
            <li>Issuance of formal transaction receipts and VAT-compliant invoices.</li>
          </ul>
        </section>

        {/* 4. Your Rights Under GDPR */}
        <section className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-7 space-y-3">
          <h2 className="text-sm font-display font-bold text-white uppercase tracking-wide">
            4. Your Rights Under GDPR
          </h2>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
            You retain the right to request access, rectification, portability, restriction, or erasure of your personal records at any time. To exercise these rights, contact Odi directly at <a href="mailto:Odi@sillowmill.com" className="text-cyan-300 underline font-mono">Odi@sillowmill.com</a> with your name and order reference.
          </p>
        </section>

        {/* Footer info */}
        <div className="text-center pt-4 text-xs font-mono text-white/40 border-t border-white/10">
          Sillow Mill · Enterprise No. (KBO): 1041.720.513 · VAT: BE 1041.720.513 · Odi@sillowmill.com · KBC BE97 7460 3951 7915
        </div>
      </div>
    </div>
  );
};
