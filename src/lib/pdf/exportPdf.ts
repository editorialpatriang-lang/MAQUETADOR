import { PDFDocument, rgb, cmyk, pushGraphicsState, popGraphicsState, clip, endPath, rectangle } from 'pdf-lib';
import type { ProductionMarks, ImpositionLayout } from '@/types/imposition';
import { calculateMarks } from './marks';

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return rgb(1, 1, 1);
  return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
}

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
  bleedMode?: string,
  extendColor?: string,
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
      const baseScaleX = cell.width / srcSize.width;
      const baseScaleY = cell.height / srcSize.height;
      const baseScale = Math.min(baseScaleX, baseScaleY);

      const drawW = srcSize.width * baseScale;
      const drawH = srcSize.height * baseScale;
      const offsetX = cell.x + (cell.width - drawW) / 2;
      const offsetY = sheetHPoints - cell.y - cell.height + (cell.height - drawH) / 2;

      if (bleedMode === 'scale' && marksConfig.bleed > 0) {
        // Escalar para llenar zona de sangrado y recortar al área de página
        const bleedScale = (cell.width + 2 * marksConfig.bleed) / cell.width;
        const scaledW = drawW * bleedScale;
        const scaledH = drawH * bleedScale;
        const scaledOffsetX = cell.x + (cell.width - scaledW) / 2;
        const scaledOffsetY = sheetHPoints - cell.y - cell.height + (cell.height - scaledH) / 2;

        page.pushOperators(
          pushGraphicsState(),
          rectangle(cell.x, sheetHPoints - cell.y - cell.height, cell.width, cell.height),
          clip(),
          endPath(),
        );
        page.drawPage(embeddedPage, {
          x: scaledOffsetX,
          y: scaledOffsetY,
          width: scaledW,
          height: scaledH,
        });
        page.pushOperators(popGraphicsState());
      } else if (bleedMode === 'extend' && marksConfig.bleed > 0) {
        // Extender con color de fondo en la zona de sangrado
        const b = marksConfig.bleed;
        page.drawRectangle({
          x: cell.x - b,
          y: sheetHPoints - cell.y - cell.height - b,
          width: cell.width + 2 * b,
          height: cell.height + 2 * b,
          color: hexToRgb(extendColor || '#ffffff'),
        });
        page.drawPage(embeddedPage, {
          x: offsetX,
          y: offsetY,
          width: drawW,
          height: drawH,
        });
      } else {
        // 'none' y 'crop': colocar tal cual (comportamiento histórico)
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