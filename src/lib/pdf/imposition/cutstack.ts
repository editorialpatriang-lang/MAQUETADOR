import type { ImpositionLayout, SheetConfig, NUpCell, ImpositionSheet } from '@/types/imposition';

/**
 * Cut & Stack: páginas impuestas de forma que al cortar y apilar,
 * quedan en orden de lectura. Cada pliego tiene N páginas en grilla,
 * con ordenamiento especial para que al cortar y apilar resulten ordenadas.
 */
export function calculateCutStackLayout(
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

  const pagesPerSheet = columns * rows;
  const totalSheets = Math.ceil(pageCount / pagesPerSheet);

  const sheets: ImpositionSheet[] = [];

  for (let s = 0; s < totalSheets; s++) {
    const cells: NUpCell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        // Cut & stack: ordenar de forma que al cortar y apilar queden en orden
        const idx = r * columns + c;
        const pageIndex = s * pagesPerSheet + idx;
        if (pageIndex >= pageCount) {
          cells.push({ pageIndex: -1, x: margins + c * (cellW + gutter), y: margins + r * (cellH + gutter), width: cellW, height: cellH, rotation: 0 });
          continue;
        }
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