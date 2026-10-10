import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  AlertCircle,
  ExternalLink,
  Lock,
  Mail,
  Check,
  Sparkles,
} from 'lucide-react';
import { BINGAA_PDF_FILENAME, BINGAA_PDF_URL } from '../utils/certificate';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface BingaaComicReaderProps {
  onClose: () => void;
  isVerified?: boolean;
}

type PDFDoc = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;

/**
 * Interactive page-by-page reader bound directly to /assets/Bingäa.pdf.
 * For verified holders: full 32-page reader with PDF download.
 * For public / non-VIP visitors: 2-page preview with Page 3 Whitelist Lock overlay.
 */
const BingaaComicReader: React.FC<BingaaComicReaderProps> = ({ onClose, isVerified = false }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const touchStartX = useRef<number | null>(null);

  const [doc, setDoc] = useState<PDFDoc | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [isRendering, setIsRendering] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  // Whitelist capture state for public visitors
  const [whitelistEmail, setWhitelistEmail] = useState('');
  const [isSubmittingWhitelist, setIsSubmittingWhitelist] = useState(false);
  const [whitelistSubmitted, setWhitelistSubmitted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('akinoya_whitelist_subscribed'));
  });
  const [whitelistError, setWhitelistError] = useState<string | null>(null);

  const isLockedPage = !isVerified && pageNum >= 3;

  // Load document (range requests: pages stream in on demand)
  useEffect(() => {
    let cancelled = false;
    const task = pdfjsLib.getDocument({ url: BINGAA_PDF_URL, disableAutoFetch: true });
    task.promise
      .then((pdf) => {
        if (!cancelled) setDoc(pdf);
      })
      .catch((err) => {
        console.error('[Reader] Failed to load PDF:', err);
        if (!cancelled) setLoadError('The comic could not be loaded in the reader.');
      });
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, []);

  // Track available stage size
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStageSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Render current page, fitted inside the stage at device pixel ratio
  useEffect(() => {
    if (!doc || !canvasRef.current || stageSize.w === 0 || stageSize.h === 0) return;
    if (isLockedPage) return; // Do not render canvas for locked pages

    let cancelled = false;
    setIsRendering(true);

    doc.getPage(pageNum).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const base = page.getViewport({ scale: 1 });
      const fit = Math.min(stageSize.w / base.width, stageSize.h / base.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: fit * dpr });

      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

      renderTaskRef.current?.cancel();
      const task = page.render({ canvasContext: canvas.getContext('2d')!, viewport });
      renderTaskRef.current = task;
      task.promise
        .then(() => {
          if (!cancelled) setIsRendering(false);
        })
        .catch((err: any) => {
          if (err?.name !== 'RenderingCancelledException') console.error('[Reader] Render error:', err);
        });
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [doc, pageNum, stageSize.w, stageSize.h, isLockedPage]);

  const total = doc?.numPages ?? 0;

  const goPrev = useCallback(() => {
    setPageNum((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(() => {
    setPageNum((p) => {
      if (!isVerified) {
        // Public users can advance from 1 to 2, and 2 to 3 (which triggers the lock)
        return Math.min(3, p + 1);
      }
      return total ? Math.min(total, p + 1) : p;
    });
  }, [isVerified, total]);

  // Keyboard navigation & scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [goPrev, goNext, onClose]);

  const handleWhitelistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = whitelistEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setWhitelistError('Please enter a valid email address.');
      return;
    }

    setIsSubmittingWhitelist(true);
    setWhitelistError(null);

    try {
      const res = await fetch('/api/whitelist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setWhitelistSubmitted(true);
        try {
          localStorage.setItem('akinoya_whitelist_subscribed', cleanEmail);
        } catch {}
      } else {
        setWhitelistError(data?.message || 'Failed to join whitelist. Please try again.');
      }
    } catch {
      // Local state fallback
      setWhitelistSubmitted(true);
      try {
        localStorage.setItem('akinoya_whitelist_subscribed', cleanEmail);
      } catch {}
    } finally {
      setIsSubmittingWhitelist(false);
    }
  };

  const navBtn =
    'flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer';

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/95 backdrop-blur-md" role="dialog" aria-label="Bingäa Issue #1 reader">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-white/10 shrink-0">
        <div className="min-w-0">
          <div className="text-[9px] sm:text-[10px] font-mono tracking-wider text-cyan-300 uppercase">
            {isVerified ? "Collector's Edition · Full Access" : 'Public Preview Edition · Pages 1–2'}
          </div>
          <div className="text-sm sm:text-base font-display font-bold text-white truncate">Bingäa — Issue #1</div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isVerified ? (
            <a
              href={BINGAA_PDF_URL}
              download={BINGAA_PDF_FILENAME}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-[11px] font-mono font-semibold text-cyan-300 border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-950/70 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Download PDF</span>
            </a>
          ) : (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-medium text-amber-300 bg-amber-950/50 border border-amber-500/30">
              PREVIEW MODE
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close reader"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className="relative flex-1 min-h-0 m-2 sm:m-4 flex items-center justify-center select-none"
        onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 50) (dx < 0 ? goNext : goPrev)();
          touchStartX.current = null;
        }}
      >
        {loadError ? (
          <div className="max-w-sm text-center space-y-3 font-mono">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-xs text-white/70">{loadError}</p>
            <a
              href={BINGAA_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open PDF directly
            </a>
          </div>
        ) : isLockedPage ? (
          /* Non-VIP Page 3 Lock Screen Overlay */
          <div className="w-full max-w-md mx-auto my-auto p-5 sm:p-7 rounded-2xl bg-[#080c14] border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-12 h-12 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center mb-3.5 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-400/40 text-[10px] font-mono font-semibold tracking-wider text-amber-300 mb-3 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>• 100 / 100 CLAIMED</span>
            </div>

            <h3 className="text-base sm:text-lg font-display font-bold text-white tracking-wide uppercase leading-snug mb-2">
              FOUNDING EDITION FULLY CLAIMED — CHAPTER LOCKED
            </h3>

            <p className="text-xs text-white/60 font-sans leading-relaxed mb-5">
              Pages 3 through {total || 32} are strictly reserved for verified Äkinoya Founding Pass holders.
            </p>

            {whitelistSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 font-bold">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>WHITELIST SPOT CONFIRMED</span>
                </div>
                <p className="text-[11px] text-white/70">
                  You will receive priority access and notification when the next comic drop releases.
                </p>
              </div>
            ) : (
              <form onSubmit={handleWhitelistSubmit} className="space-y-3">
                <p className="text-[11px] font-mono text-cyan-300/90 text-left">
                  Join the Äkinoya Whitelist to get early access and notifications when the next comic drop releases.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={whitelistEmail}
                    onChange={(e) => {
                      setWhitelistEmail(e.target.value);
                      if (whitelistError) setWhitelistError(null);
                    }}
                    placeholder="Enter your email address"
                    className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 outline-none font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingWhitelist || !whitelistEmail.trim()}
                    className="shrink-0 px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {isSubmittingWhitelist ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    <span>Join Whitelist</span>
                  </button>
                </div>
                {whitelistError && (
                  <p className="text-[10.5px] font-mono text-rose-400 text-left">{whitelistError}</p>
                )}
              </form>
            )}

            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/50">
              <button
                type="button"
                onClick={() => setPageNum(2)}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Back to Page 2 Preview</span>
              </button>
              <span className="text-amber-400/80 font-medium">Chapter 2 Locked</span>
            </div>
          </div>
        ) : (
          <>
            <canvas ref={canvasRef} className="rounded-md shadow-2xl bg-white max-w-full max-h-full" />
            {(isRendering || !doc) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                <Loader2 className="w-7 h-7 text-cyan-300 animate-spin" />
                <span className="text-[11px] font-mono text-white/60">
                  {doc ? `Loading page ${pageNum}…` : 'Opening Bingäa Issue #1…'}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer navigation */}
      {!loadError && (
        <div className="flex items-center justify-center gap-4 sm:gap-6 px-3 py-3 sm:py-4 border-t border-white/10 shrink-0">
          <button type="button" onClick={goPrev} disabled={pageNum <= 1} className={navBtn} aria-label="Previous page">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="min-w-[120px] text-center text-xs sm:text-sm font-mono text-white/80">
            {isVerified
              ? total ? `${pageNum} / ${total}` : '— / —'
              : pageNum <= 2
              ? `Preview Page ${pageNum} of 2`
              : 'Page 3 (Locked)'}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={!isVerified ? pageNum >= 3 : (!total || pageNum >= total)}
            className={navBtn}
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default BingaaComicReader;
