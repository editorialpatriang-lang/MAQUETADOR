import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

let currentDoc: pdfjsLib.PDFDocumentProxy | null = null;

export async function loadPdfJs(byteArray: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
  if (currentDoc) {
    await currentDoc.destroy();
    currentDoc = null;
  }

  currentDoc = await pdfjsLib.getDocument({ data: byteArray.slice(0) }).promise;
  return currentDoc;
}

export function getPdfJsDoc(): pdfjsLib.PDFDocumentProxy | null {
  return currentDoc;
}

const MAX_RENDER_PIXELS = 1200; // Máximo de píxeles en el lado más largo para preview

export async function renderPageToCanvas(
  pageIndex: number,
  targetWidth: number,
  targetHeight: number,
  sourceBleed: number = 0,
): Promise<HTMLCanvasElement | null> {
  if (!currentDoc) return null;

  try {
    const page = await currentDoc.getPage(pageIndex + 1);

    // Viewport base a escala 1 — el escalado y centrado se aplican al contexto
    const baseViewport = page.getViewport({ scale: 1 });
    const mediaW = baseViewport.width;
    const mediaH = baseViewport.height;

    const sb = sourceBleed > 0 ? sourceBleed : 0;
    const trimW = sb > 0 ? mediaW - 2 * sb : mediaW;
    const trimH = sb > 0 ? mediaH - 2 * sb : mediaH;

    const scaleX = targetWidth / trimW;
    const scaleY = targetHeight / trimH;
    const scale = Math.min(scaleX, scaleY);

    // Limitar la resolución de renderizado para preview (rendimiento)
    const maxDim = Math.max(targetWidth, targetHeight);
    const renderScale = maxDim > MAX_RENDER_PIXELS ? MAX_RENDER_PIXELS / maxDim : 1;
    const renderW = Math.max(1, Math.round(targetWidth * renderScale));
    const renderH = Math.max(1, Math.round(targetHeight * renderScale));

    const canvas = document.createElement('canvas');
    canvas.width = renderW;
    canvas.height = renderH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, renderW, renderH);

    // Renderizar la página completa en un canvas temporal a escala media.
    const fullW = Math.max(1, Math.round(mediaW * scale * renderScale));
    const fullH = Math.max(1, Math.round(mediaH * scale * renderScale));
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = fullW;
    fullCanvas.height = fullH;
    const fullCtx = fullCanvas.getContext('2d');
    if (!fullCtx) return null;
    fullCtx.fillStyle = '#ffffff';
    fullCtx.fillRect(0, 0, fullW, fullH);
    fullCtx.scale(scale * renderScale, scale * renderScale);
    await page.render({ canvasContext: fullCtx, viewport: baseViewport }).promise;

    // Recortar la zona de trim (sin bleed) del canvas temporal.
    const sx = sb * scale * renderScale;
    const sy = sb * scale * renderScale;
    const sw = trimW * scale * renderScale;
    const sh = trimH * scale * renderScale;
    ctx.drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, renderW, renderH);

    return canvas;
  } catch {
    return null;
  }
}

export function disposePdfJs(): void {
  if (currentDoc) {
    currentDoc.destroy();
    currentDoc = null;
  }
}
