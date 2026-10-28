import { useDocumentStore } from '@/store/documentStore';
import { NUpConfig } from '@/types/imposition';
import { NumberInput } from '@/components/ui/NumberInput';
import { Toggle } from '@/components/ui/Toggle';
import { Select } from '@/components/ui/Select';

export function NUpControls() {
  const nup = useDocumentStore((s) => s.nup);
  const setNUpConfig = useDocumentStore((s) => s.setNUpConfig);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label="Columnas"
          value={nup.columns}
          onChange={(v) => setNUpConfig({ columns: Math.max(1, Math.round(v)) })}
          min={1}
          max={10}
          step={1}
        />
        <NumberInput
          label="Filas"
          value={nup.rows}
          onChange={(v) => setNUpConfig({ rows: Math.max(1, Math.round(v)) })}
          min={1}
          max={10}
          step={1}
        />
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        {nup.columns * nup.rows} páginas por pliego.
      </p>
      <Toggle
        label="Rotación automática (90°)"
        checked={nup.allowRotation}
        onChange={(v) => setNUpConfig({ allowRotation: v })}
      />
      <Toggle
        label="Rellenar última hoja con blancos"
        checked={nup.autoFill}
        onChange={(v) => setNUpConfig({ autoFill: v })}
      />
    </div>
  );
}