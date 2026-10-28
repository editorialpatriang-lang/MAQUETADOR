import type { ImpositionLayout, SheetConfig, NUpCell, ImpositionSheet } from '@/types/imposition';

/**
 * Work & Turn / Work & Tumble: imprime ambos lados de un pliego,
 * volteando a lo largo del eje corto (turn) o largo (tumble).
 * Cada pliego tiene 2 copias (frente y dorso), cortadas por la mitad.
 */
export function calculateWorkAndTurnLayout(
  pageCount: number,
  pageWidth: number,
  pageHeight: number,
  sheet: SheetConfig,
  tumble: boolean = false,
): ImpositionLayout {
  const { width: sheetW, height: sheetH, margins, gutter } = sheet;
  const usableW = sheetW - 2 * margins;
  const usableH = sheetH - 2 * margins;

  // 2 copias por pliego (frente y dorso)
  const halfW = (usableW - gutter) / 2;
  const halfH = usableH;

  const sheets: ImpositionSheet[] = [];
  const totalSheets = Math.ceil(pageCount / 2);

  for (let s = 0; s < totalSheets; s++) {
    const cells: NUpCell[] = [];
    // Frente: página s*2
    const pi0 = s * 2;
    if (pi0 < pageCount) {
      const scale = Math.min(halfW / pageWidth, halfH / pageHeight);
      const w = pageWidth * scale;
      const h = pageHeight * scale;
      cells.push({
        pageIndex: pi0,
        x: margins + (halfW - w) / 2,
        y: margins + (halfH - h) / 2,
        width: w,
        height: h,
        rotation: 0,
      });
    }
    // Dorso: página s*2+1, volteada según turn/tumble
    const pi1 = s * 2 + 1;
    if (pi1 < pageCount) {
      const scale = Math.min(halfW / pageWidth, halfH / pageHeight);
      const w = pageWidth * scale;
      const h = pageHeight * scale;
      cells.push({
        pageIndex: pi1,
        x: margins + halfW + gutter + (halfW - w) / 2,
        y: margins + (halfH - h) / 2,
        width: w,
        height: h,
        rotation: tumble ? 180 : 0,
      });
    }
    sheets.push({ cells, sheetIndex: s });
  }

  return { sheets, totalSheets: sheets.length, sheetWidth: sheetW, sheetHeight: sheetH };
}