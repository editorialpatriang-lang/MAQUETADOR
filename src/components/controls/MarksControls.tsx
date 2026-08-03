import { useDocumentStore } from '@/store/documentStore';
import { Toggle } from '@/components/ui/Toggle';
import { NumberInput } from '@/components/ui/NumberInput';
import { Select } from '@/components/ui/Select';

export function MarksControls() {
  const marks = useDocumentStore((s) => s.marks);
  const setMarksConfig = useDocumentStore((s) => s.setMarksConfig);

  return (
    <div className="space-y-3">
      <Toggle
        label="Marcas de corte"
        checked={marks.cropMarks}
        onChange={(v) => setMarksConfig({ cropMarks: v })}
      />
      {marks.cropMarks && (
        <>
          <NumberInput
            label="Largo de línea"
            value={marks.cropMarkLength}
            onChange={(v) => setMarksConfig({ cropMarkLength: v })}
            min={5}
            max={50}
            step={0.5}
            unit="pt"
          />
          <NumberInput
            label="Separación de la esquina"
            value={marks.cropMarkOffset}
            onChange={(v) => setMarksConfig({ cropMarkOffset: v })}
            min={0}
            max={30}
            step={0.5}
            unit="pt"
          />
          <NumberInput
            label="Grosor de línea"
            value={marks.cropMarkThickness}
            onChange={(v) => setMarksConfig({ cropMarkThickness: v })}
            min={0.1}
            max={3}
            step={0.05}
            unit="pt"
          />
        </>
      )}
      <Toggle
        label="Marcas de registro"
        checked={marks.registrationMarks}
        onChange={(v) => setMarksConfig({ registrationMarks: v })}
      />
      <Toggle
        label="Marcas de pliegue"
        checked={marks.foldMarks}
        onChange={(v) => setMarksConfig({ foldMarks: v })}
      />
      {marks.foldMarks && (
        <p className="text-xs text-gray-400">
          Línea punteada en el lomo (centro del pliego) indicando dónde doblar el folleto.
        </p>
      )}
      <Toggle
        label="Barra de color"
        checked={marks.colorBar}
        onChange={(v) => setMarksConfig({ colorBar: v })}
      />
      {marks.colorBar && (
        <Select
          label="Tipo de barra"
          value={marks.colorBarType}
          onChange={(v) => setMarksConfig({ colorBarType: v as 'CMYK' | 'grayscale' })}
          options={[
            { value: 'CMYK', label: 'CMYK (cian, magenta, amarillo, negro)' },
            { value: 'grayscale', label: 'Escala de grises' },
          ]}
        />
      )}
      <NumberInput
        label="Sangrado (bleed)"
        value={marks.bleed}
        onChange={(v) => setMarksConfig({ bleed: v })}
        min={0}
        max={50}
        step={0.5}
        unit="pt"
      />

      <Select
        label="Perforación / encuadernado"
        value={marks.bindingStyle}
        onChange={(v) => setMarksConfig({ bindingStyle: v as 'none' | 'wire-o' | 'spiral' | 'binder' })}
        options={[
          { value: 'none', label: 'Ninguno' },
          { value: 'wire-o', label: 'Wire-O' },
          { value: 'spiral', label: 'Espiral' },
          { value: 'binder', label: 'Carpeta (3 anillos)' },
        ]}
      />

      <Toggle
        label="Slug de trabajo"
        checked={marks.signatureNumbering}
        onChange={(v) => setMarksConfig({ signatureNumbering: v })}
      />
      {marks.signatureNumbering && (
        <p className="text-xs text-gray-400">
          Imprime nombre de archivo, fecha, pliego, tipo de imposición, páginas y fibra en la esquina inferior izquierda en tipografía pequeña.
        </p>
      )}

      <Toggle
        label="Exportar como PDF/X-4"
        checked={marks.pdfxOutput}
        onChange={(v) => setMarksConfig({ pdfxOutput: v })}
      />
      {marks.pdfxOutput && (
        <>
          <Select
            label="Perfil de color ICC"
            value={marks.pdfxProfile}
            onChange={(v) => setMarksConfig({ pdfxProfile: v as 'FOGRA39' | 'GRACoL2006' | 'SWOPv2' | 'ISOcoatedv2' })}
            options={[
              { value: 'FOGRA39', label: 'FOGRA39 (offset estándar)' },
              { value: 'GRACoL2006', label: 'GRACoL 2006 (Norteamérica)' },
              { value: 'SWOPv2', label: 'SWOP v2 (impresión web)' },
              { value: 'ISOcoatedv2', label: 'ISO Coated v2 (Europa)' },
            ]}
          />
          <p className="text-xs text-gray-400">
            Agrega TrimBox, BleedBox, MediaBox y metadata de compliance PDF/X-4.
          </p>
        </>
      )}

      <Toggle
        label="Overprint preview"
        checked={marks.overprintPreview}
        onChange={(v) => setMarksConfig({ overprintPreview: v })}
      />
      {marks.overprintPreview && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Simulación visual de sobreimpresión. Las zonas con tinta se muestran semitransparentes.
        </p>
      )}
    </div>
  );
}