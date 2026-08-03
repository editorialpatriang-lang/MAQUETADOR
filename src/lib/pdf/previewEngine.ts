import type { ImpositionSheet, MarksOverlay, NUpCell } from '@/types/imposition';
import {
  loadPdfJs,
  renderPageToCanvas,
  disposePdfJs,
} from './renderPreview';

class PreviewEngine {
  private pageCache = new Map<string, HTMLCanvasElement>();

  async init(pdfBytes: ArrayBuffer): Promise<void> {
    this.pageCache.clear();
    await loadPdfJs(pdfBytes);
  }

  private cacheKey(pageIndex: number, w: number, h: number): string {
    return `${pageIndex}_${Math.round(w)}_${Math.round(h)}`;
  }

  async renderSheet(
    canvas: HTMLCanvasElement,
    sheet: ImpositionSheet,
    marks: MarksOverlay | null,
    sheetW: number,
    sheetH: number,
    scale: number,
  ): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = Math.round(sheetW * scale);
    canvas.height = Math.round(sheetH * scale);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const cell of sheet.cells) {
      if (cell.pageIndex < 0) continue;

      const key = this.cacheKey(cell.pageIndex, cell.width, cell.height);
      let pageCanvas: HTMLCanvasElement | null = this.pageCache.get(key) ?? null;

      if (!pageCanvas) {
        pageCanvas = await renderPageToCanvas(cell.pageIndex, Math.round(cell.width), Math.round(cell.height));
        if (pageCanvas) {
          this.pageCache.set(key, pageCanvas);
        }
      }

      if (pageCanvas) {
        ctx.save();

        const cx = cell.x * scale;
        const cy = cell.y * scale;
        const cw = cell.width * scale;
        const ch = cell.height * scale;

        if (cell.rotation === 180) {
          ctx.translate(cx + cw / 2, cy + ch / 2);
          ctx.rotate(Math.PI);
          ctx.drawImage(pageCanvas, -cw / 2, -ch / 2, cw, ch);
        } else {
          ctx.drawImage(pageCanvas, cx, cy, cw, ch);
        }

        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx, cy, cw, ch);

        ctx.restore();
      }
    }

    if (marks) {
      this.drawMarks(ctx, marks, scale);
    }
  }

  private drawMarks(
    ctx: CanvasRenderingContext2D,
    marks: MarksOverlay,
    scale: number,
  ) {
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';

    ctx.lineWidth = marks.cropLineThickness * scale;
    for (const line of marks.cropLines) {
      ctx.beginPath();
      ctx.moveTo(line.x1 * scale, line.y1 * scale);
      ctx.lineTo(line.x2 * scale, line.y2 * scale);
      ctx.stroke();
    }

    for (const reg of marks.registrationCenters) {
      const cx = reg.cx * scale;
      const cy = reg.cy * scale;
      const size = 8 * scale;

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.5;

      ctx.beginPath();
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - size, cy);
      ctx.lineTo(cx + size, cy);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx, cy + size);
      ctx.stroke();
    }

    for (const bb of marks.bleedBoxes) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        bb.x * scale,
        bb.y * scale,
        bb.w * scale,
        bb.h * scale,
      );
      ctx.setLineDash([]);
    }

    for (const patch of marks.colorBarPatches) {
      ctx.fillStyle = patch.color;
      ctx.fillRect(
        patch.x * scale,
        patch.y * scale,
        patch.w * scale,
        patch.h * scale,
      );
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.3;
      ctx.strokeRect(
        patch.x * scale,
        patch.y * scale,
        patch.w * scale,
        patch.h * scale,
      );
    }

    for (const fold of marks.foldLines) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(0.5, 1.5 * scale);
      ctx.setLineDash([4 * scale, 4 * scale]);
      ctx.beginPath();
      ctx.moveTo(fold.x1 * scale, fold.y1 * scale);
      ctx.lineTo(fold.x2 * scale, fold.y2 * scale);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const bm of marks.bindingMarks) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.5;
      const cx = bm.cx * scale;
      const cy = bm.cy * scale;
      const r = bm.radius * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const cm of marks.collatingMarks) {
      ctx.fillStyle = '#000';
      ctx.fillRect(
        cm.x * scale,
        cm.y * scale,
        cm.w * scale,
        cm.h * scale,
      );
    }

    for (const label of marks.signatureLabels) {
      ctx.fillStyle = '#000';
      ctx.font = `${Math.max(7, 8 * scale)}px Inter, sans-serif`;
      const tx = label.x * scale;
      const ty = label.y * scale;
      ctx.fillText(label.text, tx, ty);
    }

    ctx.restore();
  }

  clearCache(): void {
    this.pageCache.clear();
  }

  dispose(): void {
    this.clearCache();
    disposePdfJs();
  }
}

export const previewEngine = new PreviewEngine();
