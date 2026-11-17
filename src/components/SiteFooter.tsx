import React from 'react';
import { ShieldCheck, Scale } from 'lucide-react';

export type FooterNavRoute = 'licensing' | 'privacy' | 'kyc';

interface SiteFooterProps {
  /** 'global' adds portrait bottom safe padding above sticky nav; 'hub' renders inside CommunityHub's main scroller. */
  variant?: 'global' | 'hub';
  onNavigate?: (route: FooterNavRoute, path: string) => void;
}

const ROUTE_PATHS: Record<FooterNavRoute, string> = {
  licensing: '/licensing',
  privacy: '/privacy',
  kyc: '/kyc',
};

/**
 * Shared legal, copyright, anti-AI notice, and licensing footer displayed across all pages.
 */
export const SiteFooter: React.FC<SiteFooterProps> = ({
  variant = 'global',
  onNavigate,
}) => {
  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetRoute: FooterNavRoute
  ) => {
    // Preserve native new-tab / modifier-click behavior on <a href="...">
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    const targetPath = ROUTE_PATHS[targetRoute];
    if (onNavigate) {
      onNavigate(targetRoute, targetPath);
      return;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('akinoya-navigate-route', {
          detail: { route: targetRoute, path: targetPath },
        })
      );
    }
  };

  const containerClassName =
    variant === 'hub'
      ? 'relative z-10 w-full shrink-0 border-t border-white/10 bg-[#050811]/95 rounded-2xl py-5 px-4 sm:px-6 mt-8 text-center space-y-3'
      : 'site-footer-safe relative z-10 w-full shrink-0 border-t border-white/10 bg-[#050811]/95 py-5 px-4 sm:px-6 text-center space-y-3';

  return (
    <footer style={{ overflowAnchor: 'none' }} className={containerClassName}>
      {/* Official Copyright, Trademark, and Anti-AI Legal Notice */}
      <div className="max-w-7xl mx-auto space-y-3">
        <p className="text-[11px] sm:text-xs font-sans text-white/65 leading-relaxed max-w-5xl mx-auto">
          © 2026 Odi Selis. SILLOW MILL™, MILL™, SILLOW™, ODI™, and all associated characters, visual assets, music, and lore are registered trademarks and protected by copyright (Benelux Trademark Registration &amp; i-DEPOT). All rights reserved. No artwork, character, audio, or lore may be used for commercial purposes, merchandising, or AI model training/scraping without prior written permission.
        </p>

        {/* Primary Legal Navigation & Protocol Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-[11px] font-mono">
            <a
              href="/licensing"
              onClick={(e) => handleLinkClick(e, 'licensing')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-400/40 hover:border-cyan-300/70 text-cyan-300 hover:text-cyan-200 font-semibold transition-all shadow-[0_0_12px_rgba(34,211,238,0.12)]"
            >
              <Scale className="w-3.5 h-3.5 shrink-0" />
              <span>License &amp; @TAG Usage</span>
            </a>

            <span className="text-white/20 hidden xs:inline">·</span>

            <a
              href="/privacy"
              onClick={(e) => handleLinkClick(e, 'privacy')}
              className="text-white/65 hover:text-cyan-300 transition-colors underline-offset-4 hover:underline py-1"
            >
              Privacy Policy
            </a>

            <span className="text-white/25">·</span>

            <a
              href="/kyc"
              onClick={(e) => handleLinkClick(e, 'kyc')}
              className="text-white/65 hover:text-cyan-300 transition-colors underline-offset-4 hover:underline py-1"
            >
              KYC Verification
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] sm:text-[11px] font-mono text-white/50">
            <span className="inline-flex items-center gap-1 text-cyan-400/90">
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>ÄKINOYA LIVE PROTOCOL</span>
            </span>
            <span className="text-white/25">·</span>
            <span>IP &amp; i-DEPOT PROTECTED</span>
          </div>
        </div>
      </div>

      {/* Sub-footer Commercial Legal Imprint */}
      <div className="max-w-7xl mx-auto pt-2.5 border-t border-white/10 text-[10px] sm:text-[11px] font-mono text-white/45 flex flex-wrap items-center justify-center gap-1 sm:gap-2 leading-relaxed">
        <span>Sillow Mill</span>
        <span className="text-white/25">·</span>
        <span>Enterprise No. (KBO): 1041.720.513</span>
        <span className="text-white/25">·</span>
        <span>VAT: BE 1041.720.513</span>
        <span className="text-white/25">·</span>
        <a
          href="mailto:Odi@sillowmill.com"
          className="text-white/60 hover:text-cyan-300 transition-colors"
        >
          Odi@sillowmill.com
        </a>
        <span className="text-white/25">·</span>
        <span>KBC BE97 7460 3951 7915</span>
      </div>
    </footer>
  );
};
