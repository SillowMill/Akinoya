import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { X, ChevronLeft, ChevronRight, Download, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { BINGAA_PDF_FILENAME, BINGAA_PDF_URL } from '../utils/certificate';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface BingaaComicReaderProps {
  onClose: () => void;
}

type PDFDoc = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;

/**
 * Interactive page-by-page reader bound directly to /assets/Bingäa.pdf (rendered with pdf.js so it
 * works identically on iOS, Android and desktop). Lazy-loaded so pdf.js never ships in the main bundle.
 */
const BingaaComicReader: React.FC<BingaaComicReaderProps> = ({ onClose }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const touchStartX = useRef<number | null>(null);

  const [doc, setDoc] = useState<PDFDoc | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [isRendering, setIsRendering] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

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
  }, [doc, pageNum, stageSize.w, stageSize.h]);

  const total = doc?.numPages ?? 0;
  const goPrev = useCallback(() => setPageNum((p) => Math.max(1, p - 1)), []);
  const goNext = useCallback(() => setPageNum((p) => (total ? Math.min(total, p + 1) : p)), [total]);

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

  const navBtn =
    'flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer';

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/95 backdrop-blur-md" role="dialog" aria-label="Bingäa Issue #1 reader">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-white/10 shrink-0">
        <div className="min-w-0">
          <div className="text-[9px] sm:text-[10px] font-mono tracking-wider text-cyan-300">COLLECTOR'S EDITION</div>
          <div className="text-sm sm:text-base font-display font-bold text-white truncate">Bingäa — Issue #1</div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <a
            href={BINGAA_PDF_URL}
            download={BINGAA_PDF_FILENAME}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-[11px] font-mono font-semibold text-cyan-300 border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-950/70 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Download PDF</span>
          </a>
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
          <span className="min-w-[72px] text-center text-xs sm:text-sm font-mono text-white/80">
            {total ? `${pageNum} / ${total}` : '— / —'}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={!total || pageNum >= total}
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
