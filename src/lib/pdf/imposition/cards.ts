import type { ImpositionLayout, SheetConfig, NUpCell, ImpositionSheet } from '@/types/imposition';

/**
 * Cards: N tarjetas por pliego en grilla. Todas del mismo tamaño.
 * Útil para tarjetas de presentación, invitaciones, etc.
 */
export function calculateCardsLayout(
  pageCount: number,
  pageWidth: number,
  pageHeight: number,
  columns: number,
  rows: number,
  sheet: SheetConfig,
): ImpositionLayout {
  const { width: sheetW, height: sheetH, margins, gutter } = sheet;
  const usableW = sheetW - 2 * margins;
  const usableH = sheetH - 2 * margins;

  const cellW = (usableW - (columns - 1) * gutter) / columns;
  const cellH = (usableH - (rows - 1) * gutter) / rows;

  const cardsPerSheet = columns * rows;
  const totalSheets = Math.ceil(pageCount / cardsPerSheet);

  const sheets: ImpositionSheet[] = [];

  for (let s = 0; s < totalSheets; s++) {
    const cells: NUpCell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const pageIndex = (s * cardsPerSheet + r * columns + c) % pageCount;
        const scale = Math.min(cellW / pageWidth, cellH / pageHeight);
        const w = pageWidth * scale;
        const h = pageHeight * scale;
        cells.push({
          pageIndex,
          x: margins + c * (cellW + gutter) + (cellW - w) / 2,
          y: margins + r * (cellH + gutter) + (cellH - h) / 2,
          width: w,
          height: h,
          rotation: 0,
        });
      }
    }
    sheets.push({ cells, sheetIndex: s });
  }

  return { sheets, totalSheets: sheets.length, sheetWidth: sheetW, sheetHeight: sheetH };
}