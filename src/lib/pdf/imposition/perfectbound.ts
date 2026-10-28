import type { ImpositionLayout, SheetConfig, NUpCell, ImpositionSheet } from '@/types/imposition';

/**
 * Perfect Bound: páginas secuenciales, 2 por pliego (frente/dorso),
 * con margen de pinza en el lomo. Cada pliego contiene 2 páginas
 * (una por cara), ordenadas secuencialmente.
 */
export function calculatePerfectBoundLayout(
  pageCount: number,
  pageWidth: number,
  pageHeight: number,
  sheet: SheetConfig,
): ImpositionLayout {
  const { width: sheetW, height: sheetH, margins, gutter, gripper } = sheet;
  const gm = { left: margins, right: margins, top: margins, bottom: margins };
  if (gripper.enabled) {
    if (gripper.side === 'left') gm.left += gripper.size;
    if (gripper.side === 'right') gm.right += gripper.size;
    if (gripper.side === 'top') gm.top += gripper.size;
    if (gripper.side === 'bottom') gm.bottom += gripper.size;
  }

  const usableW = sheetW - gm.left - gm.right;
  const usableH = sheetH - gm.top - gm.bottom;

  // 2 páginas por pliego (frente y dorso), 1 por cara
  const pagesPerSheet = 2;
  const totalSheets = Math.ceil(pageCount / pagesPerSheet);

  const sheets: ImpositionSheet[] = [];

  for (let s = 0; s < totalSheets; s++) {
    const cells: NUpCell[] = [];
    for (let i = 0; i < pagesPerSheet; i++) {
      const pageIndex = s * pagesPerSheet + i;
      if (pageIndex >= pageCount) {
        cells.push({ pageIndex: -1, x: gm.left, y: gm.top, width: usableW, height: usableH, rotation: 0 });
        continue;
      }
      const scale = Math.min(usableW / pageWidth, usableH / pageHeight);
      const w = pageWidth * scale;
      const h = pageHeight * scale;
      cells.push({
        pageIndex,
        x: gm.left + (usableW - w) / 2,
        y: gm.top + (usableH - h) / 2,
        width: w,
        height: h,
        rotation: 0,
      });
    }
    sheets.push({ cells, sheetIndex: s });
  }

  return { sheets, totalSheets: sheets.length, sheetWidth: sheetW, sheetHeight: sheetH };
}