import { PDFDocument, rgb, cmyk, degrees } from 'pdf-lib';
import type { ProductionMarks, ImpositionLayout } from '@/types/imposition';
import { calculateMarks } from './marks';

export async function exportPdf(
  originalPdfBytes: ArrayBuffer,
  layout: ImpositionLayout,
  sheetW: number,
  sheetH: number,
  marksConfig: ProductionMarks,
  margins: number,
  fileName?: string,
  pageCount?: number,
  grainDirection?: string,
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: false });
  const outDoc = await PDFDocument.create();

  if (marksConfig.pdfxOutput) {
    outDoc.setTitle(fileName || 'Documento impuesto');
    outDoc.setCreator('MAQUETADOR');
    outDoc.setProducer('MAQUETADOR - PDF/X-4');
  }

  for (let i = 0; i < layout.sheets.length; i++) {
    const sheet = layout.sheets[i];
    const page = outDoc.addPage([sheetW, sheetH]);
    const sheetHPoints = sheetH;

    if (marksConfig.pdfxOutput) {
      const bleedBox = { left: 0, bottom: 0, right: sheetW, top: sheetH };
      page.setBleedBox(bleedBox.left, bleedBox.bottom, bleedBox.right, bleedBox.top);

      const trimBox = {
        left: margins,
        bottom: margins,
        right: sheetW - margins,
        top: sheetH - margins,
      };
      page.setTrimBox(trimBox.left, trimBox.bottom, trimBox.right, trimBox.top);
    }

    for (const cell of sheet.cells) {
      if (cell.pageIndex < 0 || cell.pageIndex >= srcDoc.getPageCount()) continue;

      const srcPage = srcDoc.getPage(cell.pageIndex);
      const embeddedPage = await outDoc.embedPage(srcPage);

      const srcSize = srcPage.getSize();
      const scaleX = cell.width / srcSize.width;
      const scaleY = cell.height / srcSize.height;
      const scale = Math.min(scaleX, scaleY);

      const drawW = srcSize.width * scale;
      const drawH = srcSize.height * scale;
      const offsetX = cell.x + (cell.width - drawW) / 2;
      const offsetY = sheetHPoints - cell.y - cell.height + (cell.height - drawH) / 2;

      if (cell.rotation === 180) {
        // Rotar 180° alrededor del centro de la celda.
        // pdf-lib rota alrededor del punto (x, y), por lo que para que el
        // resultado quede centrado, el ancla debe ser la esquina opuesta.
        page.drawPage(embeddedPage, {
          x: offsetX + drawW,
          y: offsetY + drawH,
          width: drawW,
          height: drawH,
          rotate: degrees(180),
        });
      } else {
        page.drawPage(embeddedPage, {
          x: offsetX,
          y: offsetY,
          width: drawW,
          height: drawH,
        });
      }
    }

    drawProductionMarks(page, sheet, sheetW, sheetHPoints, marksConfig, margins, i, layout.sheets.length, {
      fileName: fileName || '',
      grainDirection: grainDirection || '',
      pageCount: pageCount || 0,
      pdfxProfile: marksConfig.pdfxProfile,
    });
  }

  return outDoc.save();
}

function drawProductionMarks(
  page: any,
  sheet: any,
  sheetW: number,
  sheetH: number,
  marksConfig: ProductionMarks,
  margins: number,
  sheetIndex?: number,
  totalSheets?: number,
  slugMeta?: { fileName?: string; grainDirection?: string; pageCount?: number; pdfxProfile?: string },
) {
  const overlay = calculateMarks(sheetW, sheetH, marksConfig.bleed, margins, marksConfig, sheet.cells, sheetIndex, totalSheets, slugMeta);
  const regBlack = cmyk(1, 1, 1, 1);

  for (const line of overlay.cropLines) {
    page.drawLine({
      start: { x: line.x1, y: sheetH - line.y1 },
      end: { x: line.x2, y: sheetH - line.y2 },
      thickness: overlay.cropLineThickness,
      color: regBlack,
    });
  }

  for (const reg of overlay.registrationCenters) {
    const cx = reg.cx;
    const cy = sheetH - reg.cy;
    const size = 8;
    page.drawCircle({
      x: cx,
      y: cy,
      size: size,
      borderColor: regBlack,
      borderWidth: 0.25,
    });
    page.drawLine({ start: { x: cx - size, y: cy }, end: { x: cx + size, y: cy }, thickness: 0.25, color: regBlack });
    page.drawLine({ start: { x: cx, y: cy - size }, end: { x: cx, y: cy + size }, thickness: 0.25, color: regBlack });
  }

  // Bleed boxes: solo visuales (previsualización), no se imprimen en el PDF

  for (const patch of overlay.colorBarPatches) {
    const { c, m, y, k } = patch.cmyk;
    page.drawRectangle({
      x: patch.x,
      y: sheetH - patch.y - patch.h,
      width: patch.w,
      height: patch.h,
      color: cmyk(c, m, y, k),
      borderColor: regBlack,
      borderWidth: 0.25,
    });
  }

  for (const fold of overlay.foldLines) {
    const dashArray = [4, 4];
    page.drawLine({
      start: { x: fold.x1, y: sheetH - fold.y1 },
      end: { x: fold.x2, y: sheetH - fold.y2 },
      thickness: 0.25,
      color: regBlack,
      dashArray,
    });
  }

  for (const bm of overlay.bindingMarks) {
    page.drawCircle({
      x: bm.cx,
      y: sheetH - bm.cy,
      size: bm.radius,
      borderColor: regBlack,
      borderWidth: 0.25,
    });
  }

  for (const cm of overlay.collatingMarks) {
    page.drawRectangle({
      x: cm.x,
      y: sheetH - cm.y - cm.h,
      width: cm.w,
      height: cm.h,
      color: regBlack,
    });
  }

  for (const label of overlay.signatureLabels) {
    page.drawText(label.text, {
      x: label.x,
      y: sheetH - label.y,
      size: 5,
      color: regBlack,
    });
  }
}