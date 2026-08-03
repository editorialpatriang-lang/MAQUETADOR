import type { ProductionMarks, MarksOverlay, CmykColor, NUpCell } from '@/types/imposition';

interface ColorBarPatch {
  c: string;
  pct: string | number;
  cmyk: CmykColor;
}

const CMYK_PATCHES: ColorBarPatch[] = [
  { c: '#00FFFF', pct: 'C', cmyk: { c: 1, m: 0, y: 0, k: 0 } },
  { c: '#FF00FF', pct: 'M', cmyk: { c: 0, m: 1, y: 0, k: 0 } },
  { c: '#FFFF00', pct: 'Y', cmyk: { c: 0, m: 0, y: 1, k: 0 } },
  { c: '#333333', pct: 'K', cmyk: { c: 0, m: 0, y: 0, k: 1 } },
  { c: '#FF4400', pct: 'M+Y', cmyk: { c: 0, m: 1, y: 1, k: 0 } },
  { c: '#00AA00', pct: 'C+Y', cmyk: { c: 1, m: 0, y: 1, k: 0 } },
  { c: '#0000CC', pct: 'C+M', cmyk: { c: 1, m: 1, y: 0, k: 0 } },
  { c: '#665544', pct: 'C+M+Y', cmyk: { c: 0.4, m: 0.4, y: 0.4, k: 0.1 } },
];

const GRAYSCALE_PATCHES: { c: string; pct: number; cmyk: CmykColor }[] = [
  { c: '#000000', pct: 100, cmyk: { c: 0, m: 0, y: 0, k: 1 } },
  { c: '#808080', pct: 50, cmyk: { c: 0, m: 0, y: 0, k: 0.5 } },
  { c: '#404040', pct: 25, cmyk: { c: 0, m: 0, y: 0, k: 0.25 } },
  { c: '#a0a0a0', pct: 10, cmyk: { c: 0, m: 0, y: 0, k: 0.1 } },
];

export function calculateMarks(
  sheetW: number,
  sheetH: number,
  bleed: number,
  margins: number,
  config: ProductionMarks,
  cells: NUpCell[],
  sheetIndex?: number,
  totalSheets?: number,
  slugMeta?: { fileName?: string; grainDirection?: string; pageCount?: number; pdfxProfile?: string },
): MarksOverlay {
  const markLength = config.cropMarkLength;
  const markOffset = config.cropMarkOffset;

  const overlay: MarksOverlay = {
    cropLineThickness: config.cropMarkThickness,
    cropLines: [],
    registrationCenters: [],
    bleedBoxes: [],
    colorBarPatches: [],
    foldLines: [],
    bindingMarks: [],
    collatingMarks: [],
    signatureLabels: [],
  };

  if (config.cropMarks) {
    drawBookletCropMarks(overlay, cells, markOffset, markLength);
  }

  if (config.registrationMarks) {
    overlay.registrationCenters.push(
      { cx: margins + 40, cy: margins + 40 },
      { cx: sheetW - margins - 40, cy: margins + 40 },
      { cx: margins + 40, cy: sheetH - margins - 40 },
      { cx: sheetW - margins - 40, cy: sheetH - margins - 40 },
      { cx: sheetW / 2, cy: margins + 20 },
      { cx: sheetW / 2, cy: sheetH - margins - 20 },
    );
  }

  if (config.bleed > 0) {
    for (const cell of cells) {
      if (cell.pageIndex < 0) continue;
      overlay.bleedBoxes.push({
        x: cell.x - bleed,
        y: cell.y - bleed,
        w: cell.width + bleed * 2,
        h: cell.height + bleed * 2,
      });
    }
  }

  if (config.colorBar) {
    const barX = margins + 10;
    const barY = sheetH - margins + 12;
    const barH = 10;
    const barW = 18;

    const patches = config.colorBarType === 'grayscale' ? GRAYSCALE_PATCHES : CMYK_PATCHES;

    for (let i = 0; i < patches.length; i++) {
      overlay.colorBarPatches.push({
        x: barX + i * (barW + 2),
        y: barY,
        w: barW,
        h: barH,
        color: patches[i].c,
        cmyk: patches[i].cmyk,
      });
    }
  }

  if (config.foldMarks) {
    drawBookletFoldLine(overlay, cells, sheetH, margins);
  }

  if (config.bindingStyle !== 'none') {
    const spineX = margins + 15;
    const spacing = config.bindingStyle === 'wire-o' ? 30 : 28;
    let cy = margins + 30;
    while (cy < sheetH - margins) {
      overlay.bindingMarks.push({ cx: spineX, cy, radius: config.bindingStyle === 'wire-o' ? 4 : 3 });
      cy += spacing;
    }
  }

  if (config.signatureNumbering && sheetIndex !== undefined && totalSheets !== undefined) {
    const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const fileName = slugMeta?.fileName || '';
    const grainDir = slugMeta?.grainDirection === 'long' ? 'FL' : slugMeta?.grainDirection === 'short' ? 'FC' : '';
    const pagesLabel = slugMeta?.pageCount ? `${slugMeta.pageCount} págs` : '';

    // Slug en la esquina inferior izquierda, en una sola línea compacta
    const parts = [
      fileName,
      today,
      `Pliego ${sheetIndex + 1}/${totalSheets}`,
      'booklet',
      pagesLabel,
      grainDir ? `Fibra: ${grainDir}` : '',
      config.pdfxOutput && slugMeta?.pdfxProfile ? `PDF/X-4 ${slugMeta.pdfxProfile}` : '',
    ].filter(Boolean);

    overlay.signatureLabels.push({
      x: margins,
      y: sheetH - 4,
      text: parts.join(' · '),
    });
  }

  return overlay;
}

function drawBookletCropMarks(
  overlay: MarksOverlay,
  cells: NUpCell[],
  markOffset: number,
  markLength: number,
) {
  const validCells = cells.filter(c => c.pageIndex >= 0);
  if (validCells.length === 0) return;

  const spineX = validCells.length >= 2
    ? (validCells[0].x + validCells[0].width + validCells[1].x) / 2
    : validCells[0].x + validCells[0].width / 2;

  for (const cell of validCells) {
    const tx = cell.x;
    const ty = cell.y;
    const tw = cell.width;
    const th = cell.height;

    const cellCenterX = tx + tw / 2;
    const isLeftPage = cellCenterX < spineX;
    const outerDx = isLeftPage ? -1 : 1;

    const outerCorners = [
      { cx: tx + (isLeftPage ? 0 : tw), cy: ty, dx: outerDx, dy: -1 },
      { cx: tx + (isLeftPage ? 0 : tw), cy: ty + th, dx: outerDx, dy: 1 },
    ];

    for (const { cx, cy, dx, dy } of outerCorners) {
      overlay.cropLines.push({
        x1: cx + dx * markOffset,
        y1: cy + dy * (markOffset + markLength),
        x2: cx + dx * markOffset,
        y2: cy + dy * markOffset,
      });
      overlay.cropLines.push({
        x1: cx + dx * (markOffset + markLength),
        y1: cy + dy * markOffset,
        x2: cx + dx * markOffset,
        y2: cy + dy * markOffset,
      });
    }
  }

  const leftEdge = Math.min(...validCells.map(c => c.x));
  const rightEdge = Math.max(...validCells.map(c => c.x + c.width));
  const topY = validCells[0].y;
  const bottomY = validCells[0].y + validCells[0].height;

  overlay.cropLines.push({
    x1: leftEdge,
    y1: topY - markOffset,
    x2: rightEdge,
    y2: topY - markOffset,
  });
  overlay.cropLines.push({
    x1: leftEdge,
    y1: bottomY + markOffset,
    x2: rightEdge,
    y2: bottomY + markOffset,
  });
}

function drawBookletFoldLine(
  overlay: MarksOverlay,
  cells: NUpCell[],
  sheetH: number,
  margins: number,
) {
  const validCells = cells.filter(c => c.pageIndex >= 0);
  if (validCells.length < 2) return;

  const spineX = (validCells[0].x + validCells[0].width + validCells[1].x) / 2;
  const topY = Math.min(...validCells.map(c => c.y));
  const bottomY = Math.max(...validCells.map(c => c.y + c.height));

  // Marca de pliegue extendida: desde el borde de la hoja hasta el arte
  // (arriba) y desde el arte hasta el borde de la hoja (abajo).
  overlay.foldLines.push({
    x1: spineX,
    y1: 0,
    x2: spineX,
    y2: topY - 2,
    dashed: true,
  });

  overlay.foldLines.push({
    x1: spineX,
    y1: bottomY + 2,
    x2: spineX,
    y2: sheetH,
    dashed: true,
  });
}
