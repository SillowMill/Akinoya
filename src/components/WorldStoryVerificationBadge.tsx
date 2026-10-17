import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Share2,
  ShieldCheck,
  Sparkles,
  Check,
  Copy,
  Camera,
  Film,
  Maximize2,
  X,
  Play,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PlanetSubmission } from '../types/contest';
import { getPlanetPhotoCards } from '../data/contest';
import { isFoundingPioneerPlanet, isPioneerPlanet } from '../utils/pioneer';
import { soundManager } from '../utils/audio';
import sillowMillLogoUrl from '../assets/images/Sillowmilllogo.png';

export type StoryViewMode = 'card' | 'trailer';

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
  h: number,
  zoom = 1,
  panX = 0,
  panY = 0
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

  const zoomedW = sw / zoom;
  const zoomedH = sh / zoom;
  const finalSx = sx + (sw - zoomedW) / 2 + panX * (sw - zoomedW) * 0.35;
  const finalSy = sy + (sh - zoomedH) / 2 + panY * (sh - zoomedH) * 0.35;

  ctx.drawImage(img, finalSx, finalSy, zoomedW, zoomedH, x, y, w, h);
}

/**
 * Renders the 1080x1920 (9:16) high-res Story Verification Affiche onto a Canvas and returns a Blob.
 * Features top-level SILLOW MILL / ÄKINOYA UNIVERSE branding, planet & holder specs,
 * 5-photo collage, and streamlined footer with Sillowmilllogo.png in the bottom-left corner (no QR code).
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

  const bottomGlow = ctx.createRadialGradient(W * 0.3, H - 220, 20, W * 0.3, H - 220, 560);
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

  // 2. Top-Level Branding Header: Official "SILLOW MILL" Logo + Brand Name + "ÄKINOYA UNIVERSE"
  const brandHeaderY = 80;
  const logoFrameSize = 108;

  drawRoundedRect(ctx, contentX, brandHeaderY, logoFrameSize, logoFrameSize, 22);
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

  const brandTextX = contentX + logoFrameSize + 26;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px "Inter", sans-serif';
  ctx.fillText('SILLOW MILL', brandTextX, brandHeaderY + 44);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillText('ÄKINOYA UNIVERSE', brandTextX, brandHeaderY + 78);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.font = '600 15px "JetBrains Mono", monospace';
  ctx.fillText('OFFICIAL PLANETARY VERIFICATION AFFICHE', brandTextX, brandHeaderY + 103);

  // Unique Edition Number Badge (Top Right alongside Branding Header)
  const badgeW = 196;
  const badgeH = 100;
  const badgeX = W - 84 - badgeW;
  const badgeY = brandHeaderY + 4;
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
  ctx.font = '900 40px "Inter", sans-serif';
  ctx.fillText(`#${meta.worldNumber}`, badgeX + badgeW / 2, badgeY + 80);
  ctx.textAlign = 'left';

  // Divider below Top-Level Branding Header
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(contentX, 212);
  ctx.lineTo(W - contentX, 212);
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
    248
  );

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 60px "Inter", sans-serif';
  ctx.fillText((dossier.planetName || 'ÄMLEMI').toUpperCase(), contentX, 312);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  const holderLine = `HOLDER: ${(dossier.authorName || 'ODI SELIS').toUpperCase()}   ·   ${(
    dossier.sectorId || 'SECTOR AKN-01'
  ).toUpperCase()}`;
  ctx.fillText(holderLine, contentX, 350);

  // Subtle divider above 5-Photo Collage
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(contentX, 372);
  ctx.lineTo(W - contentX, 372);
  ctx.stroke();

  // 4. Artistic 5-Photo Collage (01 Main Hero + 2x2 Grid for 02, 03, 04, 05)
  const heroY = 394;
  const heroH = 456;

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
  const gridY = heroY + heroH + 20; // 870
  const gap = 20;
  const cellW = (contentW - gap) / 2; // 446px
  const cellH = 262;
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

  // 5. Lore Summary & Verification Code Box
  const loreBoxY = gridY + cellH * 2 + gap + 22; // 1436
  const loreBoxH = 222;
  drawRoundedRect(ctx, contentX, loreBoxY, contentW, loreBoxH, 22);
  ctx.fillStyle = 'rgba(8, 17, 34, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 17px "JetBrains Mono", monospace';
  ctx.fillText('ARCHIVAL LORE SUMMARY & CRYPTOGRAPHIC VERIFICATION', contentX + 26, loreBoxY + 38);

  const rawLore =
    dossier.futurePromise ||
    dossier.generatedLore ||
    'Synthesized planetary ecosystem verified within the official Sillow Mill — Äkinoya galaxy archive.';
  const cleanLore = `"${rawLore.replace(/\s+/g, ' ').trim()}"`;
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'italic 22px "Inter", sans-serif';
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
  ctx.fillText(line1.trim(), contentX + 26, loreBoxY + 80);
  if (line2) {
    ctx.fillText(line2.trim(), contentX + 26, loreBoxY + 114);
  }

  // Minimalist Verification Bar inside Lore Box
  const verifyBarY = loreBoxY + 142;
  const verifyBarH = 58;
  drawRoundedRect(ctx, contentX + 26, verifyBarY, contentW - 52, verifyBarH, 14);
  ctx.fillStyle = 'rgba(4, 9, 20, 0.96)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#67e8f9';
  ctx.font = 'bold 19px "JetBrains Mono", monospace';
  ctx.fillText(`VERIFICATION CODE: ${meta.verificationCode}`, contentX + 48, verifyBarY + 36);

  ctx.fillStyle = '#34d399';
  ctx.textAlign = 'right';
  ctx.fillText('● AUTHENTICATED', contentX + contentW - 48, verifyBarY + 36);
  ctx.textAlign = 'left';

  // 6. Streamlined Bottom-Left Sillow Mill Logo & Minimalist Footer (No QR Code)
  const footerY = 1684;
  if (logoImg) {
    const targetH = 104;
    const targetW = (logoImg.width / Math.max(1, logoImg.height)) * targetH;
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.38)';
    ctx.shadowBlur = 16;
    ctx.drawImage(logoImg, contentX, footerY + 10, targetW, targetH);
    ctx.restore();

    const textStartX = contentX + targetW + 26;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px "Inter", sans-serif';
    ctx.fillText('SILLOW MILL', textStartX, footerY + 48);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.fillText('ÄKINOYA UNIVERSE', textStartX, footerY + 80);

    ctx.fillStyle = 'rgba(203, 213, 225, 0.78)';
    ctx.font = '500 17px "JetBrains Mono", monospace';
    ctx.fillText('sillowmill.com · Official Proof of World Ownership', textStartX, footerY + 108);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px "Inter", sans-serif';
    ctx.fillText('SILLOW MILL', contentX, footerY + 52);
    ctx.fillStyle = 'rgba(203, 213, 225, 0.8)';
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.fillText('ÄKINOYA UNIVERSE · SILLOWMILL.COM', contentX, footerY + 88);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}

/**
 * Draws a single frame of the 9:16 Orbital Trailer Loop onto a Canvas (used for both live preview and MP4 export).
 * Embeds top-level SILLOW MILL / ÄKINOYA UNIVERSE branding and bottom-left Sillowmilllogo.png.
 */
function drawTrailerFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  progress: number, // 0..1 over 5.0 seconds
  dossier: PlanetSubmission,
  meta: ReturnType<typeof deriveWorldVerificationMeta>,
  photoCards: ReturnType<typeof getPlanetPhotoCards>,
  loadedPhotos: (HTMLImageElement | null)[],
  logoImg: HTMLImageElement | null
) {
  const validPhotos = loadedPhotos.filter((p): p is HTMLImageElement => Boolean(p));
  const totalSlides = Math.max(1, validPhotos.length);
  const floatIdx = progress * totalSlides;
  const activeIdx = Math.floor(floatIdx) % totalSlides;
  const nextIdx = (activeIdx + 1) % totalSlides;
  const localT = floatIdx - Math.floor(floatIdx);

  // Smooth crossfade during last 22% of each slide
  const fadeAlpha = localT > 0.78 ? (localT - 0.78) / 0.22 : 0;

  // Background fill
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, W, H);

  // Full-bleed animated planetary render with smooth Ken Burns orbital drift
  if (validPhotos[activeIdx]) {
    const zoomA = 1.03 + localT * 0.1;
    const panXA = Math.sin(progress * Math.PI * 2) * 0.4;
    const panYA = Math.cos(progress * Math.PI * 2) * 0.3;
    ctx.save();
    ctx.globalAlpha = 1;
    drawCoverImage(ctx, validPhotos[activeIdx], 0, 0, W, H, zoomA, panXA, panYA);
    ctx.restore();
  }

  if (fadeAlpha > 0 && validPhotos[nextIdx]) {
    const zoomB = 1.03 + (localT - 0.78) * 0.08;
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, fadeAlpha));
    drawCoverImage(ctx, validPhotos[nextIdx], 0, 0, W, H, zoomB, 0, 0);
    ctx.restore();
  }

  // Cinematic top & bottom dark gradient vignettes for crisp HUD legibility
  const topVignette = ctx.createLinearGradient(0, 0, 0, H * 0.34);
  topVignette.addColorStop(0, 'rgba(3, 7, 18, 0.92)');
  topVignette.addColorStop(0.65, 'rgba(3, 7, 18, 0.55)');
  topVignette.addColorStop(1, 'rgba(3, 7, 18, 0)');
  ctx.fillStyle = topVignette;
  ctx.fillRect(0, 0, W, H * 0.34);

  const bottomVignette = ctx.createLinearGradient(0, H * 0.58, 0, H);
  bottomVignette.addColorStop(0, 'rgba(3, 7, 18, 0)');
  bottomVignette.addColorStop(0.45, 'rgba(3, 7, 18, 0.78)');
  bottomVignette.addColorStop(1, 'rgba(2, 5, 12, 0.96)');
  ctx.fillStyle = bottomVignette;
  ctx.fillRect(0, H * 0.58, W, H * 0.42);

  // Subtle Sci-Fi Outer Frame
  const pad = Math.round(W * 0.038);
  drawRoundedRect(ctx, pad, pad, W - pad * 2, H - pad * 2, Math.round(W * 0.032));
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = Math.max(1.5, W * 0.0022);
  ctx.stroke();

  const s = W / 1080; // Scale factor relative to 1080x1920
  const contentX = Math.round(78 * s);
  const contentW = W - contentX * 2;

  // TOP-LEVEL BRANDING HEADER
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(38 * s)}px "Inter", sans-serif`;
  ctx.fillText('SILLOW MILL', contentX, Math.round(112 * s));

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(19 * s)}px "JetBrains Mono", monospace`;
  ctx.fillText('ÄKINOYA UNIVERSE', contentX, Math.round(146 * s));

  // Top-right Edition Pill
  const badgeW = Math.round(180 * s);
  const badgeH = Math.round(76 * s);
  const badgeX = W - contentX - badgeW;
  const badgeY = Math.round(78 * s);
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, Math.round(18 * s));
  ctx.fillStyle = 'rgba(10, 18, 36, 0.78)';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = Math.max(1.5, 2 * s);
  ctx.stroke();

  ctx.fillStyle = '#fde68a';
  ctx.font = `900 ${Math.round(32 * s)}px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`#${meta.worldNumber}`, badgeX + badgeW / 2, badgeY + Math.round(50 * s));
  ctx.textAlign = 'left';

  // Planet Title & Holder Info Directly Below Top Branding
  ctx.fillStyle = '#fbbf24';
  ctx.font = `bold ${Math.round(18 * s)}px "JetBrains Mono", monospace`;
  ctx.fillText(
    meta.isAmlemi
      ? '★ FOUNDING PIONEER · 9:16 ORBITAL TRAILER'
      : '★ VERIFIED WORLD · 9:16 ORBITAL TRAILER',
    contentX,
    Math.round(202 * s)
  );

  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(56 * s)}px "Inter", sans-serif`;
  ctx.fillText((dossier.planetName || 'ÄMLEMI').toUpperCase(), contentX, Math.round(264 * s));

  ctx.fillStyle = '#e2e8f0';
  ctx.font = `bold ${Math.round(21 * s)}px "JetBrains Mono", monospace`;
  ctx.fillText(
    `HOLDER: ${(dossier.authorName || 'ODI SELIS').toUpperCase()}  ·  ${(
      dossier.sectorId || 'SECTOR AKN-01'
    ).toUpperCase()}`,
    contentX,
    Math.round(300 * s)
  );

  // Active Archive Slot Telemetry Pill (Bottom-Area above Footer)
  const slotCard = photoCards[activeIdx] || photoCards[0];
  const slotLabels = [
    '01_MAIN · ORBITAL HORIZON',
    '02_FLORA · BOTANICAL BIOME',
    '03_FAUNA · APEX SPECIMEN',
    '04_CANOPY · COCKPIT DESCENT',
    '05_LORE · SACRED MONUMENT',
  ];
  const telemetryY = Math.round(1450 * s);
  drawRoundedRect(ctx, contentX, telemetryY, contentW, Math.round(148 * s), Math.round(20 * s));
  ctx.fillStyle = 'rgba(6, 13, 28, 0.84)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.42)';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.stroke();

  ctx.fillStyle = '#67e8f9';
  ctx.font = `bold ${Math.round(17 * s)}px "JetBrains Mono", monospace`;
  ctx.fillText(slotLabels[activeIdx] || '01_MAIN · ORBITAL HORIZON', contentX + Math.round(26 * s), telemetryY + Math.round(42 * s));

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(28 * s)}px "Inter", sans-serif`;
  ctx.fillText(slotCard?.title || dossier.planetName, contentX + Math.round(26 * s), telemetryY + Math.round(82 * s));

  ctx.fillStyle = '#fbbf24';
  ctx.font = `bold ${Math.round(18 * s)}px "JetBrains Mono", monospace`;
  ctx.fillText(`CODE: ${meta.verificationCode}`, contentX + Math.round(26 * s), telemetryY + Math.round(122 * s));

  ctx.fillStyle = '#34d399';
  ctx.textAlign = 'right';
  ctx.fillText('● AUTHENTICATED', contentX + contentW - Math.round(26 * s), telemetryY + Math.round(122 * s));
  ctx.textAlign = 'left';

  // Progress Bar across bottom of telemetry card
  const barX = contentX + Math.round(26 * s);
  const barY = telemetryY + Math.round(136 * s);
  const barW = contentW - Math.round(52 * s);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(barX, barY, barW, Math.max(2, Math.round(4 * s)));
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(barX, barY, barW * progress, Math.max(2, Math.round(4 * s)));

  // BOTTOM-LEFT EMBEDDED SILLOW MILL LOGO & BRAND SIGNATURE
  const footerY = Math.round(1640 * s);
  if (logoImg) {
    const targetH = Math.round(112 * s);
    const targetW = (logoImg.width / Math.max(1, logoImg.height)) * targetH;
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
    ctx.shadowBlur = 16 * s;
    ctx.drawImage(logoImg, contentX, footerY, targetW, targetH);
    ctx.restore();

    const textStartX = contentX + targetW + Math.round(24 * s);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(34 * s)}px "Inter", sans-serif`;
    ctx.fillText('SILLOW MILL', textStartX, footerY + Math.round(42 * s));

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(18 * s)}px "JetBrains Mono", monospace`;
    ctx.fillText('ÄKINOYA UNIVERSE', textStartX, footerY + Math.round(74 * s));

    ctx.fillStyle = 'rgba(203, 213, 225, 0.82)';
    ctx.font = `500 ${Math.round(17 * s)}px "JetBrains Mono", monospace`;
    ctx.fillText('sillowmill.com · 9:16 Orbital World Trailer', textStartX, footerY + Math.round(104 * s));
  }
}

/**
 * Generates and downloads a 9:16 video trailer loop with the official Sillow Mill logo embedded in the bottom-left corner.
 */
export async function exportWorldTrailerVideoBlob(
  dossier: PlanetSubmission,
  editionRank?: number
): Promise<{ blob: Blob; ext: string } | null> {
  const W = 720;
  const H = 1280;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const meta = deriveWorldVerificationMeta(dossier, editionRank);
  const photoCards = getPlanetPhotoCards(dossier);

  const [loadedPhotos, logoImg] = await Promise.all([
    Promise.all(photoCards.slice(0, 5).map((c) => loadImageForCanvas(c.url))),
    loadImageForCanvas(sillowMillLogoUrl),
  ]);

  if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
    return null;
  }

  const candidateTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const supportedMime =
    candidateTypes.find((t) => {
      try {
        return MediaRecorder.isTypeSupported(t);
      } catch {
        return false;
      }
    }) || '';

  const stream = canvas.captureStream(30);
  const recorder = supportedMime
    ? new MediaRecorder(stream, { mimeType: supportedMime, videoBitsPerSecond: 6_000_000 })
    : new MediaRecorder(stream);

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: supportedMime || 'video/mp4' });
      resolve({ blob: finalBlob, ext: 'mp4' });
    };

    recorder.start();
    const durationMs = 5000;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      drawTrailerFrame(ctx, W, H, progress, dossier, meta, photoCards, loadedPhotos, logoImg);

      if (elapsed < durationMs) {
        requestAnimationFrame(step);
      } else {
        recorder.stop();
      }
    };

    requestAnimationFrame(step);
  });
}

/**
 * Dynamic Val.ai / Fal.ai Video Hook:
 * - Keeps the automated 5-photo zoom slideshow montage as the active fallback.
 * - Dynamically verifies against the Val.ai API pipeline; once topped up and synthesized,
 *   automatically promotes the production AI video across all dossier views and downloads.
 */
export function useDynamicWorldVideo(dossier: PlanetSubmission | null | undefined) {
  const initialUrl =
    dossier?.videoUrl ||
    dossier?.renders?.videoUrl ||
    dossier?.renders?.video_url ||
    (dossier?.humanAnswers as any)?.video_url ||
    '';

  const [videoUrl, setVideoUrl] = useState<string>(initialUrl);
  const [pipelineMode, setPipelineMode] = useState<'PRODUCTION_AI_VIDEO' | 'FALLBACK_SLIDESHOW_MONTAGE'>(
    initialUrl ? 'PRODUCTION_AI_VIDEO' : 'FALLBACK_SLIDESHOW_MONTAGE'
  );
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    const currentInit =
      dossier?.videoUrl ||
      dossier?.renders?.videoUrl ||
      dossier?.renders?.video_url ||
      (dossier?.humanAnswers as any)?.video_url ||
      '';

    if (currentInit) {
      setVideoUrl(currentInit);
      setPipelineMode('PRODUCTION_AI_VIDEO');
      return;
    }

    if (!dossier) return;

    let isSubscribed = true;
    setIsChecking(true);

    const checkDynamicVideo = async () => {
      try {
        const heroUrl = dossier.renders?.hero || dossier.renders?.['01_main'] || '';
        const res = await fetch('/api/video-pipeline/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planetId: dossier.id,
            planetName: dossier.planetName,
            heroImageUrl: heroUrl,
            existingVideoUrl: currentInit,
          }),
        });

        if (!res.ok) return;
        const data = await res.json();
        if (isSubscribed && data?.success) {
          if (data.isAiVideoAvailable && data.videoUrl) {
            setVideoUrl(data.videoUrl);
            setPipelineMode('PRODUCTION_AI_VIDEO');
          } else {
            setPipelineMode('FALLBACK_SLIDESHOW_MONTAGE');
          }
        }
      } catch {
        // Fallback remains active
      } finally {
        if (isSubscribed) setIsChecking(false);
      }
    };

    checkDynamicVideo();

    return () => {
      isSubscribed = false;
    };
  }, [dossier?.id, dossier?.videoUrl, dossier?.renders?.hero]);

  return {
    videoUrl,
    isAiVideo: Boolean(videoUrl && pipelineMode === 'PRODUCTION_AI_VIDEO'),
    pipelineMode,
    isChecking,
  };
}

/**
 * Live 9:16 Orbital Trailer Canvas/Video Player component with embedded Sillowmilllogo.png in the bottom-left corner.
 */
export const LiveStoryTrailerViewport: React.FC<{
  dossier: PlanetSubmission;
  meta: ReturnType<typeof deriveWorldVerificationMeta>;
  photoCards: ReturnType<typeof getPlanetPhotoCards>;
  activeVideoUrl?: string;
}> = ({ dossier, meta, photoCards, activeVideoUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoUrl =
    activeVideoUrl ||
    dossier.videoUrl ||
    dossier.renders?.videoUrl ||
    dossier.renders?.video_url ||
    '';

  useEffect(() => {
    let rafId = 0;
    let isCancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    Promise.all([
      Promise.all(photoCards.slice(0, 5).map((c) => loadImageForCanvas(c.url))),
      loadImageForCanvas(sillowMillLogoUrl),
    ]).then(([loadedPhotos, logoImg]) => {
      if (isCancelled) return;
      const loopDuration = 6500;
      const start = performance.now();

      const renderLoop = (now: number) => {
        if (isCancelled) return;
        const progress = ((now - start) % loopDuration) / loopDuration;
        drawTrailerFrame(
          ctx,
          canvas.width,
          canvas.height,
          progress,
          dossier,
          meta,
          photoCards,
          loadedPhotos,
          logoImg
        );
        rafId = requestAnimationFrame(renderLoop);
      };

      rafId = requestAnimationFrame(renderLoop);
    });

    return () => {
      isCancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [dossier, meta, photoCards]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-[22px] bg-[#030712]">
      {videoUrl ? (
        <div className="relative w-full h-full">
          <video
            src={videoUrl}
            poster={photoCards[0]?.url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Top-level & Bottom-left Branded Overlay on native MP4 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none" />
          <div className="absolute top-3 left-3.5 right-3.5 flex items-start justify-between gap-2 pointer-events-none">
            <div>
              <div className="text-xs font-display font-black tracking-[0.15em] text-white uppercase">
                SILLOW MILL
              </div>
              <div className="text-[8px] font-mono font-bold text-white tracking-[0.12em] uppercase">
                ÄKINOYA UNIVERSE
              </div>
              <div className="text-sm font-display font-black text-amber-300 uppercase mt-0.5">
                {dossier.planetName}
              </div>
              <div className="text-[7.5px] font-mono text-cyan-300 mt-0.5">
                HOLDER: {(dossier.authorName || 'ODI SELIS').toUpperCase()} · {dossier.sectorId || 'SECTOR AKN-01'}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-black/75 border border-amber-400/60 text-[10px] font-mono font-extrabold text-amber-300">
              #{meta.worldNumber}
            </span>
          </div>

          <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between gap-2 pointer-events-none">
            <div className="flex items-center gap-2">
              <img
                src={sillowMillLogoUrl}
                alt="Sillow Mill Logo"
                className="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              />
              <div>
                <div className="text-[10px] font-display font-black text-white tracking-wider uppercase">
                  SILLOW MILL
                </div>
                <div className="text-[7.5px] font-mono text-cyan-300 font-bold">
                  {meta.verificationCode}
                </div>
              </div>
            </div>
            <span className="text-[8px] font-mono font-bold text-emerald-400">
              ● 9:16 LOOP
            </span>
          </div>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={540}
          height={960}
          className="w-full h-full object-cover block"
        />
      )}
    </div>
  );
};

export const WorldStoryVerificationBadge: React.FC<WorldStoryVerificationBadgeProps> = ({
  dossier,
  editionRank,
  isSimulationMode = false,
  onUnlockSimulation,
}) => {
  const [activeViewMode, setActiveViewMode] = useState<StoryViewMode>('card');
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isExportingBadge, setIsExportingBadge] = useState(false);
  const [isExportingTrailer, setIsExportingTrailer] = useState(false);
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Dynamic Val.ai / Fal.ai Video Pipeline check & automatic promotion
  const dynamicVideo = useDynamicWorldVideo(dossier);

  const photoCards = useMemo(() => getPlanetPhotoCards(dossier), [dossier]);
  const meta = useMemo(
    () => deriveWorldVerificationMeta(dossier, editionRank),
    [dossier, editionRank]
  );

  // Close Fullscreen Viewer on Escape key & Left/Right arrow navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreenOpen) {
        setIsFullscreenOpen(false);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (isFullscreenOpen) {
          e.preventDefault();
          soundManager.playTone(640, 0.04);
          setActiveViewMode((prev) => (prev === 'card' ? 'trailer' : 'card'));
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreenOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      soundManager.playTone(640, 0.04);
      setActiveViewMode((prev) => (prev === 'card' ? 'trailer' : 'card'));
    }
  };

  const handleToggleViewMode = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundManager.playTone(650, 0.04);
    setActiveViewMode((prev) => (prev === 'card' ? 'trailer' : 'card'));
  };

  const handleCopyCode = () => {
    soundManager.playTone(720, 0.05);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(meta.verificationCode);
      setIsCopiedCode(true);
      setTimeout(() => setIsCopiedCode(false), 2200);
    }
  };

  const handleDownloadStoryBadge = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundManager.playTone(780, 0.07);
    setIsExportingBadge(true);
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
      setIsExportingBadge(false);
    }
  };

  const handleDownloadTrailerMp4 = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundManager.playTone(740, 0.07);
    setIsExportingTrailer(true);
    const safeName = (dossier.planetName || 'akinoya-world')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-');

    try {
      // 1. If dynamic Val.ai production AI video is active, download it directly
      const activeVideoUrl =
        dynamicVideo.videoUrl ||
        dossier.videoUrl ||
        dossier.renders?.videoUrl ||
        dossier.renders?.video_url ||
        '';

      if (activeVideoUrl) {
        try {
          const response = await fetch(activeVideoUrl);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sillowmill-${safeName}-9x16-trailer.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        } catch {
          window.open(activeVideoUrl, '_blank', 'noopener,noreferrer');
          return;
        }
      }

      // 2. Active Fallback: Automated 5-photo zoom slideshow montage
      const result = await exportWorldTrailerVideoBlob(dossier, editionRank);
      if (result?.blob) {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sillowmill-${safeName}-9x16-trailer.${result.ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExportingTrailer(false);
    }
  };

  const handleShareStoryBadge = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundManager.playTone(840, 0.07);
    setIsExportingBadge(true);
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
      setIsExportingBadge(false);
    }
  };

  const heroPhoto = photoCards[0];
  const subPhotos = photoCards.slice(1, 5);

  /**
   * Reusable 9:16 Story Card & Trailer Viewport content (used both inline and in Fullscreen Viewer Modal).
   */
  const renderStoryAfficheCard = (isInsideModal = false) => (
    <div className={`relative w-full ${isInsideModal ? 'max-w-[400px] sm:max-w-[430px]' : 'max-w-[350px] sm:max-w-[375px]'} flex items-center justify-center`}>
      {/* Sleek Side Chevron Arrow Navigation (Desktop & Mobile) */}
      <button
        type="button"
        onClick={handleToggleViewMode}
        className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#050a18]/90 hover:bg-[#081226] border border-amber-400/50 hover:border-amber-300 text-amber-300 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.8),0_0_10px_rgba(245,158,11,0.3)] cursor-pointer"
        aria-label="Toggle to Previous / Alternate View"
        title="Toggle between 9:16 Story Card and 9:16 MP4 Trailer"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
      </button>

      <button
        type="button"
        onClick={handleToggleViewMode}
        className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#050a18]/90 hover:bg-[#081226] border border-cyan-400/50 hover:border-cyan-300 text-cyan-300 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.8),0_0_10px_rgba(6,182,212,0.3)] cursor-pointer"
        aria-label="Toggle to Next / Alternate View"
        title="Toggle between 9:16 Story Card and 9:16 MP4 Trailer"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
      </button>

      <div
        onClick={() => {
          if (!isInsideModal) {
            soundManager.playTone(680, 0.05);
            setIsFullscreenOpen(true);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full aspect-[9/16] rounded-[26px] p-3.5 sm:p-4 bg-gradient-to-b from-[#040915] via-[#060d1f] to-[#02050b] border-2 border-amber-400/60 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.22)] flex flex-col justify-between overflow-hidden select-none group transition-transform duration-300 ${
          !isInsideModal ? 'cursor-pointer hover:scale-[1.01] hover:border-amber-300' : ''
        }`}
        title={!isInsideModal ? 'Click to open Fullscreen 9:16 Card & Trailer Viewer (Swipe or click arrows to toggle)' : undefined}
      >
        {/* Inner Cyan Hairline Frame */}
        <div className="absolute inset-2 rounded-[20px] border border-cyan-400/25 pointer-events-none z-20" />
        {/* Ambient Cosmic Glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none" />

        <AnimatePresence mode="wait">
          {activeViewMode === 'trailer' ? (
            <motion.div
              key="view-trailer"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="relative w-full h-full flex flex-col"
            >
              <LiveStoryTrailerViewport
                dossier={dossier}
                meta={meta}
                photoCards={photoCards}
                activeVideoUrl={dynamicVideo.videoUrl}
              />
            </motion.div>
          ) : (
            <motion.div
              key="view-card"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="relative w-full h-full flex flex-col justify-between"
            >
              {/* 1. TOP-LEVEL BRANDING HEADER: SILLOW MILL & ÄKINOYA UNIVERSE */}
              <div className="relative z-10 flex items-center justify-between gap-2 pb-2 border-b border-white/15">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.06] border border-white/20 p-1.5 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(255,255,255,0.16)]">
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
                    <div className="text-[7.5px] sm:text-[8px] font-mono font-extrabold text-white tracking-[0.13em] uppercase mt-1 truncate">
                      ÄKINOYA UNIVERSE
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
              <div className="relative z-10 flex-1 my-1.5 flex flex-col gap-1.5 min-h-0">
                {/* Photo 01: Main Orbital Hero */}
                <div className="relative flex-[1.3] min-h-0 rounded-xl overflow-hidden border border-amber-400/55 bg-slate-950 shadow-md">
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
                    <span className="text-[7px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-400/40 px-1.5 py-0.2 rounded">
                      4K VERIFIED
                    </span>
                  </div>
                </div>

                {/* Photos 02 - 05: Symmetrical 2x2 Sub-Grid */}
                <div className="flex-[1.5] grid grid-cols-2 grid-rows-2 gap-1.5 min-h-0">
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

              {/* 4. Streamlined Minimalist Footer with Bottom-Left Embedded Sillow Mill Logo & Verification Code (No QR) */}
              <div className="relative z-10 p-2 rounded-xl bg-[#071022]/90 border border-amber-400/35 space-y-1.5">
                <p className="text-[8px] sm:text-[8.5px] font-sans italic text-amber-100/95 line-clamp-1 leading-snug">
                  &ldquo;
                  {dossier.futurePromise ||
                    dossier.generatedLore ||
                    'Synthesized planetary archive bound to the Sillow Mill — Äkinoya universe.'}
                  &rdquo;
                </p>

                <div className="px-2 py-1 rounded-lg bg-[#040914]/95 border border-cyan-400/35 flex items-center justify-between gap-1.5 text-[7.5px] font-mono">
                  <span className="text-cyan-300 font-bold truncate">
                    CODE: {meta.verificationCode}
                  </span>
                  <span className="text-emerald-400 font-bold shrink-0">● AUTHENTICATED</span>
                </div>

                {/* Bottom-Left Embedded Sillowmilllogo.png */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <img
                      src={sillowMillLogoUrl}
                      alt="Sillow Mill Logo"
                      className="w-5 h-5 object-contain shrink-0 drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]"
                    />
                    <span className="text-[7.5px] font-display font-black tracking-[0.12em] text-white uppercase truncate">
                      SILLOW MILL
                    </span>
                  </div>
                  <span className="text-[7px] font-mono text-white/60 shrink-0">sillowmill.com</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-950/45 via-[#050a14]/85 to-[#030710]/95 backdrop-blur-xl border border-amber-400/40 p-5 sm:p-6 md:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_30px_rgba(245,158,11,0.14)]">
        {/* Top Specular Highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/65 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header + Dual High-End Download Buttons */}
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 mb-6 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono font-extrabold uppercase tracking-wider text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>9:16 STORY &amp; TRAILER VERIFICATION HUB</span>
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
              Click the 9:16 card to launch the Fullscreen Viewer or toggle seamlessly between the <strong>9:16 Story Verification Card</strong> and the <strong>9:16 MP4 Trailer Loop</strong>.
            </p>
          </div>

          {/* Dual Prominent High-End Action Buttons Side-by-Side */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleDownloadStoryBadge}
              disabled={isExportingBadge}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs font-extrabold tracking-wide transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] min-h-[44px]"
            >
              <Download className="w-4 h-4 text-black shrink-0" />
              <span>{isExportingBadge ? 'Rendering 9:16 PNG...' : 'Download 9:16 Story Badge'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTrailerMp4}
              disabled={isExportingTrailer}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 hover:from-cyan-300 hover:to-sky-300 text-black font-mono text-xs font-extrabold tracking-wide transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] min-h-[44px]"
            >
              <Film className="w-4 h-4 text-black shrink-0" />
              <span>{isExportingTrailer ? 'Encoding 9:16 MP4...' : 'Download 9:16 MP4 Trailer'}</span>
            </button>
          </div>
        </div>

        {/* Main Layout: Left 9:16 Interactive Vertical Story Affiche + View Toggle | Right Provenance Details */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-center">
          {/* Left Column: Interactive 9:16 View Toggle + Click-to-Fullscreen Card */}
          <div className="lg:col-span-5 flex flex-col items-center space-y-3.5">
            {/* Interactive 9:16 View Switcher Bar */}
            <div className="w-full max-w-[350px] sm:max-w-[375px] p-1 rounded-xl bg-[#040814]/90 border border-white/15 grid grid-cols-2 gap-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  soundManager.playTone(620, 0.04);
                  setActiveViewMode('card');
                }}
                className={`py-2 px-3 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeViewMode === 'card'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span>9:16 Story Card</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playTone(660, 0.04);
                  setActiveViewMode('trailer');
                }}
                className={`py-2 px-3 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeViewMode === 'trailer'
                    ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5 shrink-0" />
                <span>9:16 MP4 Trailer</span>
              </button>
            </div>

            {/* 9:16 Card / Trailer Viewport (Clicking opens Fullscreen Card Viewer) */}
            {renderStoryAfficheCard(false)}

            {/* Fullscreen Viewer Launch Pill */}
            <button
              type="button"
              onClick={() => {
                soundManager.playTone(680, 0.05);
                setIsFullscreenOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-amber-400/35 text-[11px] font-mono font-bold text-amber-200 hover:text-white transition-all cursor-pointer shadow-md"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Open Fullscreen 9:16 Viewer &amp; Switcher</span>
            </button>
          </div>

          {/* Right Column: Provenance Metadata, 5-Photo Manifest & Dual Downloads */}
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

              {/* 5 Included Planetary Renders Strip (Clicking opens Fullscreen 9:16 Card Viewer) */}
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
                      onClick={() => {
                        soundManager.playTone(680, 0.05);
                        setIsFullscreenOpen(true);
                      }}
                      className="group/mini relative aspect-square rounded-lg overflow-hidden border border-white/15 hover:border-amber-400/70 cursor-pointer bg-black"
                      title="Open Fullscreen 9:16 Verification Viewer"
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

              {/* Dual Download & Fullscreen Action Footer */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/30 via-[#060d1c] to-cyan-950/30 border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={sillowMillLogoUrl}
                      alt="Sillow Mill"
                      className="w-9 h-9 object-contain shrink-0 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-display font-bold text-white truncate">
                        Sillow Mill · Äkinoya Universe
                      </div>
                      <div className="text-[11px] font-mono text-white/60 truncate">
                        Embedded bottom-left logo on both 9:16 Story Badge &amp; 9:16 MP4 Trailer.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleShareStoryBadge}
                    disabled={isExportingBadge}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-cyan-200 hover:text-white font-mono text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Share</span>
                  </button>
                </div>

                {/* Prominent Side-by-Side Download Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadStoryBadge}
                    disabled={isExportingBadge}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs font-extrabold tracking-wide cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(245,158,11,0.3)] min-h-[44px]"
                  >
                    <Download className="w-4 h-4 text-black shrink-0" />
                    <span>{isExportingBadge ? 'Rendering PNG...' : 'Download 9:16 Story Badge'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTrailerMp4}
                    disabled={isExportingTrailer}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 hover:from-cyan-300 hover:to-sky-300 text-black font-mono text-xs font-extrabold tracking-wide cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(6,182,212,0.3)] min-h-[44px]"
                  >
                    <Film className="w-4 h-4 text-black shrink-0" />
                    <span>{isExportingTrailer ? 'Encoding MP4...' : 'Download 9:16 MP4 Trailer'}</span>
                  </button>
                </div>

                {isSimulationMode && onUnlockSimulation && (
                  <button
                    type="button"
                    onClick={onUnlockSimulation}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-950/60 hover:bg-amber-900/70 border border-amber-400/50 text-amber-200 font-mono text-xs font-extrabold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Claim Your Golden Ticket &amp; Mint Your Own Badge →</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* FULLSCREEN 9:16 CARD & TRAILER VIEWER MODAL (PORTAL OVERLAY)          */}
      {/* ===================================================================== */}
      {isFullscreenOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/92 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-6 overflow-y-auto"
            onClick={() => setIsFullscreenOpen(false)}
          >
            {/* Top Modal Bar: View Switcher & Close */}
            <div
              className="w-full max-w-3xl flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5">
                <img
                  src={sillowMillLogoUrl}
                  alt="Sillow Mill"
                  className="w-7 h-7 object-contain"
                />
                <div>
                  <span className="text-xs font-display font-black tracking-wider text-white uppercase block">
                    {dossier.planetName} · 9:16 Verification Viewer
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300">
                    EDITION #{meta.worldNumber} · {meta.verificationCode}
                  </span>
                </div>
              </div>

              {/* Seamless 9:16 View Switcher inside Fullscreen Modal */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#070d1c] border border-white/15">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playTone(620, 0.04);
                    setActiveViewMode('card');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeViewMode === 'card'
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>9:16 Story Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playTone(660, 0.04);
                    setActiveViewMode('trailer');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeViewMode === 'trailer'
                      ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>9:16 MP4 Trailer</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsFullscreenOpen(false)}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close Fullscreen Viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Center 9:16 Card / Trailer Viewport */}
            <div
              className="my-auto py-4 w-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {renderStoryAfficheCard(true)}
            </div>

            {/* Bottom Dual Action Bar inside Fullscreen Viewer */}
            <div
              className="w-full max-w-2xl pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleDownloadStoryBadge}
                disabled={isExportingBadge}
                className="flex-1 min-w-[220px] py-3 px-5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs font-extrabold tracking-wide cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)] min-h-[46px]"
              >
                <Download className="w-4 h-4 text-black shrink-0" />
                <span>{isExportingBadge ? 'Rendering 9:16 PNG...' : 'Download 9:16 Story Badge'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTrailerMp4}
                disabled={isExportingTrailer}
                className="flex-1 min-w-[220px] py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 hover:from-cyan-300 hover:to-sky-300 text-black font-mono text-xs font-extrabold tracking-wide cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.4)] min-h-[46px]"
              >
                <Film className="w-4 h-4 text-black shrink-0" />
                <span>{isExportingTrailer ? 'Encoding 9:16 MP4...' : 'Download 9:16 MP4 Trailer'}</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default WorldStoryVerificationBadge;
