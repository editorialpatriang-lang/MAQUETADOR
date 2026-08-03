import type { ImpositionLayout, BookletConfig, SheetConfig } from '@/types/imposition';
import type { NUpCell, ImpositionSheet } from '@/types/imposition';

const MM_TO_PT = 2.834645669;

interface Margins {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function getGripperMargins(sheet: SheetConfig): Margins {
  const base = sheet.margins;
  const { enabled, size, side } = sheet.gripper;
  return {
    left: base + (enabled && side === 'left' ? size : 0),
    right: base + (enabled && side === 'right' ? size : 0),
    top: base + (enabled && side === 'top' ? size : 0),
    bottom: base + (enabled && side === 'bottom' ? size : 0),
  };
}

const PAPER_CALIPER_MM: Record<number, number> = {
  70: 0.08, 80: 0.09, 90: 0.10, 100: 0.11, 115: 0.12, 120: 0.13,
  130: 0.14, 135: 0.15, 150: 0.16, 170: 0.18, 200: 0.20,
  250: 0.25, 300: 0.30, 350: 0.35,
};

function getCaliperPt(gsm: number): number {
  const exact = PAPER_CALIPER_MM[gsm];
  if (exact) return exact * MM_TO_PT;
  const entries = Object.entries(PAPER_CALIPER_MM)
    .map(([k, v]) => [Number(k), v] as const)
    .sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < entries.length; i++) {
    if (gsm < entries[i][0]) {
      const ratio = (gsm - entries[i - 1][0]) / (entries[i][0] - entries[i - 1][0]);
      const caliperMm = entries[i - 1][1] + ratio * (entries[i][1] - entries[i - 1][1]);
      return caliperMm * MM_TO_PT;
    }
  }
  return gsm * 0.001 * MM_TO_PT;
}

/**
 * Caliper (grosor) de una hoja de papel en puntos.
 * Es el creep incremental que se acumula por cada hoja del cuadernillo.
 */
function calcularCreepPerSheet(paperGsm: number, visualScale: number = 1): number {
  if (paperGsm <= 0) return 0;
  return getCaliperPt(paperGsm) * visualScale;
}

/**
 * Calcula el creep máximo del cuadernillo (desplazamiento de la hoja más
 * interna respecto a la externa).
 *
 * @param pageCount  Total de páginas del documento
 * @param paperGsm   Gramaje del papel
 * @param signatureSize  Páginas por cuadernillo (0 = un solo cuadernillo)
 * @param visualScale    Escala visual para previsualización (1 = real)
 *
 * El creep máximo = (número de hojas del cuadernillo - 1) × caliper de una hoja.
 * La hoja interior (s=última) no se desplaza; la hoja exterior (s=0) tiene
 * el máximo desplazamiento hacia afuera para compensar el recorte en guillotina.
 */
export function calcularCreepAutomatico(
  pageCount: number,
  paperGsm: number = 130,
  signatureSize: number = 0,
  visualScale: number = 1,
): number {
  const sigSize = signatureSize > 0 && signatureSize < pageCount ? signatureSize : pageCount;
  const sigPadded = Math.ceil(sigSize / 4) * 4;
  const numSheets = sigPadded / 4;
  if (numSheets <= 1) return 0;
  return (numSheets - 1) * getCaliperPt(paperGsm) * visualScale;
}

export function calculateBookletLayout(
  pageCount: number,
  pageWidth: number,
  pageHeight: number,
  booklet: BookletConfig,
  sheet: SheetConfig,
  options?: { autoCreep?: boolean; creepVisualScale?: number },
): ImpositionLayout {
  const { signatureSize, autoCreep, manualCreep } = booklet;
  const { width: sheetW, height: sheetH, centerContent, gutter } = sheet;
  const gm = getGripperMargins(sheet);

  const usableW = sheetW - gm.left - gm.right;
  const usableH = sheetH - gm.top - gm.bottom;
  const halfW = usableW / 2 - gutter / 2;

  // Escalar la página para que quepa en la mitad del pliego manteniendo su relación de aspecto
  const scale = Math.min(halfW / pageWidth, usableH / pageHeight);
  const cellW = pageWidth * scale;
  const cellH = pageHeight * scale;

  const spineCenter = centerContent
    ? gm.left + usableW / 2
    : gm.left + cellW;

  const offsetY = centerContent
    ? gm.top + (usableH - cellH) / 2
    : gm.top;

  const sigSize = signatureSize > 0 && signatureSize < pageCount
    ? signatureSize
    : pageCount;

  const visualScale = options?.creepVisualScale ?? 1;

  const sheets: ImpositionSheet[] = [];
  let sheetIdx = 0;

  for (let sigStart = 0; sigStart < pageCount; sigStart += sigSize) {
    const sigEnd = Math.min(sigStart + sigSize, pageCount);
    const sigPadded = Math.ceil((sigEnd - sigStart) / 4) * 4;
    const sigSheets = sigPadded / 4;

    const order = buildSignatureOrder(sigPadded, sigStart, pageCount);

    const creep = autoCreep
      ? calcularCreepPerSheet(booklet.paperGsm, visualScale)
      : manualCreep * visualScale;

    for (let s = 0; s < sigSheets; s++) {
      // Orden saddle-stitch por hoja física (bloque de 4 páginas):
      //   order[4s+0] → frente IZQUIERDA (última página del cuadernillo, p. ej. 4)
      //   order[4s+1] → frente DERECHA  (primera página, p. ej. 1)
      //   order[4s+2] → dorso  IZQUIERDA (segunda página, p. ej. 2)
      //   order[4s+3] → dorso  DERECHA  (penúltima página, p. ej. 3)
      // Todas las páginas a 0°: al doblar el pliego por el lomo, el folleto
      // se lee en orden natural sin necesidad de rotar ninguna página.
      const frontLeftPage  = order[s * 4 + 0];
      const frontRightPage = order[s * 4 + 1];
      const backLeftPage   = order[s * 4 + 2];
      const backRightPage  = order[s * 4 + 3];

      // El creep desplaza las hojas EXTERIORES hacia afuera (alejándolas del lomo).
      // La hoja interior (s=sigSheets-1) no se mueve; la exterior (s=0) tiene
      // el máximo desplazamiento. Esto compensa que, al doblar y cortar en
      // guillotina, las páginas interiores sobresalen más y se recortan de más.
      // Desplazando las exteriores hacia afuera, todas quedan alineadas al cortar.
      const co = creep * (sigSheets - 1 - s);

      const frontLeftX = spineCenter - cellW - co;
      const frontRightX = spineCenter + co;
      const backLeftX = spineCenter - cellW - co;
      const backRightX = spineCenter + co;

      const frontCells: NUpCell[] = [
        {
          pageIndex: frontLeftPage,
          x: frontLeftX,
          y: offsetY,
          width: cellW,
          height: cellH,
          rotation: 0,
        },
        {
          pageIndex: frontRightPage,
          x: frontRightX,
          y: offsetY,
          width: cellW,
          height: cellH,
          rotation: 0,
        },
      ];

      const backCells: NUpCell[] = [
        {
          pageIndex: backLeftPage,
          x: backLeftX,
          y: offsetY,
          width: cellW,
          height: cellH,
          rotation: 0,
        },
        {
          pageIndex: backRightPage,
          x: backRightX,
          y: offsetY,
          width: cellW,
          height: cellH,
          rotation: 0,
        },
      ];

      sheets.push({ cells: frontCells, sheetIndex: sheetIdx++ });
      sheets.push({ cells: backCells, sheetIndex: sheetIdx++ });
    }
  }

  return { sheets, totalSheets: sheets.length, sheetWidth: sheetW, sheetHeight: sheetH };
}

/**
 * Genera el orden de páginas saddle-stitch (JDF BinderySignature / Gathering).
 * Algoritmo: toma pares desde los extremos hacia el centro: [last, first, first+1, last-1, ...]
 * Cada bloque de 4 páginas forma un pliego físico (frente y dorso).
 * Las páginas fuera de rango (más allá de totalPageCount) se marcan como -1 (blanco).
 *
 * Ejemplo para 8 páginas: [7, 0, 1, 6, 5, 2, 3, 4]
 */
export function buildSignatureOrder(
  paddedSize: number,
  baseIndex: number,
  totalPageCount: number,
): number[] {
  const order: number[] = [];
  let left = 0;
  let right = paddedSize - 1;

  while (left < right) {
    order.push(baseIndex + right);
    order.push(baseIndex + left);
    order.push(baseIndex + left + 1);
    order.push(baseIndex + right - 1);
    left += 2;
    right -= 2;
  }

  return order.map((pi) => (pi < totalPageCount ? pi : -1));
}

export function getBookletPagePreview(pageCount: number, signatureSize: number = 0): string[] {
  const sigSize = signatureSize > 0 && signatureSize < pageCount ? signatureSize : pageCount;
  const preview: string[] = [];
  for (let sigStart = 0; sigStart < pageCount; sigStart += sigSize) {
    const sigEnd = Math.min(sigStart + sigSize, pageCount);
    const sigPadded = Math.ceil((sigEnd - sigStart) / 4) * 4;
    const sigSheets = sigPadded / 4;
    const order = buildSignatureOrder(sigPadded, sigStart, pageCount);
    for (let s = 0; s < sigSheets; s++) {
      const sigNum = Math.floor(sigStart / sigSize) + 1;
      const p0 = order[s * 4 + 0], p1 = order[s * 4 + 1], p2 = order[s * 4 + 2], p3 = order[s * 4 + 3];
      const label = (i: number) => i >= 0 ? `pág. ${i + 1}` : '(blanco)';
      preview.push(
        `Cuad. ${sigNum}, Pliego ${s + 1}/${sigSheets}`,
        `  ├ frente: ${label(p0)} (0°) · ${label(p1)} (0°)`,
        `  └ dorso:  ${label(p2)} (0°) · ${label(p3)} (0°)`,
      );
    }
  }
  return preview;
}
