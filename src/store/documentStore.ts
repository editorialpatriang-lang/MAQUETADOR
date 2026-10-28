import { create } from 'zustand';
import type {
  ImpositionType,
  Unit,
  Orientation,
  BookletConfig,
  ProductionMarks,
  SheetConfig,
  GripperConfig,
  SheetPreset,
  NUpConfig,
} from '@/types/imposition';
import { SHEET_PRESETS } from '@/types/imposition';

const DEFAULT_BOOKLET: BookletConfig = { signatureSize: 0, autoCreep: false, manualCreep: 0, paperGsm: 130 };
const DEFAULT_NUP: NUpConfig = { columns: 2, rows: 2, allowRotation: true, autoFill: true };
const DEFAULT_MARKS: ProductionMarks = { cropMarks: true, cropMarkLength: 20, cropMarkOffset: 6, cropMarkThickness: 0.25, registrationMarks: false, bleed: 0, colorBar: false, colorBarType: 'CMYK', pdfxOutput: false, pdfxProfile: 'FOGRA39', foldMarks: false, bindingStyle: 'none', collatingMarks: false, signatureNumbering: false, overprintPreview: false };
// MegaA3 en horizontal (480 x 330 mm), coherente con orientation: 'landscape'.
// setSheetPreset respeta esta orientacion al aplicar cualquier otro preset.
const DEFAULT_SHEET: SheetConfig = { preset: 'MegaA3', width: 1360.63, height: 935.43, orientation: 'landscape', grainDirection: 'long', margins: 36, gutter: 14, centerContent: true, gripper: { enabled: false, size: 34, side: 'bottom' }, bleedMode: 'none', extendColor: '#ffffff', materialScale: 'fit', materialPercent: 100 };

interface DocumentState {
  originalFile: File | null;
  originalPdfBytes: ArrayBuffer | null;
  pageCount: number;
  fileName: string;
  fileSize: number;
  originalPageWidth: number;
  originalPageHeight: number;
  originalBleed: number;

  impositionType: ImpositionType;
  booklet: BookletConfig;
  nup: NUpConfig;
  sheet: SheetConfig;
  marks: ProductionMarks;
  unit: Unit;

  previewScale: number;
  currentSheetIndex: number;
  isProcessing: boolean;
  error: string | null;
  darkMode: boolean;

  loadFile: (file: File) => Promise<void>;
  reset: () => void;
  setImpositionType: (type: ImpositionType) => void;
  setBookletConfig: (config: Partial<BookletConfig>) => void;
  setNUpConfig: (config: Partial<NUpConfig>) => void;
  setSheetConfig: (config: Partial<SheetConfig>) => void;
  setSheetOrientation: (orientation: Orientation) => void;
  setSheetPreset: (preset: SheetPreset) => void;
  setGripperConfig: (config: Partial<GripperConfig>) => void;
  setMarksConfig: (config: Partial<ProductionMarks>) => void;
  setUnit: (unit: Unit) => void;
  setPreviewScale: (scale: number) => void;
  setCurrentSheetIndex: (index: number) => void;
  setIsProcessing: (v: boolean) => void;
  setError: (error: string | null) => void;
  toggleDarkMode: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  originalFile: null,
  originalPdfBytes: null,
  pageCount: 0,
  fileName: '',
  fileSize: 0,
  originalPageWidth: 595.28,
  originalPageHeight: 841.89,
  originalBleed: 0,

  impositionType: 'booklet',
  booklet: DEFAULT_BOOKLET,
  nup: DEFAULT_NUP,
  sheet: DEFAULT_SHEET,
  marks: DEFAULT_MARKS,
  unit: 'mm',

  previewScale: 0.5,
  currentSheetIndex: 0,
  isProcessing: false,
  error: null,
  darkMode: typeof window !== 'undefined' ? localStorage.getItem('maquetador-dark-mode') === 'true' : false,

  loadFile: async (file: File) => {
    set({ isProcessing: true, error: null, originalFile: file, fileName: file.name, fileSize: file.size });

    try {
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await file.arrayBuffer();

      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
      } catch (encErr: unknown) {
        const encMsg = encErr instanceof Error ? encErr.message : '';
        if (encMsg.includes('encrypted') || encMsg.includes('password')) {
          // Intentar con ignoreEncryption para PDFs con permisos restrictivos
          try {
            pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          } catch {
            throw encErr;
          }
        } else {
          throw encErr;
        }
      }
      const pageCount = pdfDoc.getPageCount();

      let pw = 595.28;
      let ph = 841.89;
      let detectedBleed = 0;
      if (pageCount > 0) {
        const firstPage = pdfDoc.getPage(0);
        const media = firstPage.getMediaBox();
        const trim = firstPage.getTrimBox();
        const bleedBox = firstPage.getBleedBox();
        // Sangrado recuperado del archivo: diferencia entre MediaBox (o
        // BleedBox) y TrimBox, asumiendo trim centrado.
        const bleedX = (media.width - trim.width) / 2;
        const bleedY = (media.height - trim.height) / 2;
        const fromBleedBoxX = (bleedBox.width - trim.width) / 2;
        const fromBleedBoxY = (bleedBox.height - trim.height) / 2;
        const candidates = [bleedX, bleedY, fromBleedBoxX, fromBleedBoxY].filter((v) => v > 0.5);
        detectedBleed = candidates.length ? Math.min(...candidates) : 0;
        // Tamaño de página = TrimBox (tamaño final), no MediaBox.
        if (trim.width > 0 && trim.height > 0 && (trim.width !== media.width || trim.height !== media.height)) {
          pw = trim.width;
          ph = trim.height;
        } else {
          pw = media.width;
          ph = media.height;
        }
      }

      set({
        originalPdfBytes: arrayBuffer,
        pageCount,
        originalPageWidth: pw,
        originalPageHeight: ph,
        originalBleed: detectedBleed,
        isProcessing: false,
        currentSheetIndex: 0,
      });
      if (detectedBleed > 0) {
        set((st) => ({ marks: { ...st.marks, bleed: detectedBleed } }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      const isEncrypted =
        msg.includes('encrypted') || msg.includes('password') || msg.includes('cifrado');
      set({
        isProcessing: false,
        error: isEncrypted
          ? 'El PDF está protegido con contraseña. No se pueden procesar archivos encriptados.'
          : `Error al cargar el PDF: ${msg}`,
        originalPdfBytes: null,
        pageCount: 0,
      });
    }
  },

  reset: () =>
    set({
      originalFile: null,
      originalPdfBytes: null,
      pageCount: 0,
      fileName: '',
      fileSize: 0,
      originalPageWidth: 595.28,
      originalPageHeight: 841.89,
      originalBleed: 0,
      impositionType: 'booklet',
      booklet: DEFAULT_BOOKLET,
      nup: DEFAULT_NUP,
      sheet: DEFAULT_SHEET,
      marks: DEFAULT_MARKS,
      unit: 'mm',
      previewScale: 0.5,
      currentSheetIndex: 0,
      isProcessing: false,
      error: null,
    }),

  setImpositionType: (type) => set({ impositionType: type, currentSheetIndex: 0 }),

  setBookletConfig: (config) =>
    set((s) => ({ booklet: { ...s.booklet, ...config }, currentSheetIndex: 0 })),

  setNUpConfig: (config) =>
    set((s) => ({ nup: { ...s.nup, ...config }, currentSheetIndex: 0 })),

  setSheetConfig: (config) =>
    set((s) => ({ sheet: { ...s.sheet, ...config }, currentSheetIndex: 0 })),

  setSheetOrientation: (orientation) =>
    set((s) => ({
      sheet: {
        ...s.sheet,
        orientation,
        width: s.sheet.height,
        height: s.sheet.width,
      },
      currentSheetIndex: 0,
    })),

  setSheetPreset: (preset) =>
    set((s) => {
      const size = SHEET_PRESETS[preset];
      if (!size) return {};
      // Los presets se guardan en vertical. Si la hoja actual estaba en
      // horizontal, se invierte el preset para respetar la orientacion elegida
      // (si no, orientation queda mintiendo y la fibra queda mal definida).
      const wasLandscape = s.sheet.width > s.sheet.height;
      const width = wasLandscape ? size.height : size.width;
      const height = wasLandscape ? size.width : size.height;
      return { sheet: { ...s.sheet, preset, width, height }, currentSheetIndex: 0 };
    }),

  setGripperConfig: (config) =>
    set((s) => ({
      sheet: { ...s.sheet, gripper: { ...s.sheet.gripper, ...config } },
      currentSheetIndex: 0,
    })),

  setMarksConfig: (config) =>
    set((s) => ({ marks: { ...s.marks, ...config }, currentSheetIndex: 0 })),

  setUnit: (unit) => set({ unit }),

  setPreviewScale: (scale) => set({ previewScale: scale }),

  setCurrentSheetIndex: (index) => set({ currentSheetIndex: index }),

  setIsProcessing: (v) => set({ isProcessing: v }),

  setError: (error) => set({ error }),

  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('maquetador-dark-mode', String(next));
      return { darkMode: next };
    }),
}));
