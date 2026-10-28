import type { ImpositionLayout, NUpConfig, SheetConfig, NUpCell, ImpositionSheet } from '@/types/imposition';

/**
 * Calcula el layout de imposición N-up: coloca N páginas en una grilla
 * de columnas x filas en un pliego. Soporta rotación 90° para optimizar
 * acomodo cuando allowRotation está activo.
 */
export function calculateNUpLayout(
  pageCount: number,
  pageWidth: number,
  pageHeight: number,
  nup: NUpConfig,
  sheet: SheetConfig,
): ImpositionLayout {
  const { columns, rows, allowRotation, autoFill } = nup;
  const { width: sheetW, height: sheetH, margins, gutter, centerContent, gripper } = sheet;

  const gm = { left: margins, right: margins, top: margins, bottom: margins };
  if (gripper.enabled) {
    if (gripper.side === 'left') gm.left += gripper.size;
    if (gripper.side === 'right') gm.right += gripper.size;
    if (gripper.side === 'top') gm.top += gripper.size;
    if (gripper.side === 'bottom') gm.bottom += gripper.size;
  }

  const usableW = sheetW - gm.left - gm.right;
  const usableH = sheetH - gm.top - gm.bottom;

  const cellW = (usableW - (columns - 1) * gutter) / columns;
  const cellH = (usableH - (rows - 1) * gutter) / rows;

  const pagesPerSheet = columns * rows;
  const totalSheets = Math.ceil(pageCount / pagesPerSheet);

  const sheets: ImpositionSheet[] = [];

  for (let s = 0; s < totalSheets; s++) {
    const cells: NUpCell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const pageIndex = s * pagesPerSheet + r * columns + c;
        if (pageIndex >= pageCount && !autoFill) continue;
        if (pageIndex >= pageCount && autoFill) {
          // Celda vacía (blanco) - pageIndex = -1
          cells.push({
            pageIndex: -1,
            x: gm.left + c * (cellW + gutter),
            y: gm.top + r * (cellH + gutter),
            width: cellW,
            height: cellH,
            rotation: 0,
          });
          continue;
        }

        // Determinar si rotar 90° optimiza el acomodo
        let rotation = 0;
        let drawW = pageWidth;
        let drawH = pageHeight;
        if (allowRotation) {
          const scaleNormal = Math.min(cellW / pageWidth, cellH / pageHeight);
          const scaleRotated = Math.min(cellW / pageHeight, cellH / pageWidth);
          if (scaleRotated > scaleNormal) {
            rotation = 90;
            drawW = pageHeight;
            drawH = pageWidth;
          }
        }

        const scale = Math.min(cellW / drawW, cellH / drawH);
        const finalW = drawW * scale;
        const finalH = drawH * scale;
        const offsetX = (cellW - finalW) / 2;
        const offsetY = (cellH - finalH) / 2;

        cells.push({
          pageIndex,
          x: gm.left + c * (cellW + gutter) + offsetX,
          y: gm.top + r * (cellH + gutter) + offsetY,
          width: finalW,
          height: finalH,
          rotation,
        });
      }
    }
    sheets.push({ cells, sheetIndex: s });
  }

  return { sheets, totalSheets: sheets.length, sheetWidth: sheetW, sheetHeight: sheetH };
}