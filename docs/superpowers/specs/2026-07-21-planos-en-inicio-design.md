# Visualización de Planos Generales en Inicio

**Fecha:** 2026-07-21
**Estado:** Diseño aprobado

---

## 1. Resumen

Mostrar los croquis generales (planos) en el módulo Inicio como acordeones plegables, con exportación a PDF de alta calidad (renderizado mixto vector+raster).

---

## 2. Nuevo componente: PlanoGeneralViewer

Archivo: `src/components/constructor/PlanoGeneralViewer.tsx`

- Renderiza el mismo formato JSON `{ drawingBase64, objects }` del CroquisEditor.
- Fondo: imagen PNG del offscreen canvas.
- Objetos: rectángulos (con texto interno word-wrap), líneas, textos independientes.
- Sin camas, números de cama, hover tooltips, ni contadores.
- Props: `croquisData`, `planoNombre`, `width?`, `height?`.

---

## 3. PDF: renderizado mixto (vector + raster 2x)

### 3.1 Capa raster (fondo)
- El `drawingBase64` se renderiza a 2x resolución (2800×1400 para un canvas de 1400×700) antes de embedder en el PDF.

### 3.2 Capa vectorial (objetos)
- Rectángulos: `pdf.roundedRect()` con stroke del color.
- Líneas: `pdf.line()` con grosor 2.
- Textos: `pdf.text()` con fontSize y color, orientación automática.
- Word-wrap: dividir texto del rectángulo en líneas con medida aproximada.

### 3.3 Layout por página
- Header: título "PLANOS GENERALES", nombre del campamento, fecha.
- Separador gráfico (estilo existente).
- Nombre del plano.
- Croquis ocupando ancho máximo de la página (~190mm).
- Footer: logos institucionales.
- Una página por plano.

---

## 4. Cambios en Inicio.tsx

- Nueva sección "PLANOS GENERALES" entre el resumen y los módulos.
- Acordeones plegables por plano con `PlanoGeneralViewer`.
- Botón "Exportar PDF Planos" que llama a `handleExportPlanosPDF`.
- El PDF de módulos existente no se modifica.

---

## 5. Scope

**Incluido:** visualización en Inicio, exportar PDF individual, multi-página automática, calidad vectorial en zoom.

**Excluido:** exportar desde el modal Constructor, hover con ocupantes, contadores de camas, PDF combinado planos+módulos.
