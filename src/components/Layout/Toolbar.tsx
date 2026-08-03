import { useDocumentStore } from '@/store/documentStore';
import { Button } from '@/components/ui/Button';
import { exportPdf } from '@/lib/pdf/exportPdf';
import { calculateBookletLayout } from '@/lib/pdf/imposition/booklet';
import type { ImpositionLayout } from '@/types/imposition';

function getLayout(store: ReturnType<typeof useDocumentStore.getState>): ImpositionLayout {
  const { pageCount, originalPageWidth, originalPageHeight, booklet, sheet } = store;
  return calculateBookletLayout(pageCount, originalPageWidth, originalPageHeight, booklet, sheet);
}

export function Toolbar() {
  const darkMode = useDocumentStore((s) => s.darkMode);
  const toggleDarkMode = useDocumentStore((s) => s.toggleDarkMode);
  const pageCount = useDocumentStore((s) => s.pageCount);
  const originalPdfBytes = useDocumentStore((s) => s.originalPdfBytes);
  const fileName = useDocumentStore((s) => s.fileName);
  const isProcessing = useDocumentStore((s) => s.isProcessing);
  const setIsProcessing = useDocumentStore((s) => s.setIsProcessing);
  const setError = useDocumentStore((s) => s.setError);

  const handleExport = async () => {
    if (!originalPdfBytes || pageCount === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const store = useDocumentStore.getState();
      const layout = getLayout(store);
      const { marks, sheet } = store;

      const pdfBytes = await exportPdf(
        originalPdfBytes,
        layout,
        layout.sheetWidth,
        layout.sheetHeight,
        marks,
        sheet.margins,
        fileName,
        pageCount,
        sheet.grainDirection,
      );

      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\.pdf$/i, '') + '_imposicionado.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📐</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">MAQUETADOR</span>
        </div>
        {fileName && (
          <span className="hidden sm:inline text-xs text-gray-400 truncate max-w-[200px]">
            {fileName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={darkMode ? 'Modo claro' : 'Modo oscuro'}
        >
          {darkMode ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>

        <Button
          onClick={handleExport}
          disabled={!originalPdfBytes || isProcessing}
          size="md"
        >
          {isProcessing ? 'Exportando…' : 'Exportar PDF'}
        </Button>
      </div>
    </header>
  );
}