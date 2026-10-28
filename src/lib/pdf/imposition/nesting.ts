import type { ImpositionLayout, SheetConfig, NUpCell, ImpositionSheet } from '@/types/imposition';

/**
 * Nesting irregular: acomodo tipo puzzle de páginas de distintos tamaños
 * en un pliego usando bin-packing (best-fit decreasing).
 * Cada página se coloca en la posición que mejor se ajuste, rotando
 * 90° si mejora el acomodo.
 */
export function calculateNestingLayout(
  pages: Array<{ width: number; height: number; index: number }>,
  sheet: SheetConfig,
): ImpositionLayout {
  const { width: sheetW, height: sheetH, margins, gutter } = sheet;
  const usableW = sheetW - 2 * margins;
  const usableH = sheetH - 2 * margins;

  // Ordenar páginas por área descendente (best-fit decreasing)
  const sorted = [...pages].sort((a, b) => (b.width * b.height) - (a.width * a.height));

  const sheets: ImpositionSheet[] = [];
  let currentSheet: ImpositionSheet = { cells: [], sheetIndex: 0 };
  const placed: Array<{ x: number; y: number; w: number; h: number }> = [];

  for (const page of sorted) {
    // Intentar colocar en el pliego actual
    let bestPos: { x: number; y: number; rotated: boolean } | null = null;
    let bestW = 0, bestH = 0;

    // Probar sin rotar y rotado
    for (const rotated of [false, true]) {
      const pw = rotated ? page.height : page.width;
      const ph = rotated ? page.width : page.height;

      // Buscar la mejor posición (bottom-left)
      for (let y = margins; y + ph <= sheetH - margins; y += 1) {
        for (let x = margins; x + pw <= sheetW - margins; x += 1) {
          // Verificar que no colisiona con otros
          const collides = placed.some((p) =>
            !(x + pw + gutter <= p.x || p.x + p.w + gutter <= x ||
              y + ph + gutter <= p.y || p.y + p.h + gutter <= y)
          );
          if (!collides) {
            // Calcular score (preferir posiciones más bajas y a la izquierda)
            const score = y * 1000 + x;
            if (bestPos === null) {
              bestPos = { x, y, rotated };
              bestW = pw;
              bestH = ph;
            } else {
              const scorePrev = (bestPos as { x: number; y: number; rotated: boolean }).y * 1000 + (bestPos as { x: number; y: number; rotated: boolean }).x;
              if (score < scorePrev) {
                bestPos = { x, y, rotated };
                bestW = pw;
                bestH = ph;
              }
            }
            break;
          }
        }
        if (bestPos) break;
      }
      if (bestPos) break;
    }

    if (bestPos) {
      const scale = Math.min(
        (usableW * 0.5) / bestW, // no escalar demasiado
        1
      );
      const w = bestW * Math.min(scale, 1);
      const h = bestH * Math.min(scale, 1);
      currentSheet.cells.push({
        pageIndex: page.index,
        x: bestPos.x,
        y: bestPos.y,
        width: w,
        height: h,
        rotation: bestPos.rotated ? 90 : 0,
      });
      placed.push({ x: bestPos.x, y: bestPos.y, w, h });
    } else {
      // No cabe en el pliego actual → nuevo pliego
      sheets.push(currentSheet);
      currentSheet = { cells: [], sheetIndex: sheets.length };
      placed.length = 0;
      // Reintentar en el nuevo pliego
      const pw = page.width;
      const ph = page.height;
      currentSheet.cells.push({
        pageIndex: page.index,
        x: margins,
        y: margins,
        width: pw,
        height: ph,
        rotation: 0,
      });
      placed.push({ x: margins, y: margins, w: pw, h: ph });
    }
  }

  if (currentSheet.cells.length > 0) {
    sheets.push(currentSheet);
  }

  return { sheets, totalSheets: sheets.length, sheetWidth: sheetW, sheetHeight: sheetH };
}