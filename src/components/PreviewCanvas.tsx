import { useEffect, useRef, useCallback, useState } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { previewEngine } from '@/lib/pdf/previewEngine';
import { calculateBookletLayout } from '@/lib/pdf/imposition/booklet';
import { calculateMarks } from '@/lib/pdf/marks';
import type { ImpositionLayout } from '@/types/imposition';

function getLayout(
  pageCount: number,
  pageW: number,
  pageH: number,
  store: ReturnType<typeof useDocumentStore.getState>,
): ImpositionLayout {
  return calculateBookletLayout(pageCount, pageW, pageH, store.booklet, store.sheet, { creepVisualScale: 1 });
}

export function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasBackRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [duplexMode, setDuplexMode] = useState(false);

  const pageCount = useDocumentStore((s) => s.pageCount);
  const originalPdfBytes = useDocumentStore((s) => s.originalPdfBytes);
  const originalPageW = useDocumentStore((s) => s.originalPageWidth);
  const originalPageH = useDocumentStore((s) => s.originalPageHeight);
  const booklet = useDocumentStore((s) => s.booklet);
  const sheet = useDocumentStore((s) => s.sheet);
  const marks = useDocumentStore((s) => s.marks);
  const previewScale = useDocumentStore((s) => s.previewScale);
  const currentSheetIndex = useDocumentStore((s) => s.currentSheetIndex);
  const setCurrentSheetIndex = useDocumentStore((s) => s.setCurrentSheetIndex);
  const setPreviewScale = useDocumentStore((s) => s.setPreviewScale);

  const renderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialized = useRef(false);
  const renderSeq = useRef(0);

  const doRender = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !originalPdfBytes || pageCount === 0) return;
    if (!isInitialized.current) return;

    const mySeq = ++renderSeq.current;
    const store = useDocumentStore.getState();
    const layout = getLayout(pageCount, originalPageW, originalPageH, store);

    if (layout.sheets.length === 0) return;

    const idx = Math.min(currentSheetIndex, layout.sheets.length - 1);
    const sheetData = layout.sheets[idx];
    const sW = layout.sheetWidth;
    const sH = layout.sheetHeight;

    const slugMeta = {
      fileName: store.fileName,
      grainDirection: store.sheet.grainDirection,
      pageCount: store.pageCount,
      pdfxProfile: store.marks.pdfxProfile,
    };

    const marksOverlay = calculateMarks(sW, sH, marks.bleed, sheet.margins, marks, sheetData.cells, idx, layout.sheets.length, slugMeta);

    await previewEngine.renderSheet(
      canvas,
      sheetData,
      marksOverlay,
      sW,
      sH,
      previewScale,
    );

    // Si hubo un render más nuevo, no dibujar el dorso
    if (mySeq !== renderSeq.current) return;

    if (duplexMode && canvasBackRef.current && idx + 1 < layout.sheets.length) {
      const backSheet = layout.sheets[idx + 1];
      const backMarks = calculateMarks(sW, sH, marks.bleed, sheet.margins, marks, backSheet.cells, idx + 1, layout.sheets.length, slugMeta);
      await previewEngine.renderSheet(
        canvasBackRef.current,
        backSheet,
        backMarks,
        sW,
        sH,
        previewScale,
      );
    }
  }, [
    originalPdfBytes,
    pageCount,
    originalPageW,
    originalPageH,
    booklet,
    sheet,
    marks,
    previewScale,
    currentSheetIndex,
    duplexMode,
  ]);

  useEffect(() => {
    if (!originalPdfBytes || pageCount === 0) return;

    isInitialized.current = false;
    renderSeq.current++;
    previewEngine.init(originalPdfBytes).then(() => {
      isInitialized.current = true;
      doRender();
    });

    return () => {
      previewEngine.dispose();
      isInitialized.current = false;
      renderSeq.current++;
    };
  }, [originalPdfBytes, pageCount]);

  useEffect(() => {
    if (renderTimeout.current) clearTimeout(renderTimeout.current);
    renderTimeout.current = setTimeout(() => {
      doRender();
    }, 300);
    return () => {
      if (renderTimeout.current) clearTimeout(renderTimeout.current);
    };
  }, [doRender]);

  const store = useDocumentStore.getState();
  const layout = pageCount > 0 ? getLayout(pageCount, originalPageW, originalPageH, store) : { sheets: [], totalSheets: 0, sheetWidth: originalPageW, sheetHeight: originalPageH };
  const totalSheets = layout.totalSheets;

  const fitToWidth = useCallback(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth - 48;
    const multiplier = duplexMode ? 2.1 : 1;
    const scaleW = w / (layout.sheetWidth * multiplier);
    setPreviewScale(Math.round(scaleW * 100) / 100);
  }, [layout.sheetWidth, setPreviewScale, duplexMode]);

  const zoomIn = () => setPreviewScale(Math.min(3, previewScale + 0.1));
  const zoomOut = () => setPreviewScale(Math.max(0.1, previewScale - 0.1));
  const zoom100 = () => setPreviewScale(1);

  const canDuplex = true;

  if (!originalPdfBytes || pageCount === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="mx-auto text-gray-300 dark:text-gray-700 mb-3"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M8 7h8M8 11h8M8 15h5" />
          </svg>
          <p className="text-sm text-gray-400">
            Carga un PDF para ver la previsualización
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentSheetIndex(Math.max(0, currentSheetIndex - (duplexMode ? 2 : 1)))}
            disabled={currentSheetIndex === 0}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 4l-4 4 4 4" />
            </svg>
          </button>
          <span className="text-sm font-medium tabular-nums min-w-[80px] text-center">
            {duplexMode
              ? `Pliego ${Math.floor(currentSheetIndex / 2) + 1}`
              : `Hoja ${currentSheetIndex + 1} / ${totalSheets || 1}`}
          </span>
          <button
            onClick={() => setCurrentSheetIndex(Math.min(totalSheets - 1, currentSheetIndex + (duplexMode ? 2 : 1)))}
            disabled={currentSheetIndex >= totalSheets - 1}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {canDuplex && (
            <button
              onClick={() => setDuplexMode(!duplexMode)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                duplexMode
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Ver frente y dorso"
            >
              F+D
            </button>
          )}
          <button onClick={zoomOut} className="px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            −
          </button>
          <button onClick={zoom100} className="px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800 tabular-nums">
            {Math.round(previewScale * 100)}%
          </button>
          <button onClick={zoomIn} className="px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            +
          </button>
          <button onClick={fitToWidth} className="px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            Ajustar
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto flex items-start justify-center p-6">
        <div className={`flex ${duplexMode ? 'gap-6' : ''}`}>
          <canvas
            ref={canvasRef}
            className="shadow-lg bg-white"
            style={{ maxWidth: duplexMode ? '48%' : '100%' }}
          />
          {duplexMode && (
            <>
              <div className="flex items-center text-xs text-gray-400 font-medium px-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </div>
              <canvas
                ref={canvasBackRef}
                className="shadow-lg bg-white"
                style={{ maxWidth: '48%' }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}