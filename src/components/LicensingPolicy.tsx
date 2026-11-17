import React from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Scale,
  AtSign,
  Ban,
  Handshake,
  Mail,
} from 'lucide-react';

interface LicensingPolicyProps {
  onBackToHome?: () => void;
}

/**
 * Dedicated `/licensing` ("License & @TAG Usage") Intellectual Property Policy page
 * for the Sillow Mill™ Universe.
 */
export const LicensingPolicy: React.FC<LicensingPolicyProps> = ({
  onBackToHome,
}) => {
  const handleBack = () => {
    if (onBackToHome) {
      onBackToHome();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white py-10 px-4 sm:px-6 lg:px-8 relative z-20">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation / Back Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-cyan-950 text-white/80 hover:text-cyan-300 border border-white/10 hover:border-cyan-400/40 text-xs font-mono transition-all cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Back to Äkinoya Portal</span>
          </button>

          <span className="text-[11px] font-mono text-cyan-400/90 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
            IP &amp; @TAG POLICY
          </span>
        </div>

        {/* Title Banner */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <Scale className="w-5 h-5 shrink-0" />
            <span className="text-xs font-mono tracking-widest uppercase">
              Intellectual Property &amp; Licensing Framework
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-wide">
            License &amp; @TAG Usage Guidelines
          </h1>
          <h2 className="text-sm sm:text-base font-mono text-cyan-300/90 tracking-wide">
            Intellectual Property Policy for the Sillow Mill™ Universe
          </h2>
        </div>

        {/* 1. Official Ownership & Protection */}
        <section className="bg-black/60 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-5 sm:p-7 space-y-3 shadow-[0_0_30px_rgba(56,189,248,0.12)]">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-cyan-300 uppercase tracking-wide">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <h2>1. Official Ownership &amp; Protection</h2>
          </div>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            SILLOW MILL™, MILL™, SILLOW™, ODI™, and the entire surrounding universe—including all character designs, visual artwork, storylines, lore, audio, and world-building—are the exclusive intellectual property of{' '}
            <strong className="text-white font-semibold">Odi Selis</strong>. These assets are legally protected under international copyright law, Benelux Trademark Registrations (Word Mark &amp; Visual Mark), and registered i-DEPOT provenance records.
          </p>
        </section>

        {/* 2. Community & Fan Creation Policy (The @TAG System) */}
        <section className="bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-white uppercase tracking-wide">
            <AtSign className="w-4 h-4 text-cyan-400 shrink-0" />
            <h2>2. Community &amp; Fan Creation Policy (The @TAG System)</h2>
          </div>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            We love and encourage genuine human creativity within our community! Fans are welcome to create and share non-commercial fan art, covers, or discussion posts under the following mandatory conditions:
          </p>
          <ul className="space-y-3 text-xs sm:text-sm text-white/75 leading-relaxed">
            <li className="p-3.5 rounded-xl bg-black/60 border border-cyan-500/20">
              <strong className="text-cyan-300 font-mono">Mandatory Attribution (@TAG):</strong>{' '}
              You must clearly credit the official universe by tagging{' '}
              <strong className="text-white font-mono bg-cyan-950/80 border border-cyan-400/40 px-1.5 py-0.5 rounded">
                @SillowMill
              </strong>{' '}
              (or using{' '}
              <strong className="text-white font-mono bg-cyan-950/80 border border-cyan-400/40 px-1.5 py-0.5 rounded">
                #SillowMill
              </strong>
              ) in the caption or description of your post.
            </li>
            <li className="p-3.5 rounded-xl bg-black/60 border border-white/10">
              <strong className="text-white font-mono">Non-Commercial Only:</strong>{' '}
              Fan creations may not be sold, monetized, minted as NFTs, printed on merchandise, or used to promote commercial products or services.
            </li>
            <li className="p-3.5 rounded-xl bg-black/60 border border-white/10">
              <strong className="text-white font-mono">No Misrepresentation:</strong>{' '}
              Fan works must not imply official endorsement, canon status, or affiliation with Odi Selis.
            </li>
          </ul>
        </section>

        {/* 3. Strict Prohibition on AI Training & Generative Derivative Works */}
        <section className="bg-black/45 backdrop-blur-xl border border-rose-500/25 rounded-2xl p-5 sm:p-7 space-y-4 shadow-[0_0_25px_rgba(244,63,94,0.08)]">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-rose-300 uppercase tracking-wide">
            <Ban className="w-4 h-4 text-rose-400 shrink-0" />
            <h2>3. Strict Prohibition on AI Training &amp; Generative Derivative Works</h2>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-white/75 leading-relaxed">
            <li className="p-3.5 rounded-xl bg-black/60 border border-rose-500/20">
              <strong className="text-rose-200 font-mono">Zero AI Scraping:</strong>{' '}
              Automated scraping, data mining, or harvesting of any visual, textual, or audio content from this website or official channels for machine learning or AI dataset training is strictly prohibited.
            </li>
            <li className="p-3.5 rounded-xl bg-black/60 border border-rose-500/20">
              <strong className="text-rose-200 font-mono">No AI-Generated Derivatives:</strong>{' '}
              Uploading official <em className="text-white/90">Sillow Mill</em> artwork, character sheets, or audio into AI image/music generators (img2img, LoRA training, voice cloning, or style transfer) is a direct violation of our copyright and trademark rights.
            </li>
          </ul>
        </section>

        {/* 4. Commercial Licensing & Brand Partnerships */}
        <section className="bg-black/45 backdrop-blur-xl border border-amber-500/25 rounded-2xl p-5 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-amber-300 uppercase tracking-wide">
            <Handshake className="w-4 h-4 text-amber-400 shrink-0" />
            <h2>4. Commercial Licensing &amp; Brand Partnerships</h2>
          </div>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            Interested in official collaborations, sync licensing, publishing, or commercial merchandise partnerships? Please reach out directly via our official contact channels with details regarding your project scope. Unlicensed commercial use will result in immediate takedown notices and legal enforcement.
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-3">
            <a
              href="mailto:Odi@sillowmill.com?subject=Sillow%20Mill%20Licensing%20%26%20Partnership%20Inquiry"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 font-mono text-xs font-semibold transition-all min-h-[44px]"
            >
              <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Odi@sillowmill.com</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};
