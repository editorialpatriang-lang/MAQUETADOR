import { FileDropzone } from '@/components/FileDropzone';
import { BookletControls } from '@/components/controls/BookletControls';
import { SheetSettings } from '@/components/controls/SheetSettings';
import { MarksControls } from '@/components/controls/MarksControls';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 dark:border-gray-800/50 last:border-b-0 pb-4 mb-4 last:mb-0 last:pb-0">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function ControlsForType() {
  return <BookletControls />;
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  if (!open) return null;

  return (
    <aside className="h-full border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col min-h-0">
      <div className="sticky top-0 z-10 flex items-center justify-between p-3 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Configuración</span>
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
          title="Cerrar panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <Section title="Archivo">
          <FileDropzone />
        </Section>

        <Section title="Imposición">
          <div className="mt-3">
            <ControlsForType />
          </div>
        </Section>

        <Section title="Hoja">
          <SheetSettings />
        </Section>

        <Section title="Marcas de producción">
          <MarksControls />
        </Section>
      </div>
    </aside>
  );
}
