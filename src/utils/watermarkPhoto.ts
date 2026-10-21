import sillowMillLogoUrl from '../assets/images/Sillowmilllogo.png';
import { PlanetSubmission } from '../types/contest';
import {
  loadImageForCanvas,
  isMobileOrTabletDevice,
  downloadOrShareFileBlob,
  triggerDirectDownload,
} from '../components/WorldStoryVerificationBadge';

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

export interface SlotCharacteristics {
  slotNum: string;
  typeName: string;
  subtitle: string;
}

/**
 * Returns dynamic slot number and characteristics classification matching the universe benchmark.
 * (e.g. 01 / TYPE: CELESTIAL NUCLEUS, 02 / TYPE: BOTANICAL BIOME, etc.)
 */
export function getPlanetSlotCharacteristics(
  slotIndex: number = 0,
  dossier?: PlanetSubmission,
  category?: string
): SlotCharacteristics {
  const slotNum = String(slotIndex + 1).padStart(2, '0');
  let typeName = 'CELESTIAL NUCLEUS';

  if (slotIndex === 0) {
    typeName = 'CELESTIAL NUCLEUS';
  } else if (slotIndex === 1) {
    typeName = dossier?.biome ? dossier.biome.toUpperCase() : 'BOTANICAL BIOME';
  } else if (slotIndex === 2) {
    typeName = 'APEX SPECIMEN';
  } else if (slotIndex === 3) {
    const isAmlemi =
      dossier?.id === 'planet-amlemi-genesis-01' ||
      dossier?.planetName === 'Ämlemi' ||
      Boolean(dossier?.planetName?.toLowerCase().includes('amlemi'));
    typeName = isAmlemi ? 'COCKPIT ATMOSPHERE' : 'ATMOSPHERIC TROPOSPHERE';
  } else if (slotIndex === 4) {
    typeName = 'SACRED MONUMENT';
  } else if (category) {
    const rawCategory = category.includes('·') ? category.split('·')[1].trim() : category;
    typeName = rawCategory.toUpperCase();
  }

  return {
    slotNum,
    typeName,
    subtitle: `ÄKINOYA UNIVERSE · ${slotNum} / TYPE: ${typeName}`,
  };
}

export interface WatermarkPhotoOptions {
  planetName?: string;
  photoTitle?: string;
  category?: string;
  worldNumber?: string | number;
  slotIndex?: number;
  dossier?: PlanetSubmission;
  subtitle?: string;
}

/**
 * Composites the official Sillow Mill luxury logo, dynamic planet name, slot characteristics,
 * and trademark typography in the bottom-left corner of any 4K/high-res planetary photo.
 * 
 * Enforces native 4K canvas initialization (min 3840px width) so typography and branding
 * are razor-sharp with zero blurriness on high-density Retina and mobile displays.
 * Returns a crystal-clear JPEG Blob (0.98 quality) ready for native saving into Photos.
 */
export async function renderWatermarkedPhotoBlob(
  imageUrl: string,
  options?: WatermarkPhotoOptions
): Promise<Blob | null> {
  if (!imageUrl) return null;

  try {
    // Load image and logo in parallel
    const [img, logoImg] = await Promise.all([
      loadImageForCanvas(imageUrl),
      loadImageForCanvas(sillowMillLogoUrl),
    ]);

    if (!img) return null;

    const sourceW = img.naturalWidth || img.width || 3840;
    const sourceH = img.naturalHeight || img.height || 2160;
    const aspect = sourceW / Math.max(1, sourceH);

    // Enforce full native 4K minimum resolution (3840px width minimum)
    const W = Math.max(3840, sourceW);
    const H = Math.round(W / aspect);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw base photo scaled to full 4K canvas
    ctx.drawImage(img, 0, 0, W, H);

    // 2. Scale factor relative to 1920 (at 3840 UHD 4K, s = 2.0; at 8K, s = 4.0)
    const s = W / 1920;

    // 3. Subtle bottom-left ambient vignette for clean HUD contrast
    const vigW = Math.round(750 * s);
    const vigH = Math.round(280 * s);
    const vigGrad = ctx.createRadialGradient(0, H, 0, 0, H, vigW);
    vigGrad.addColorStop(0, 'rgba(2, 6, 16, 0.88)');
    vigGrad.addColorStop(0.55, 'rgba(2, 6, 16, 0.45)');
    vigGrad.addColorStop(1, 'rgba(2, 6, 16, 0)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, H - vigH, vigW, vigH);

    // 4. Resolve dynamic planet name and characteristics
    const planetName = (options?.planetName || options?.dossier?.planetName || 'ÄMLEMI').toUpperCase();
    const slotIdx = options?.slotIndex ?? 0;
    const characteristics = getPlanetSlotCharacteristics(slotIdx, options?.dossier, options?.category);
    const subtitleText = (options?.subtitle || characteristics.subtitle).toUpperCase();
    const trademarkText = '™ & © SILLOW MILL · sillowmill.com';

    // 5. Measure text dimensions to ensure dynamic sizing
    ctx.font = `900 ${Math.round(24 * s)}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
    const titleMetrics = ctx.measureText(planetName);

    ctx.font = `bold ${Math.round(11.5 * s)}px "JetBrains Mono", monospace`;
    const subtitleMetrics = ctx.measureText(subtitleText);

    ctx.font = `600 ${Math.round(10 * s)}px "JetBrains Mono", monospace`;
    const tmMetrics = ctx.measureText(trademarkText);

    const maxTextW = Math.max(titleMetrics.width, subtitleMetrics.width, tmMetrics.width, Math.round(300 * s));

    // 6. Bottom-Left Trademark Capsule Sizing
    const padX = Math.round(44 * s);
    const padY = Math.round(44 * s);
    const cardH = Math.round(92 * s);
    const logoFrameSize = Math.round(68 * s);
    const textGap = Math.round(16 * s);
    const cardW = Math.round(padX * 0.4 + logoFrameSize + textGap + maxTextW + padX * 0.6);
    const cardX = padX;
    const cardY = H - padY - cardH;
    const cardR = Math.round(20 * s);

    // Capsule dark glass surface
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fillStyle = 'rgba(4, 9, 22, 0.88)';
    ctx.fill();

    // Specular border
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
    ctx.lineWidth = Math.max(2, Math.round(2 * s));
    ctx.stroke();

    // Top specular highlight hairline
    ctx.save();
    ctx.beginPath();
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.clip();
    const topSpec = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
    topSpec.addColorStop(0, 'rgba(34, 211, 238, 0)');
    topSpec.addColorStop(0.3, 'rgba(34, 211, 238, 0.85)');
    topSpec.addColorStop(0.7, 'rgba(245, 158, 11, 0.85)');
    topSpec.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = topSpec;
    ctx.fillRect(cardX, cardY, cardW, Math.max(3, Math.round(3 * s)));
    ctx.restore();

    // 7. Official Sillow Mill Insignia
    const logoFrameX = cardX + Math.round(14 * s);
    const logoFrameY = cardY + (cardH - logoFrameSize) / 2;

    if (logoImg) {
      const pad = Math.round(4 * s);
      const maxDim = logoFrameSize - pad * 2;
      const ratio = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
      let drawW = maxDim;
      let drawH = maxDim;
      if (ratio > 1) {
        drawH = maxDim / ratio;
      } else {
        drawW = maxDim * ratio;
      }
      const dx = logoFrameX + (logoFrameSize - drawW) / 2;
      const dy = logoFrameY + (logoFrameSize - drawH) / 2;

      ctx.save();
      ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
      ctx.shadowBlur = Math.round(16 * s);
      ctx.drawImage(logoImg, dx, dy, drawW, drawH);
      ctx.restore();
    }

    // 8. Vertical Chrome / Specular Divider
    const divX = logoFrameX + logoFrameSize + Math.round(12 * s);
    ctx.save();
    const divGrad = ctx.createLinearGradient(
      divX,
      cardY + Math.round(14 * s),
      divX,
      cardY + cardH - Math.round(14 * s)
    );
    divGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    divGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.65)');
    divGrad.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = Math.max(1.5, Math.round(1.5 * s));
    ctx.beginPath();
    ctx.moveTo(divX, cardY + Math.round(14 * s));
    ctx.lineTo(divX, cardY + cardH - Math.round(14 * s));
    ctx.stroke();
    ctx.restore();

    // 9. Trademark & Brand Typography Stack
    const textX = divX + Math.round(14 * s);

    // Line 1: Dynamically Generated Planet Name (Bold, Crisp White)
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(24 * s)}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = Math.round(6 * s);
    ctx.fillText(planetName, textX, cardY + Math.round(32 * s));
    ctx.restore();

    // Line 2: Synchronized Planet Characteristics & Slot Type (Cyan Monospace)
    ctx.fillStyle = '#67e8f9';
    ctx.font = `bold ${Math.round(11.5 * s)}px "JetBrains Mono", monospace`;
    ctx.fillText(subtitleText, textX, cardY + Math.round(54 * s));

    // Line 3: Official Trademark & Copyright
    ctx.fillStyle = 'rgba(203, 213, 225, 0.95)';
    ctx.font = `600 ${Math.round(10 * s)}px "JetBrains Mono", monospace`;
    ctx.fillText(trademarkText, textX, cardY + Math.round(74 * s));

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.98);
    });
  } catch (err) {
    console.error('Failed to composite 4K watermark onto photo:', err);
    return null;
  }
}

/**
 * Automates watermarking and saving of 4K photos directly to native mobile Photos (iOS/Android)
 * or instant browser download on desktop.
 */
export async function watermarkAndSavePhoto(
  imageUrl: string,
  filename: string,
  title?: string,
  text?: string,
  options?: WatermarkPhotoOptions
): Promise<void> {
  const isMobile = isMobileOrTabletDevice();
  const safeTitle = title || `${options?.planetName || 'Ämlemi'} — 4K Master Picture`;
  const safeText = text || `Verified 4K Planetary Archive Picture: ${options?.photoTitle || options?.planetName || 'Ämlemi'}`;

  try {
    const watermarkedBlob = await renderWatermarkedPhotoBlob(imageUrl, options);

    if (watermarkedBlob) {
      if (isMobile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          const file = new File([watermarkedBlob], filename, { type: 'image/jpeg' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: safeTitle,
              text: safeText,
            });
            return;
          }
        } catch (err: any) {
          if (err?.name === 'AbortError') return; // User closed share sheet
        }
      }

      await downloadOrShareFileBlob(watermarkedBlob, filename, 'image/jpeg', safeTitle, safeText);
      return;
    }
  } catch (err) {
    console.error('watermarkAndSavePhoto error, falling back to direct download:', err);
  }

  // Fallback to direct raw download if canvas processing encounters any blocker
  triggerDirectDownload(imageUrl, filename);
}
