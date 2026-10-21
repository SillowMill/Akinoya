import React from 'react';
import { Download } from 'lucide-react';
import sillowMillLogoUrl from '../assets/images/Sillowmilllogo.png';
import { PlanetSubmission } from '../types/contest';
import { getPlanetSlotCharacteristics } from '../utils/watermarkPhoto';

export interface PlanetPhoto4kOverlayWidgetProps {
  planetName: string;
  slotIndex?: number;
  category?: string;
  photoTitle?: string;
  dossier?: PlanetSubmission;
  onDownload?: () => void;
  isDownloading?: boolean;
  className?: string;
  showSaveButton?: boolean;
  compactOnMobile?: boolean;
}

/**
 * Pre-Download Visible Trademark & Branding Widget for 4K Planetary Photos.
 * 
 * Features:
 * 1. Displays the dynamically generated name of the active planet (e.g. ÄMLEMI).
 * 2. Displays the synchronized characteristics subtitle (e.g. ÄKINOYA UNIVERSE · 01 / TYPE: CELESTIAL NUCLEUS).
 * 3. Visibly showcases the official trademark & copyright: "™ & © SILLOW MILL · sillowmill.com"
 * 4. Displays the official Sillow Mill insignia with high-res styling and drop-shadow glow.
 * 5. Provides an attached "Save picture to Photos" action button for instant saving.
 */
export const PlanetPhoto4kOverlayWidget: React.FC<PlanetPhoto4kOverlayWidgetProps> = React.memo(({
  planetName,
  slotIndex = 0,
  category,
  dossier,
  onDownload,
  isDownloading = false,
  className = '',
  showSaveButton = true,
  compactOnMobile = false,
}) => {
  const characteristics = getPlanetSlotCharacteristics(slotIndex, dossier, category);
  const displayPlanetName = (planetName || dossier?.planetName || 'ÄMLEMI').toUpperCase();

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
      className={`absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 pointer-events-auto max-w-[calc(100%-24px)] sm:max-w-max select-none ${className}`}
    >
      <div className="relative flex items-center justify-between gap-2.5 sm:gap-3.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-[#040916]/90 sm:bg-[#040916]/85 backdrop-blur-md border border-cyan-400/50 shadow-[0_4px_24px_rgba(0,0,0,0.9),0_0_20px_rgba(6,182,212,0.22)]">
        {/* Specular Top Hairline Accent */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-300/80 to-amber-300/80 pointer-events-none rounded-t-2xl" />

        {/* 1. Official Sillow Mill Insignia Container */}
        <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/[0.08] border border-white/20 p-1 sm:p-1.5 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.25)]">
          <img
            src={sillowMillLogoUrl}
            alt="Sillow Mill Emblem"
            className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]"
            loading="eager"
            decoding="async"
          />
        </div>

        {/* 2. Specular Chrome Divider */}
        <div
          className="h-8 sm:h-9 w-[1.5px] bg-gradient-to-b from-white/10 via-white/50 to-white/10 shrink-0 shadow-[0_0_6px_rgba(255,255,255,0.3)]"
          aria-hidden="true"
        />

        {/* 3. Dynamic Planet Typography & Trademark Stack */}
        <div className="min-w-0 pr-1 text-left">
          {/* Header: Dynamic Planet Name */}
          <div className="text-xs sm:text-sm font-display font-black text-white uppercase tracking-wider leading-none truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {displayPlanetName}
          </div>

          {/* Subtitle: Planet Characteristics / Slot Type */}
          <div className="text-[8.5px] sm:text-[10px] font-mono font-bold text-cyan-300 tracking-wide uppercase mt-1 leading-tight truncate">
            {characteristics.subtitle}
          </div>

          {/* Line 3: Official Trademark & Copyright */}
          <div className="text-[7.5px] sm:text-[8.5px] font-mono font-medium text-slate-300/95 tracking-wider mt-0.5 leading-tight truncate">
            ™ &amp; © SILLOW MILL · sillowmill.com
          </div>
        </div>

        {/* 4. Attached "Save picture to Photos" Action Button */}
        {showSaveButton && onDownload && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            disabled={isDownloading}
            className={`ml-1 sm:ml-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-[10px] sm:text-xs font-black tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-95 shrink-0 touch-manipulation border border-amber-300/60 ${
              compactOnMobile ? 'hidden sm:flex' : 'flex'
            }`}
            title="Save picture to Photos"
          >
            <Download className="w-3.5 h-3.5 text-black shrink-0" />
            <span className="whitespace-nowrap">
              {isDownloading ? 'Saving picture to Photos...' : 'Save picture to Photos'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
});

export default PlanetPhoto4kOverlayWidget;
