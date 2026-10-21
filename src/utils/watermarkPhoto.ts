import sillowMillLogoUrl from '../assets/images/Sillowmilllogo.png';
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
  ctx.lineTo(x + r, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export interface WatermarkPhotoOptions {
  planetName?: string;
  photoTitle?: string;
  category?: string;
  worldNumber?: string | number;
}

/**
 * Composites the official Sillow Mill luxury logo and trademark typography
 * subtly and elegantly in the bottom-left corner of any 4K/high-res planetary photo.
 * Returns a high-definition JPEG Blob (0.96 quality) ready for native saving into Photos.
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

    const W = img.naturalWidth || img.width || 1920;
    const H = img.naturalHeight || img.height || 1080;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw base photo
    ctx.drawImage(img, 0, 0, W, H);

    // 2. Dynamic scale factor relative to 1080p/4K
    const s = Math.max(0.65, Math.min(2.5, W / 1920));

    // 3. Subtle bottom-left ambient vignette for clean contrast
    const vigW = Math.round(620 * s);
    const vigH = Math.round(220 * s);
    const vigGrad = ctx.createRadialGradient(0, H, 0, 0, H, vigW);
    vigGrad.addColorStop(0, 'rgba(2, 6, 16, 0.78)');
    vigGrad.addColorStop(0.5, 'rgba(2, 6, 16, 0.42)');
    vigGrad.addColorStop(1, 'rgba(2, 6, 16, 0)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, H - vigH, vigW, vigH);

    // 4. Elegant Bottom-Left Sillow Mill Trademark Capsule
    const padX = Math.round(36 * s);
    const padY = Math.round(36 * s);
    const cardH = Math.round(84 * s);
    const cardW = Math.round(450 * s);
    const cardX = padX;
    const cardY = H - padY - cardH;
    const cardR = Math.round(18 * s);

    // Capsule dark glass surface
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fillStyle = 'rgba(4, 9, 22, 0.80)';
    ctx.fill();

    // Specular border
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.stroke();

    // Top specular highlight line
    ctx.save();
    ctx.beginPath();
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.clip();
    const topSpec = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
    topSpec.addColorStop(0, 'rgba(34, 211, 238, 0)');
    topSpec.addColorStop(0.3, 'rgba(34, 211, 238, 0.7)');
    topSpec.addColorStop(0.7, 'rgba(245, 158, 11, 0.7)');
    topSpec.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = topSpec;
    ctx.fillRect(cardX, cardY, cardW, Math.max(2, Math.round(2.5 * s)));
    ctx.restore();

    // 5. Official Sillow Mill Logo
    const logoFrameSize = Math.round(62 * s);
    const logoFrameX = cardX + Math.round(12 * s);
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
      ctx.shadowColor = 'rgba(255, 255, 255, 0.65)';
      ctx.shadowBlur = Math.round(14 * s);
      ctx.drawImage(logoImg, dx, dy, drawW, drawH);
      ctx.restore();
    }

    // 6. Trademark & Brand Typography
    const textX = logoFrameX + logoFrameSize + Math.round(14 * s);

    // Line 1: SILLOW MILL
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(22 * s)}px "Inter", sans-serif`;
    ctx.fillText('SILLOW MILL', textX, cardY + Math.round(30 * s));

    // Line 2: ÄKINOYA UNIVERSE · 4K ARCHIVE
    const categoryText = (options?.category || '4K ARCHIVE').toUpperCase();
    ctx.fillStyle = '#67e8f9';
    ctx.font = `bold ${Math.round(11 * s)}px "JetBrains Mono", monospace`;
    ctx.fillText(`ÄKINOYA UNIVERSE · ${categoryText}`, textX, cardY + Math.round(50 * s));

    // Line 3: Trademark & Web Verification String
    ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
    ctx.font = `500 ${Math.round(9.5 * s)}px "JetBrains Mono", monospace`;
    ctx.fillText('TM & © SILLOW MILL · sillowmill.com', textX, cardY + Math.round(68 * s));

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.96);
    });
  } catch (err) {
    console.error('Failed to composite watermark onto photo:', err);
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
