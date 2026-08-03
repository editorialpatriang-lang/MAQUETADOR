import { useDocumentStore } from '@/store/documentStore';
import { calcularCreepAutomatico } from '@/lib/pdf/imposition/booklet';
import { NumberInput } from '@/components/ui/NumberInput';
import { Toggle } from '@/components/ui/Toggle';
import { Select } from '@/components/ui/Select';

const GSM_OPTIONS = [
  { value: '70', label: '70 gsm (biblia)' },
  { value: '80', label: '80 gsm (obra estándar)' },
  { value: '90', label: '90 gsm (obra)' },
  { value: '100', label: '100 gsm' },
  { value: '115', label: '115 gsm (semi-couché)' },
  { value: '120', label: '120 gsm' },
  { value: '130', label: '130 gsm (couché mate)' },
  { value: '135', label: '135 gsm' },
  { value: '150', label: '150 gsm (couché brillo)' },
  { value: '170', label: '170 gsm' },
  { value: '200', label: '200 gsm' },
  { value: '250', label: '250 gsm (cartulina)' },
  { value: '300', label: '300 gsm' },
  { value: '350', label: '350 gsm' },
];

export function BookletControls() {
  const pageCount = useDocumentStore((s) => s.pageCount);
  const booklet = useDocumentStore((s) => s.booklet);
  const setBookletConfig = useDocumentStore((s) => s.setBookletConfig);

  const creepAuto = calcularCreepAutomatico(pageCount, booklet.paperGsm, booklet.signatureSize);
  const totalPliegos = Math.ceil(Math.ceil(pageCount / 4) * 4 / 4);
  const sigSize = booklet.signatureSize > 0 && booklet.signatureSize < pageCount
    ? booklet.signatureSize
    : pageCount;
  const numCuadernillos = Math.ceil(pageCount / sigSize);

  return (
    <div className="space-y-4">
      <NumberInput
        label="Páginas por cuadernillo"
        value={booklet.signatureSize}
        onChange={(v) => setBookletConfig({ signatureSize: v })}
        min={0}
        max={pageCount || 100}
        step={4}
      />
      <p className="text-xs text-gray-400 -mt-2">
        {booklet.signatureSize <= 0
          ? '1 cuadernillo con todas las páginas.'
          : `${numCuadernillos} cuadernillo${numCuadernillos !== 1 ? 's' : ''} de ${sigSize} págs c/u.`}{' '}
        Total: {totalPliegos} {totalPliegos === 1 ? 'pliego' : 'pliegos'}.
      </p>

      <div className="space-y-2">
        <Select
          label="Gramaje del papel"
          value={String(booklet.paperGsm)}
          onChange={(v) => setBookletConfig({ paperGsm: Number(v) })}
          options={GSM_OPTIONS}
        />
        <p className="text-xs text-gray-400">
          Define el calibre del papel para el cálculo de creep.
        </p>
      </div>

      <div className="space-y-2">
        <Toggle
          label="Creep automático"
          checked={booklet.autoCreep}
          onChange={(v) => setBookletConfig({ autoCreep: v })}
        />

        {booklet.autoCreep ? (
          <div className="rounded-md border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Valor calculado
              </span>
              <span className="text-sm font-bold tabular-nums text-blue-700 dark:text-blue-400">
                {creepAuto.toFixed(2)} pt
              </span>
            </div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/60 mt-1">
              Basado en {sigSize} págs/cuadernillo y {booklet.paperGsm} gsm. Las hojas exteriores se desplazan hacia afuera para compensar el grosor acumulado del papel al cortar en guillotina.
            </p>
          </div>
        ) : (
          <NumberInput
            label="Creep manual"
            value={booklet.manualCreep}
            onChange={(v) => setBookletConfig({ manualCreep: v })}
            min={0}
            max={50}
            step={0.1}
            unit="pt"
          />
        )}
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-3">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
          Marcas en saddle-stitch
        </h4>
        <div className="text-[10px] text-gray-400 leading-relaxed space-y-0.5">
          <p>· Crop marks: bordes exteriores de cada página</p>
          <p>· Marca de doblez: punteada en el lomo, fuera del arte</p>
          <p>· La posición del lomo se ajusta con el creep</p>
          <p>· Todas las páginas a 0° (sin rotar)</p>
        </div>
      </div>
    </div>
  );
}
