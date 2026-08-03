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
): Promise<HTMLCanvasElement | null> {
  if (!currentDoc) return null;

  try {
    const page = await currentDoc.getPage(pageIndex + 1);

    // Viewport base a escala 1 — el escalado y centrado se aplican al contexto
    const baseViewport = page.getViewport({ scale: 1 });
    const scaleX = targetWidth / baseViewport.width;
    const scaleY = targetHeight / baseViewport.height;
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

    const drawW = baseViewport.width * scale * renderScale;
    const drawH = baseViewport.height * scale * renderScale;
    const offsetX = (renderW - drawW) / 2;
    const offsetY = (renderH - drawH) / 2;

    // Patrón recomendado por pdf.js: transladar y escalar el contexto
    // antes de renderizar con el viewport base. Evita renders en blanco
    // que ocurren al combinar `transform` con un viewport ya escalado.
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale * renderScale, scale * renderScale);

    await page.render({
      canvasContext: ctx,
      viewport: baseViewport,
    }).promise;

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
