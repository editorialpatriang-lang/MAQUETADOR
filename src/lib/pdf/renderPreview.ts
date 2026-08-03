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

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const drawW = baseViewport.width * scale;
    const drawH = baseViewport.height * scale;
    const offsetX = (targetWidth - drawW) / 2;
    const offsetY = (targetHeight - drawH) / 2;

    // Patrón recomendado por pdf.js: transladar y escalar el contexto
    // antes de renderizar con el viewport base. Evita renders en blanco
    // que ocurren al combinar `transform` con un viewport ya escalado.
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

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
