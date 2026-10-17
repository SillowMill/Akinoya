import React, { useState, useMemo } from 'react';
import {
  Download,
  Share2,
  ShieldCheck,
  Sparkles,
  Check,
  Copy,
  Globe2,
  Camera,
} from 'lucide-react';
import { PlanetSubmission } from '../types/contest';
import { getPlanetPhotoCards } from '../data/contest';
import { isFoundingPioneerPlanet, isPioneerPlanet } from '../utils/pioneer';
import { soundManager } from '../utils/audio';
import sillowMillLogoUrl from '../assets/images/Sillowmilllogo.png';

interface WorldStoryVerificationBadgeProps {
  dossier: PlanetSubmission;
  editionRank?: number;
  isSimulationMode?: boolean;
  onUnlockSimulation?: () => void;
  onInspectDossier?: (dossier: PlanetSubmission) => void;
}

/**
 * Derives a deterministic verification code & edition number for a registered world.
 */
export function deriveWorldVerificationMeta(dossier: PlanetSubmission, editionRank?: number) {
  const isAmlemi =
    dossier.id === 'planet-amlemi-genesis-01' ||
    dossier.planetName?.toLowerCase() === 'ämlemi' ||
    isFoundingPioneerPlanet(dossier);

  let worldNumber = editionRank && editionRank > 0 ? editionRank : 1;
  if (isAmlemi) {
    worldNumber = 1;
  } else if (!editionRank || editionRank <= 0) {
    let acc = 0;
    for (let i = 0; i < dossier.id.length; i++) {
      acc = (acc * 31 + dossier.id.charCodeAt(i)) % 99;
    }
    worldNumber = Math.max(2, acc + 2);
  }

  // Deterministic 4-char hex suffix from planet ID + author
  let hash = 0x41c64e6d;
  const raw = `${dossier.id}:${dossier.planetName}:${dossier.authorName}`;
  for (let i = 0; i < raw.length; i++) {
    hash = Math.imul(hash ^ raw.charCodeAt(i), 0x01000193);
  }
  const hexSuffix = (Math.abs(hash) % 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');

  const paddedNum = String(worldNumber).padStart(3, '0');
  const verificationCode = isAmlemi
    ? 'AKN-WLD-2027-001-GENESIS'
    : `AKN-WLD-2027-${paddedNum}-${hexSuffix}`;

  const shareUrl = `https://sillowmill.com/galaxy?planet=${encodeURIComponent(dossier.id)}`;

  return {
    worldNumber,
    paddedNum,
    verificationCode,
    shareUrl,
    isAmlemi,
    isPioneer: isPioneerPlanet(dossier),
  };
}

/**
 * Loads an image safely with crossOrigin fallback for Canvas rendering.
 */
function loadImageForCanvas(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback without crossOrigin if local asset
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => resolve(null);
      fallback.src = src;
    };
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.width / Math.max(1, img.height);
  const boxRatio = w / Math.max(1, h);
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/**
 * Renders the 1080x1920 (9:16) high-res Story Verification Affiche onto a Canvas and returns a Blob.
 */
export async function renderWorldStoryBadgeBlob(
  dossier: PlanetSubmission,
  editionRank?: number
): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const meta = deriveWorldVerificationMeta(dossier, editionRank);
  const photoCards = getPlanetPhotoCards(dossier);

  // Load all 5 planetary photos + official Sillowmilllogo.png in parallel
  const [loadedPhotos, logoImg] = await Promise.all([
    Promise.all(photoCards.slice(0, 5).map((c) => loadImageForCanvas(c.url))),
    loadImageForCanvas(sillowMillLogoUrl),
  ]);

  // 1. Deep Cosmic Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#040915');
  bgGrad.addColorStop(0.45, '#060c1c');
  bgGrad.addColorStop(1, '#02050b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Ambient Radial Glows
  const topGlow = ctx.createRadialGradient(W * 0.5, 160, 20, W * 0.5, 160, 560);
  topGlow.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
  topGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  const bottomGlow = ctx.createRadialGradient(W * 0.5, H - 220, 20, W * 0.5, H - 220, 560);
  bottomGlow.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
  bottomGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, W, H);

  // Outer Sci-Fi Frame Border
  drawRoundedRect(ctx, 36, 36, W - 72, H - 72, 36);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.48)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  drawRoundedRect(ctx, 48, 48, W - 96, H - 96, 28);
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.24)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const contentX = 84;
  const contentW = W - 168; // 912px

  // 2. Top-Level Branding Header: Official "SILLOW MILL" Logo + Brand Name + "CELOMILLE" & "ÄKINOYA UNIVERSE"
  const brandHeaderY = 82;
  const logoFrameSize = 114;

  // Subtle glass crest container for the logo
  drawRoundedRect(ctx, contentX, brandHeaderY, logoFrameSize, logoFrameSize, 24);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (logoImg) {
    const pad = 12;
    const maxDim = logoFrameSize - pad * 2;
    const ratio = logoImg.width / Math.max(1, logoImg.height);
    let drawW = maxDim;
    let drawH = maxDim;
    if (ratio > 1) {
      drawH = maxDim / ratio;
    } else {
      drawW = maxDim * ratio;
    }
    const dx = contentX + (logoFrameSize - drawW) / 2;
    const dy = brandHeaderY + (logoFrameSize - drawH) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
    ctx.shadowBlur = 16;
    ctx.drawImage(logoImg, dx, dy, drawW, drawH);
    ctx.restore();
  }

  const brandTextX = contentX + logoFrameSize + 28;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 44px "Inter", sans-serif';
  ctx.fillText('SILLOW MILL', brandTextX, brandHeaderY + 46);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 21px "JetBrains Mono", monospace';
  ctx.fillText('CELOMILLE  ·  ÄKINOYA UNIVERSE', brandTextX, brandHeaderY + 82);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillText('OFFICIAL PLANETARY VERIFICATION AFFICHE', brandTextX, brandHeaderY + 108);

  // Unique Edition Number Badge (Top Right alongside Branding Header)
  const badgeW = 200;
  const badgeH = 104;
  const badgeX = W - 84 - badgeW;
  const badgeY = brandHeaderY + 5;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 22);
  const numGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
  numGrad.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
  numGrad.addColorStop(1, 'rgba(6, 182, 212, 0.22)');
  ctx.fillStyle = numGrad;
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(254, 243, 199, 0.85)';
  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WORLD EDITION', badgeX + badgeW / 2, badgeY + 34);

  ctx.fillStyle = '#fde68a';
  ctx.font = '900 42px "Inter", sans-serif';
  ctx.fillText(`#${meta.worldNumber}`, badgeX + badgeW / 2, badgeY + 82);
  ctx.textAlign = 'left';

  // Divider below Top-Level Branding Header
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(contentX, 220);
  ctx.lineTo(W - contentX, 220);
  ctx.stroke();

  // 3. Planet Title, Holder Info & Sector Specifications (Immediately below Top-Level Branding Header)
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillText(
    meta.isAmlemi
      ? '★ FOUNDING PIONEER · GENESIS BENCHMARK'
      : meta.isPioneer
      ? '★ PIONEER 2027 · PRE-RELEASE WORLD'
      : '★ VERIFIED PLANETARY ARCHIVE',
    contentX,
    256
  );

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 62px "Inter", sans-serif';
  ctx.fillText((dossier.planetName || 'ÄMLEMI').toUpperCase(), contentX, 322);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 23px "JetBrains Mono", monospace';
  const holderLine = `HOLDER: ${(dossier.authorName || 'ODI SELIS').toUpperCase()}   ·   ${(
    dossier.sectorId || 'SECTOR AKN-01'
  ).toUpperCase()}`;
  ctx.fillText(holderLine, contentX, 362);

  // Subtle divider above 5-Photo Collage
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(contentX, 386);
  ctx.lineTo(W - contentX, 386);
  ctx.stroke();

  // 4. Artistic 5-Photo Collage (01 Main Hero + 2x2 Grid for 02, 03, 04, 05)
  const heroY = 410;
  const heroH = 490;

  // 01 Main Hero Frame
  ctx.save();
  drawRoundedRect(ctx, contentX, heroY, contentW, heroH, 24);
  ctx.clip();
  if (loadedPhotos[0]) {
    drawCoverImage(ctx, loadedPhotos[0], contentX, heroY, contentW, heroH);
  } else {
    ctx.fillStyle = '#091326';
    ctx.fillRect(contentX, heroY, contentW, heroH);
  }
  const heroOverlay = ctx.createLinearGradient(0, heroY + heroH * 0.45, 0, heroY + heroH);
  heroOverlay.addColorStop(0, 'rgba(0,0,0,0)');
  heroOverlay.addColorStop(1, 'rgba(2,6,16,0.88)');
  ctx.fillStyle = heroOverlay;
  ctx.fillRect(contentX, heroY, contentW, heroH);
  ctx.restore();

  drawRoundedRect(ctx, contentX, heroY, contentW, heroH, 24);
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillText('01_MAIN · ORBITAL HORIZON ARCHIVE', contentX + 24, heroY + heroH - 52);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px "Inter", sans-serif';
  ctx.fillText(photoCards[0]?.title || 'Orbital Horizon', contentX + 24, heroY + heroH - 20);

  // 2x2 Grid for Photos 02, 03, 04, 05
  const gridY = heroY + heroH + 22; // 922
  const gap = 20;
  const cellW = (contentW - gap) / 2; // 446px
  const cellH = 278;
  const slotLabels = [
    '02 · BOTANICAL FLORA',
    '03 · APEX FAUNA',
    '04 · COCKPIT CANOPY',
    '05 · SACRED MONUMENT',
  ];

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = contentX + col * (cellW + gap);
    const cy = gridY + row * (cellH + gap);
    const img = loadedPhotos[i + 1];
    const card = photoCards[i + 1];

    ctx.save();
    drawRoundedRect(ctx, cx, cy, cellW, cellH, 20);
    ctx.clip();
    if (img) {
      drawCoverImage(ctx, img, cx, cy, cellW, cellH);
    } else {
      ctx.fillStyle = '#091326';
      ctx.fillRect(cx, cy, cellW, cellH);
    }
    const cellGrad = ctx.createLinearGradient(0, cy + cellH * 0.4, 0, cy + cellH);
    cellGrad.addColorStop(0, 'rgba(0,0,0,0)');
    cellGrad.addColorStop(1, 'rgba(2,6,16,0.9)');
    ctx.fillStyle = cellGrad;
    ctx.fillRect(cx, cy, cellW, cellH);
    ctx.restore();

    drawRoundedRect(ctx, cx, cy, cellW, cellH, 20);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#67e8f9';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText(slotLabels[i], cx + 18, cy + cellH - 42);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Inter", sans-serif';
    const titleText = (card?.title || slotLabels[i]).slice(0, 26);
    ctx.fillText(titleText, cx + 18, cy + cellH - 16);
  }

  // 5. Streamlined Minimalist Footer: Archival Lore + Verification Code & Authentication Status (No QR)
  const footerBoxY = gridY + cellH * 2 + gap + 26; // 1524
  const footerBoxH = 310;
  drawRoundedRect(ctx, contentX, footerBoxY, contentW, footerBoxH, 24);
  ctx.fillStyle = 'rgba(8, 17, 34, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 17px "JetBrains Mono", monospace';
  ctx.fillText('ARCHIVAL LORE SUMMARY & CRYPTOGRAPHIC VERIFICATION', contentX + 28, footerBoxY + 42);

  // Wrap Lore Text (max 2 lines)
  const rawLore =
    dossier.futurePromise ||
    dossier.generatedLore ||
    'Synthesized planetary ecosystem verified within the official Sillow Mill — Äkinoya galaxy archive.';
  const cleanLore = `"${rawLore.replace(/\s+/g, ' ').trim()}"`;
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'italic 23px "Inter", sans-serif';
  const words = cleanLore.split(' ');
  let line1 = '';
  let line2 = '';
  for (const w of words) {
    if (ctx.measureText(line1 + w + ' ').width < contentW - 56) {
      line1 += w + ' ';
    } else if (ctx.measureText(line2 + w + ' ').width < contentW - 90) {
      line2 += w + ' ';
    } else {
      line2 = line2.trim() + '..."';
      break;
    }
  }
  ctx.fillText(line1.trim(), contentX + 28, footerBoxY + 86);
  if (line2) {
    ctx.fillText(line2.trim(), contentX + 28, footerBoxY + 122);
  }

  // Minimalist Verification Bar inside Footer Box
  const verifyBarY = footerBoxY + 154;
  const verifyBarH = 74;
  drawRoundedRect(ctx, contentX + 28, verifyBarY, contentW - 56, verifyBarH, 16);
  ctx.fillStyle = 'rgba(4, 9, 20, 0.96)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#67e8f9';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillText(`VERIFICATION CODE: ${meta.verificationCode}`, contentX + 52, verifyBarY + 45);

  ctx.fillStyle = '#34d399';
  ctx.textAlign = 'right';
  ctx.fillText('● AUTHENTICATED', contentX + contentW - 52, verifyBarY + 45);
  ctx.textAlign = 'left';

  // Clean Bottom Signature Strip
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px "JetBrains Mono", monospace';
  ctx.fillText(
    'SILLOW MILL · CELOMILLE · ÄKINOYA UNIVERSE',
    contentX + 28,
    footerBoxY + 272
  );

  ctx.fillStyle = 'rgba(203, 213, 225, 0.75)';
  ctx.font = '500 17px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(
    'sillowmill.com · Proof of World Ownership',
    contentX + contentW - 28,
    footerBoxY + 272
  );
  ctx.textAlign = 'left';

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}

export const WorldStoryVerificationBadge: React.FC<WorldStoryVerificationBadgeProps> = ({
  dossier,
  editionRank,
  isSimulationMode = false,
  onUnlockSimulation,
  onInspectDossier,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isCopiedCode, setIsCopiedCode] = useState(false);

  const photoCards = useMemo(() => getPlanetPhotoCards(dossier), [dossier]);
  const meta = useMemo(
    () => deriveWorldVerificationMeta(dossier, editionRank),
    [dossier, editionRank]
  );

  const handleCopyCode = () => {
    soundManager.playTone(720, 0.05);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(meta.verificationCode);
      setIsCopiedCode(true);
      setTimeout(() => setIsCopiedCode(false), 2200);
    }
  };

  const handleDownloadStoryBadge = async () => {
    soundManager.playTone(780, 0.07);
    setIsExporting(true);
    try {
      const blob = await renderWorldStoryBadgeBlob(dossier, editionRank);
      if (!blob) return;
      const safeName = (dossier.planetName || 'akinoya-world')
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sillowmill-${safeName}-story-badge-9x16.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareStoryBadge = async () => {
    soundManager.playTone(840, 0.07);
    setIsExporting(true);
    try {
      const blob = await renderWorldStoryBadgeBlob(dossier, editionRank);
      if (!blob) return;
      const safeName = (dossier.planetName || 'akinoya-world')
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-');
      const file = new File([blob], `sillowmill-${safeName}-story-9x16.png`, {
        type: 'image/png',
      });

      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `${dossier.planetName} — Sillow Mill 9:16 World Verification Badge`,
          text: `Verified Planetary Dossier #${meta.worldNumber}: ${dossier.planetName} (${meta.verificationCode})`,
          url: meta.shareUrl,
          files: [file],
        });
        return;
      }

      // Fallback to direct download if Web Share API file sharing isn't supported on desktop
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sillowmill-${safeName}-story-badge-9x16.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // User cancelled share sheet
    } finally {
      setIsExporting(false);
    }
  };

  const heroPhoto = photoCards[0];
  const subPhotos = photoCards.slice(1, 5);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-950/45 via-[#050a14]/85 to-[#030710]/95 backdrop-blur-xl border border-amber-400/40 p-5 sm:p-6 md:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_30px_rgba(245,158,11,0.14)]">
      {/* Top Specular Highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/65 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 mb-6 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono font-extrabold uppercase tracking-wider text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>9:16 STORY VERIFICATION AFFICHE</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>PROOF OF WORLD OWNERSHIP · #{meta.worldNumber}</span>
            </span>
          </div>
          <h3 className="text-base sm:text-lg md:text-xl font-display font-black text-white tracking-wide">
            {dossier.planetName} — Shareable 9:16 Story Verification Asset
          </h3>
          <p className="text-xs font-sans text-white/70 max-w-2xl leading-relaxed">
            Official 9:16 vertical collector affiche featuring top-level Sillow Mill · Celomille · Äkinoya Universe branding, all 5 synthesized planetary renders, holder provenance, and cryptographic verification code.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadStoryBadge}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs font-extrabold tracking-wide transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] min-h-[44px]"
          >
            <Download className="w-4 h-4 text-black shrink-0" />
            <span>{isExporting ? 'Rendering 9:16 PNG...' : 'Download 9:16 Story Badge'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareStoryBadge}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-200 hover:text-white font-mono text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_16px_rgba(6,182,212,0.22)] min-h-[44px]"
          >
            <Share2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Share to Story</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Left 9:16 Interactive Vertical Story Affiche + Right Provenance Details */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-center">
        {/* 9:16 Vertical Story Card Preview */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="relative w-full max-w-[350px] sm:max-w-[375px] aspect-[9/16] rounded-[26px] p-3.5 sm:p-4 bg-gradient-to-b from-[#040915] via-[#060d1f] to-[#02050b] border-2 border-amber-400/55 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.22)] flex flex-col justify-between overflow-hidden select-none group">
            {/* Inner Cyan Hairline Frame */}
            <div className="absolute inset-2 rounded-[20px] border border-cyan-400/25 pointer-events-none" />
            {/* Ambient Cosmic Glow */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none" />

            {/* 1. TOP-LEVEL BRANDING HEADER: Official Sillow Mill Logo + Brand Name + CELOMILLE & ÄKINOYA UNIVERSE */}
            <div className="relative z-10 flex items-center justify-between gap-2 pb-2 border-b border-white/15">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/[0.06] border border-white/20 p-1.5 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(255,255,255,0.16)]">
                  <img
                    src={sillowMillLogoUrl}
                    alt="Sillow Mill Official Logo"
                    className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-[13px] font-display font-black tracking-[0.16em] text-white uppercase leading-none truncate drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                    SILLOW MILL
                  </div>
                  <div className="text-[7.5px] sm:text-[8px] font-mono font-extrabold text-white tracking-[0.14em] uppercase mt-1 truncate">
                    CELOMILLE · ÄKINOYA UNIVERSE
                  </div>
                </div>
              </div>

              {/* Unique Numbering Badge (#1, #2, etc.) */}
              <div className="shrink-0 px-2.5 py-1 rounded-xl bg-gradient-to-br from-amber-500/30 via-yellow-500/20 to-cyan-500/20 border border-amber-300/75 text-center shadow-[0_0_15px_rgba(251,191,36,0.35)]">
                <span className="block text-[6.5px] font-mono font-bold uppercase tracking-widest text-amber-200/90">
                  EDITION
                </span>
                <span className="block text-xs sm:text-sm font-display font-black bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent leading-tight">
                  #{meta.worldNumber}
                </span>
              </div>
            </div>

            {/* 2. PLANET TITLE, HOLDER INFO & SECTOR SPECIFICATIONS (Immediately below Top Branding Header) */}
            <div className="relative z-10 pt-1.5 pb-1.5 border-b border-cyan-400/20">
              <div className="inline-flex items-center gap-1 text-[8px] sm:text-[8.5px] font-mono font-extrabold text-amber-300 uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                <span className="truncate">
                  {meta.isAmlemi
                    ? 'FOUNDING PIONEER · GENESIS BENCHMARK'
                    : meta.isPioneer
                    ? 'PIONEER 2027 · PRE-RELEASE WORLD'
                    : 'VERIFIED PLANETARY ARCHIVE'}
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-display font-black text-white tracking-wide uppercase truncate mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                {dossier.planetName}
              </h4>
              <div className="text-[8.5px] sm:text-[9px] font-mono text-white/85 truncate mt-0.5">
                HOLDER:{' '}
                <strong className="text-white font-bold uppercase">
                  {dossier.authorName || 'ODI SELIS'}
                </strong>{' '}
                · <span className="text-cyan-300 font-bold">{dossier.sectorId || 'SECTOR AKN-01'}</span>
              </div>
            </div>

            {/* 3. Slick 5-Photo Vertical Collage */}
            <div
              onClick={() => onInspectDossier?.(dossier)}
              className="relative z-10 flex-1 my-2 flex flex-col gap-1.5 min-h-0 cursor-pointer"
              title="Click to inspect full-screen 5-Photo Dossier"
            >
              {/* Photo 01: Main Orbital Hero */}
              <div className="relative flex-[1.35] min-h-0 rounded-xl overflow-hidden border border-amber-400/55 bg-slate-950 shadow-md">
                {heroPhoto?.url && (
                  <img
                    src={heroPhoto.url}
                    alt={heroPhoto.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent pointer-events-none" />
                <div className="absolute top-1.5 left-2 px-1.5 py-0.5 rounded bg-black/75 border border-amber-400/40 text-[7px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                  01_MAIN · ORBITAL HORIZON
                </div>
                <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between gap-1">
                  <span className="text-[9.5px] font-sans font-bold text-white truncate">
                    {heroPhoto?.title || 'Orbital Horizon'}
                  </span>
                  <span className="text-[7.5px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-400/40 px-1.5 py-0.2 rounded">
                    4K VERIFIED
                  </span>
                </div>
              </div>

              {/* Photos 02 - 05: Symmetrical 2x2 Sub-Grid */}
              <div className="flex-[1.55] grid grid-cols-2 grid-rows-2 gap-1.5 min-h-0">
                {subPhotos.map((photo, idx) => {
                  const slotTags = ['02 · FLORA', '03 · FAUNA', '04 · CANOPY', '05 · LORE'];
                  return (
                    <div
                      key={photo.id}
                      className="relative rounded-lg overflow-hidden border border-cyan-400/35 bg-slate-950 min-h-0"
                    >
                      {photo.url && (
                        <img
                          src={photo.url}
                          alt={photo.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent pointer-events-none" />
                      <div className="absolute bottom-1 left-1.5 right-1.5">
                        <span className="block text-[6.5px] font-mono font-bold text-cyan-300 uppercase tracking-wider truncate">
                          {slotTags[idx]}
                        </span>
                        <span className="block text-[8px] font-sans font-semibold text-white truncate">
                          {photo.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Streamlined Minimalist Footer: Short Lore + Verification Code & Authentication Status (No QR) */}
            <div className="relative z-10 p-2.5 rounded-xl bg-[#071022]/90 border border-amber-400/35 space-y-1.5">
              <p className="text-[8.5px] sm:text-[9px] font-sans italic text-amber-100/95 line-clamp-2 leading-snug">
                &ldquo;
                {dossier.futurePromise ||
                  dossier.generatedLore ||
                  'Synthesized planetary archive bound to the Sillow Mill — Äkinoya universe.'}
                &rdquo;
              </p>

              <div className="px-2 py-1.5 rounded-lg bg-[#040914]/95 border border-cyan-400/35 flex items-center justify-between gap-1.5 text-[7.5px] sm:text-[8px] font-mono">
                <span className="text-cyan-300 font-bold truncate">
                  CODE: {meta.verificationCode}
                </span>
                <span className="text-emerald-400 font-bold shrink-0">● AUTHENTICATED</span>
              </div>

              <div className="flex items-center justify-between text-[7px] font-mono text-white/60 pt-0.5">
                <span className="text-white/80 font-semibold truncate">
                  SILLOW MILL · CELOMILLE
                </span>
                <span className="truncate">sillowmill.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Provenance Metadata, 5-Photo Manifest & Direct Share Controls */}
        <div className="lg:col-span-7 space-y-5">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#040916]/90 border border-cyan-500/30 space-y-4 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Cryptographic World Provenance
                </span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 font-bold">
                EDITION #{meta.worldNumber}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-white/45 block uppercase">REGISTERED WORLD</span>
                <span className="text-sm font-display font-bold text-white mt-0.5 block truncate">
                  {dossier.planetName} ({dossier.sectorId || 'SECTOR AKN-01'})
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-white/45 block uppercase">VERIFIED HOLDER</span>
                <span className="text-sm font-display font-bold text-amber-300 mt-0.5 block truncate">
                  {dossier.authorName}
                </span>
              </div>

              <div className="sm:col-span-2 p-3 rounded-xl bg-white/5 border border-cyan-400/30 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] text-cyan-300/75 block uppercase">
                    SECURE VERIFICATION CODE
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-extrabold text-cyan-200 truncate block mt-0.5">
                    {meta.verificationCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
                >
                  {isCopiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 5 Included Planetary Renders Strip */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[10.5px] font-mono text-white/65">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>5 INTEGRATED PLANETARY RENDERS IN 9:16 LAYOUT</span>
                </span>
                <span className="text-emerald-400 font-bold">5 / 5 SYNCHRONIZED</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {photoCards.slice(0, 5).map((card, i) => (
                  <div
                    key={card.id}
                    onClick={() => onInspectDossier?.(dossier)}
                    className="group/mini relative aspect-square rounded-lg overflow-hidden border border-white/15 hover:border-amber-400/70 cursor-pointer bg-black"
                  >
                    {card.url && (
                      <img
                        src={card.url}
                        alt={card.title}
                        className="w-full h-full object-cover group-hover/mini:scale-110 transition-transform"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 text-[8px] font-mono text-center text-amber-200 py-0.5 truncate px-0.5">
                      0{i + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Official Sillow Mill Signature Summary */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/30 via-[#060d1c] to-cyan-950/30 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={sillowMillLogoUrl}
                  alt="Sillow Mill"
                  className="w-9 h-9 object-contain shrink-0"
                />
                <div>
                  <div className="text-xs font-display font-bold text-white">
                    Sillow Mill · Celomille · Äkinoya Universe
                  </div>
                  <div className="text-[11px] font-mono text-white/60">
                    Formatted at 1080×1920 (9:16) for Instagram Stories, TikTok &amp; X.
                  </div>
                </div>
              </div>

              {isSimulationMode && onUnlockSimulation ? (
                <button
                  type="button"
                  onClick={onUnlockSimulation}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs font-extrabold uppercase tracking-wider cursor-pointer shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                >
                  Mint Your Own Badge →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadStoryBadge}
                  disabled={isExporting}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-mono text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <Globe2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Export 1080×1920 PNG</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldStoryVerificationBadge;
