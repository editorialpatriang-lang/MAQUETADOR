# MAQUETADOR

**Herramienta profesional de imposición de PDFs para imprenta offset y digital. Basada en el modelo conceptual CIP4 JDF 1.8.**

MAQUETADOR toma un PDF fuente y reordena sus páginas en pliegos de impresión listos para producción, aplicando marcas de corte, registro, barras de color CMYK, marcas de pliegue y más. Todo con previsualización en tiempo real WYSIWYG y exportación PDF/X-4.

![Stack](https://img.shields.io/badge/stack-React%2018%20%2B%20Vite%206%20%2B%20TypeScript%205-blue)
![PDF](https://img.shields.io/badge/PDF-pdf--lib%20%2B%20pdfjs--dist-red)
![State](https://img.shields.io/badge/state-zustand-orange)
![CSS](https://img.shields.io/badge/css-Tailwind%20CSS%203-06b6d4)
![UI](https://img.shields.io/badge/ui-Español-green)

---

## Tabla de contenidos

- [Imposición](#imposición)
- [Marcas de producción](#marcas-de-producción)
- [Control de calidad en encuadernación](#control-de-calidad-en-encuadernación)
- [Flujo de trabajo profesional](#flujo-de-trabajo-profesional)
- [Instalación y uso](#instalación-y-uso)
- [Atajos de teclado](#atajos-de-teclado)
- [Stack técnico](#stack-técnico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Roadmap](#roadmap)

---

## Imposición

### Folleto (Booklet / Saddle-stitch)

Imposición para encuadernación a caballete (grapa al lomo). Las páginas se ordenan automáticamente para que al doblar el pliego queden en orden de lectura.

- **Orden de páginas:** saddle-stitch automático (última+primera, penúltima+segunda, etc.)
- **Cuadernillos:** tamaño de cuadernillo configurable para documentos largos
- **Creep (desplazamiento por calibre):** automático basado en gramaje real del papel, con tabla de calibres de 70 a 350 gsm e interpolación para valores intermedios
- **Creep manual:** opción de desplazamiento manual en puntos
- **Todas las páginas a 0°:** sin rotación — al doblar el pliego por el lomo, el folleto se lee en orden natural
- **Línea de doblez:** punteada en el centro del pliego
- **Marcas de corte:** solo en los bordes exteriores

---

## Marcas de producción

Todas las marcas se dibujan tanto en la previsualización como en el PDF exportado. Se configuran desde el panel lateral **Marcas de producción**.

### Marcas de corte (crop marks)
Líneas en las esquinas de cada página indicando dónde cortar.

- **Largo de línea:** 5–50 pt
- **Separación de la esquina:** 0–30 pt
- **Grosor de línea:** 0.1–3 pt
- **En modo booklet:** solo en bordes exteriores (los bordes internos son de doblez, no de corte)

### Marcas de registro (registration marks)
Cruces con círculo para alineación de planchas de color. Se colocan en 6 posiciones: 4 esquinas + 2 centros verticales.

### Barra de color (color bar)
Patches de control de calidad para el impresor.

- **CMYK real:** cian 100%, magenta 100%, amarillo 100%, negro 100%, sobreimpresiones M+Y, C+Y, C+M, C+M+Y
- **Escala de grises:** 100%, 50%, 25%, 10%
- En el PDF exportado se usan tintas CMYK nativas (`cmyk()` de pdf-lib), no RGB convertido

### Marcas de pliegue (fold marks)
Líneas punteadas en el lomo (centro del pliego) indicando dónde doblar el folleto. Se activan con un toggle independiente.

### Perforación / encuadernado
Marcas circulares para estilos de encuadernación predefinidos:

- **Wire-O:** perforaciones cada 30 pt, radio 4 pt
- **Espiral:** perforaciones cada 28 pt, radio 3 pt
- **Carpeta (3 anillos):** perforaciones cada 28 pt, radio 3 pt

### Sangrado (bleed)
Rectángulos rojos punteados alrededor de cada celda mostrando la zona de sangrado. Configurable de 0 a 50 pt.

### Slug de trabajo
Etiqueta multilínea en la parte superior de cada plancha con metadata completa del trabajo:

- **Línea 1:** nombre de archivo, fecha, pliego X/N
- **Línea 2:** tipo de imposición, cantidad de páginas, dirección de fibra
- **Línea 3 (PDF/X-4):** perfil ICC

---

## Control de calidad en encuadernación

### Dirección de fibra del papel (grain direction)
Configurable desde **Hoja → Dirección de fibra**:

- **Fibra larga (FL):** paralela al lomo. Recomendada para libros — evita que el papel se quiebre al plegar.
- **Fibra corta (FC):** perpendicular al lomo. Para trabajos donde la rigidez lateral es prioritaria.

La dirección de fibra se refleja en el slug de trabajo de cada plancha para referencia del impresor y encuadernador.

---

## Flujo de trabajo profesional

### Configuración de hoja

| Opción | Descripción |
|--------|-------------|
| **Tamaño de hoja** | A4, A3, Mega A3 (330×480mm), Carta, Legal, Tabloide, Personalizado |
| **Orientación** | Vertical / Horizontal |
| **Dirección de fibra** | Fibra larga (paralela al lomo) o corta (perpendicular) |
| **Unidad** | Milímetros, centímetros, pulgadas |
| **Márgenes** | Margen general (0–200 pt) |
| **Margen de pinza** | Gripper margin configurable por lado (arriba, abajo, izquierda, derecha). Tamaño personalizable (0–100 pt). Se descuenta del área útil. |
| **Separación (gutter)** | Espacio entre celdas en el lomo del pliego |
| **Centrar contenido** | Centra la grilla de imposición en la hoja |

### Manejo de PDF sin sangrado

Cuando el PDF fuente no tiene bleed, MAQUETADOR ofrece 4 estrategias:

- **No hacer nada:** el contenido se coloca tal cual (puede dejar bordes blancos si hay sangrado configurado)
- **Escalar:** escala la página para llenar el área de sangrado
- **Recortar:** recorta al borde exacto de la página original
- **Extender con color:** agrega un marco del color elegido alrededor de la página

### Exportación PDF/X-4

Al activar "Exportar como PDF/X-4", el archivo exportado incluye:

- **TrimBox:** área de corte final
- **BleedBox:** área total incluyendo sangrado
- **Metadata:** título, creador y productor
- **Todas las marcas en CMYK:** registration black (100% C+M+Y+K)
- **Perfil ICC seleccionable:**
  - FOGRA39 (offset estándar)
  - GRACoL 2006 (Norteamérica)
  - SWOP v2 (impresión web)
  - ISO Coated v2 (Europa)

### Overprint preview

Toggle que activa una simulación visual de sobreimpresión en la previsualización. Las zonas con tinta se muestran semitransparentes para identificar áreas de overprint vs. knockout.

---

## Instalación y uso

### Requisitos

- Node.js 18+
- npm 9+

### Instalación

```bash
git clone https://github.com/usuario/maquetador.git
cd maquetador
npm install
```

### Desarrollo

```bash
npm run dev
```

Abre http://localhost:5173 en el navegador.

### Build de producción

```bash
npm run build
npm run preview
```

### Uso rápido

1. Arrastrá un PDF a la zona de carga o presioná **Ctrl+O**
2. Configurá el cuadernillo (páginas por cuadernillo, gramaje, creep)
3. Configurá tamaño de hoja, márgenes y marcas de producción
4. Navegá entre hojas con los botones ← →
5. Ajustá el zoom con los botones **−** / **+** / **Ajustar**
6. Clic en **Exportar PDF** para descargar el archivo imposicionado

---

## Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl + O` | Abrir archivo PDF |
| `Ctrl + B` | Colapsar/expandir panel de configuración |
| `Ctrl + rueda` | Zoom (próximamente) |

---

## Stack técnico

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| [React](https://react.dev) | 18.3 | UI |
| [Vite](https://vitejs.dev) | 6.0 | Bundler y dev server |
| [TypeScript](https://typescriptlang.org) | 5.6 | Lenguaje (strict mode) |
| [Tailwind CSS](https://tailwindcss.com) | 3.4 | Estilos utilitarios |
| [pdf-lib](https://pdf-lib.js.org) | 1.17 | Manipulación y exportación de PDFs |
| [pdfjs-dist](https://mozilla.github.io/pdf.js) | 4.10 | Renderizado de previews |
| [Zustand](https://zustand-demo.pmnd.rs) | 4.5 | Estado global |

---

## Estructura del proyecto

```
src/
├── components/
│   ├── Layout/
│   │   ├── Sidebar.tsx          # Panel lateral de configuración
│   │   └── Toolbar.tsx          # Barra superior (título, dark mode, exportar)
│   ├── controls/
│   │   ├── BookletControls.tsx  # Configuración de folleto (cuadernillo, creep, gramaje)
│   │   ├── MarksControls.tsx    # Marcas de producción
│   │   └── SheetSettings.tsx    # Configuración de hoja y pinza
│   ├── ui/
│   │   ├── Button.tsx           # Botón reutilizable
│   │   ├── ErrorBanner.tsx      # Banner de error con dismiss
│   │   ├── NumberInput.tsx      # Input numérico con unidad
│   │   ├── Select.tsx           # Select estilizado
│   │   ├── Spinner.tsx          # Indicador de carga
│   │   └── Toggle.tsx           # Toggle switch
│   ├── FileDropzone.tsx         # Drag & drop para cargar PDF
│   └── PreviewCanvas.tsx        # Canvas de previsualización con zoom y navegación
├── lib/pdf/
│   ├── imposition/
│   │   └── booklet.ts           # Lógica de imposición saddle-stitch + creep
│   ├── exportPdf.ts             # Exportación del PDF final con pdf-lib
│   ├── marks.ts                 # Cálculo de todas las marcas de producción
│   ├── previewEngine.ts         # Motor de renderizado de preview (canvas)
│   └── renderPreview.ts         # Renderizado con pdfjs-dist
├── store/
│   └── documentStore.ts         # Estado global con Zustand
├── types/
│   └── imposition.ts            # Tipos TypeScript, constantes, presets
├── App.tsx                      # Componente raíz
├── main.tsx                     # Punto de entrada
└── index.css                    # Estilos globales + Tailwind
```

---

## Roadmap

### Implementado ✅

- [x] Imposición Booklet (saddle-stitch) con orden automático de páginas
- [x] Cuadernillos configurables para documentos largos
- [x] Creep automático por calibre real (tabla de 14 gramajes con interpolación)
- [x] Creep manual en puntos
- [x] Marcas de corte, registro, pliegue, sangrado
- [x] Barra de color CMYK real (separaciones nativas en pdf-lib)
- [x] Margen de pinza (gripper margin) configurable por lado
- [x] Dirección de fibra del papel (grain direction)
- [x] Slug de trabajo multilínea (archivo, fecha, imposición, fibra, perfil ICC)
- [x] WYSIWYG real entre preview canvas y PDF exportado
- [x] Exportación PDF/X-4 con TrimBox, BleedBox, metadata
- [x] Perfiles ICC seleccionables (FOGRA39, GRACoL, SWOPv2, ISOcoatedv2)
- [x] Manejo de PDF sin sangrado (escalar, recortar, extender con color)
- [x] Perforación / encuadernado predefinido (wire-o, espiral, carpeta)
- [x] Overprint preview
- [x] UI 100% en español
- [x] Dark mode con persistencia
- [x] Drag & drop de PDFs
- [x] Validación de PDFs encriptados
- [x] Múltiples unidades (mm, cm, pulgadas)
- [x] Modelo conceptual alineado a CIP4 JDF 1.8

### Próximamente

- [ ] Persistencia de configuración entre sesiones
- [ ] Soporte multi-archivo (varios PDFs simultáneos)
- [ ] Historial de cambios (undo)
- [ ] Barra de progreso en exportación de PDFs grandes
- [ ] Worker de pdf.js embebido (modo offline)
- [ ] Optimización automática de hoja de imposición
- [ ] Exportación JDF para integración con RIP/MIS
- [ ] Reintroducir otros tipos de imposición (N-up, Perfect Bound, Cards, Cut & Stack, Work & Turn, Work & Tumble)

---

## Licencia

MIT