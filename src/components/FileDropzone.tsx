import { useCallback, useRef, useState, DragEvent } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

const MAX_SIZE = 100 * 1024 * 1024;

export function FileDropzone() {
  const { loadFile, originalFile, pageCount, fileName, fileSize, isProcessing, error, setError, reset } =
    useDocumentStore();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndLoad = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError('Solo se aceptan archivos PDF.');
        return;
      }
      if (file.size > MAX_SIZE) {
        setError(`El archivo supera el límite de 100 MB.`);
        return;
      }
      await loadFile(file);
    },
    [loadFile, setError],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) validateAndLoad(file);
    },
    [validateAndLoad],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndLoad(file);
    },
    [validateAndLoad],
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isProcessing) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6 text-center">
        <Spinner />
        <p className="text-sm text-gray-500 mt-2">Procesando PDF…</p>
      </div>
    );
  }

  if (originalFile && !error) {
    return (
      <div className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={fileName}>
              {fileName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {pageCount} {pageCount === 1 ? 'página' : 'páginas'} · {formatSize(fileSize)}
            </p>
          </div>
          <button
            onClick={reset}
            className="shrink-0 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Quitar archivo"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`mt-2 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors
          ${isDragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30'
            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900'
          }`}
      >
        <div className="flex flex-col items-center gap-3">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-gray-400"
          >
            <path d="M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            <path d="M12 7v6M9 10l3-3 3 3" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Arrastra un PDF aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-400 mt-1">Máximo 100 MB · Solo archivos PDF</p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
