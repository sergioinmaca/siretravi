# Especificación de Diseño — Exportar PDF del Menú Semanal (Módulo Cocina)

Fecha: 2026-08-12
Estado: Aprobado por el usuario
Referencia de plantilla: `docs/Plantilla Menu Semanal.pdf`

## 1. Objetivo

Agregar al módulo **Cocina** un botón **"Exportar PDF"** que descargue un PDF con la organización del menú semanal del campamento seleccionado. El PDF debe replicar fielmente la plantilla proporcionada en `docs/Plantilla Menu Semanal.pdf` (estilo visual distinto al de los demás PDFs del proyecto), ser dinámico en el número de columnas de comida (mín. 3, máx. 6) y mostrar la tipografía en mayúsculas/minúsculas tal como está guardada.

## 2. Alcance

### 2.1. Incluye
- Botón "Exportar PDF" en la página de Cocina (permiso `Ver`).
- Función de generación del PDF con jsPDF vectorial, tamaño Carta horizontal.
- Replicación de la plantilla: bandas azul y roja, logos, tabla con días y comidas.
- Columnas dinámicas según slots activos (3 a 6 comidas) + columna de días.
- Celdas con `menu` y `bebida` (texto envuelto, sin mayúsculas forzadas).
- Eliminación de la restricción de mayúsculas en el módulo Cocina (formularios y vista semanal).

### 2.2. Excluye
- No se exportan raciones, responsables ni horas por celda (se decidió solo menú + bebida).
- No se cambia el nombre almacenado de los campamentos (solo se limpia el prefijo "Campamento Transitorio" al mostrarlo en el PDF).
- No se reutiliza marca de agua ni borde decorativo de otros PDFs (la plantilla no los usa).

## 3. Contexto técnico relevante

- `src/pages/Cocina.tsx` ya carga los datos necesarios: `slots` (activos), `comidas` (de la semana navegada), `dias` (7 días desde `semanaActual`), `campamentoSeleccionado`.
- El proyecto usa `jspdf` (^4.2.1). Patrón vectorial existente en `src/pages/Inicio.tsx`, `src/components/familias/DetalleFamiliaModal.tsx`.
- Restricción de mayúsculas actual: `.toUpperCase()` y clase CSS `uppercase` en:
  - `src/components/cocina/EditarComidaModal.tsx` (líneas 158, 172, 214 y clases en 161, 175, 216).
  - `src/components/cocina/CompletarSemanaModal.tsx` (líneas 293, 305, 337 y clases CSS).
  - `src/components/cocina/VistaSemanal.tsx` (clases `uppercase` en render de menú/bebida, líneas 131 y 135).
- Assets de logos disponibles: `public/logovererojo.png`, `public/logoalcadia.png`.
- Utilidad existente: `src/lib/formatTime.ts` → `formatTime12h` (hora en formato 12h).

## 4. Diseño de la generación del PDF

### 4.1. Enfoque
Generación **vectorial con jsPDF** (`new jsPDF('l', 'mm', 'letter')`), replicando los rectángulos, bandas, texto y logos de la plantilla. Se usa Helvetica (fuente estándar de jsPDF).

### 4.2. Paleta de colores (de la plantilla)
| Elemento | RGB |
|---|---|
| Banda azul | `rgb(47, 85, 151)` |
| Borde azul marino de la banda | `rgb(23, 44, 81)` |
| Banda roja | `rgb(192, 0, 0)` |
| Fondo página | blanco |
| Cabecera de tabla (gris) | `rgb(165, 165, 165)` |
| Filas zebra | `rgb(240, 240, 240)` y `rgb(225, 225, 225)` |
| Líneas del marco | negro / gris oscuro |
| Separadores blancos | blanco |

### 4.3. Encabezado (banda azul)
- Banda azul horizontal de ~45 pt de alto, centrada respecto a los logos, con borde azul marino.
- **Logo izquierdo**: `public/logovererojo.png` (Venezuela).
- **Logo derecho**: `public/logoalcadia.png` (Alcaldía).
- Línea 1 (blanco, ~16 pt): `CAMPAMENTO TRANSITORIO`.
- Línea 2 (blanco, ~18 pt): `"<NOMBRE>"` entre comillas curvas (`"` / `"`), centrado.
  - `<NOMBRE>` = nombre del campamento **sin** el prefijo "Campamento Transitorio" (se elimina el prefijo, case-insensitive y tolerando espacios; si no está el prefijo, se usa el nombre completo). Ej.: "Campamento Transitorio Ávila" → `"ÁVILA"`.

### 4.4. Banda roja
- Banda roja de ~26 pt de alto a lo ancho del contenido.
- Texto (blanco, ~15.35 pt), centrado:
  `MENÚ SEMANAL DEL {DD/MM/YYYY} AL {DD/MM/YYYY}` con el rango real de la semana seleccionada (lunes y domingo de `semanaActual`).

### 4.5. Tabla semanal
- **Columnas**: `[DÍA] + [slots activos]` (3 a 6 comidas). La columna de día es fija y angosta (~47–50 pt). Las columnas de comida reparten el ancho restante por igual.
- **Cabecera** (gris 165): primera celda `DÍA`; cada celda de comida muestra el nombre de la comida (de `NOMBRE_TIPO_COMIDA`) en la línea 1 y `HORA: {hora}` en formato 12h (ej. `HORA: 07:00 AM`) en la línea 2. La hora proviene del `hora_servicio` del slot.
- **Filas de datos**: 7 filas (Lunes–Domingo de la semana seleccionada).
  - Columna de día: nombre del día (LUNES…DOMINGO) en **vertical** (rotado 90°).
  - Celdas de comida: `menu` (negrita) y `bebida` (negrita, en su propia línea), texto envuelto con `splitTextToSize` (~9–10 pt), en mayúsculas/minúsculas tal como está en BD. **No se usan emojis** (Helvetica de jsPDF no los renderiza).
- **Zebra**: filas alternan `rgb(240)` y `rgb(225)` (primera fila de datos con 225, como la plantilla).
- **Separadores**: líneas blancas finas entre filas y columnas; marco exterior de líneas.
- **Altura de fila**: fija ~70 pt (compatible con los nombres de día más largos como MIÉRCOLES en vertical). El texto se envuelve y, si excede, se recorta a la celda.

### 4.6. Tamaño de página y una sola página
- `new jsPDF('l', 'mm', 'letter')` (279.4 × 215.9 mm). La plantilla es 790.85 × 620.75 pt (≈ 279 × 219 mm); el layout se escala para ajustarse a Carta. Todo el menú semanal cabe en una sola página.

### 4.7. Nombre del archivo
`menu-semanal-{slug-del-campamento}-{AAAAMMDD-del-lunes}.pdf` (slug del nombre del campamento, sin acentos ni espacios).

## 5. Integración en la UI

### 5.1. Botón "Exportar PDF"
- Ubicación: barra de acciones de `Cocina.tsx`, junto a los botones "Horarios" y "Completar Semana".
- Icono: `FileDown` (lucide-react).
- Visibilidad: cualquier usuario con permiso `Ver` de Cocina en el campamento actual.
- Mientras se genera: estado de carga (deshabilitado + texto "Generando…").
- Errores de generación: se capturan con `console.error` y no rompen la UI (puede mostrarse un aviso).

### 5.2. Datos usados
Los que ya están cargados en la vista: `slots` (filtrados activos), `comidas` (mapa `fecha|tipo`), `dias` (7 días), `campamentoSeleccionado.nombre`. Sin fetch adicional.

## 6. Eliminación de la restricción de mayúsculas (módulo Cocina)

- `src/components/cocina/EditarComidaModal.tsx`: quitar `.toUpperCase()` en `menu`, `bebida` y `responsable`; quitar la clase CSS `uppercase` de esos inputs.
- `src/components/cocina/CompletarSemanaModal.tsx`: idem.
- `src/components/cocina/VistaSemanal.tsx`: quitar la clase CSS `uppercase` del render de `menu` y `bebida`.
- Nota: los datos ya almacenados en mayúsculas se mantienen; solo las entradas nuevas permiten mixto. El PDF exporta el texto tal como está en BD.

## 7. Estructura del código

- **Nuevo**: `src/lib/cocinaPdf.ts`
  - Función `exportarMenuSemanalPDF(args)`:
    - Args: `{ campamentoNombre, slots, comidas, dias, fechaDesde, fechaHasta }`.
    - Internamente: carga los logos (`loadImage`), dibuja bandas, tabla, logos y texto; `pdf.save(nombreArchivo)`.
- **Modificado**: `src/pages/Cocina.tsx` (botón + estado de carga + llamada).
- **Modificado**: `EditarComidaModal.tsx`, `CompletarSemanaModal.tsx`, `VistaSemanal.tsx` (quitar mayúsculas).

## 8. Pruebas

1. Exportar con las 3 comidas fijas (Desayuno, Almuerzo, Cena) → 4 columnas (DÍA + 3).
2. Activar 1, 2 y 3 meriendas en Horarios y exportar → 5, 6 y 7 columnas respectivamente.
3. Comparar visualmente con `docs/Plantilla Menu Semanal.pdf` (bandas, logos, cabecera, zebra, día vertical).
4. Editar una comida con texto en mayúsculas/minúsculas, exportar y verificar que el PDF muestra mixto.
5. Verificar que el nombre del campamento sale sin el prefijo "Campamento Transitorio".
6. Verificar rango de fechas correcto al navegar entre semanas.
7. Verificar permisos: usuario sin permiso `Ver` no ve el botón.
8. Verificar `npm run lint` sin errores.

## 9. Decisiones registradas
- Columnas = slots activos (no fijo 6, no fijo 3).
- Celdas solo menú + bebida (sin raciones, responsable ni hora por celda).
- Logos de `public/`: izquierda `logovererojo.png`, derecha `logoalcadia.png`.
- Nombre del campamento sin el prefijo "Campamento Transitorio" en la banda azul.
- Una sola página Carta horizontal, alto de fila fijo ~70 pt.
- Sin marca de agua ni borde decorativo (la plantilla no los usa).
