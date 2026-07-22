# Plan: Croquis General + Rename Carpas a Módulos

**Spec:** `docs/superpowers/specs/2026-07-21-croquis-general-modulos-design.md`
**Fecha:** 2026-07-21

---

## Fase 1: Rename Carpa → Modulo en todo el frontend

Hacer esto primero para evitar conflictos de nombres durante el resto del desarrollo.

### 1.1 Tipos (`src/types/index.ts`)
- Renombrar interfaz `Carpa` → `Modulo`
- Renombrar `Campamento.carpas` → `Campamento.modulos` (tipo `Modulo[]`)
- Agregar `croquis_general?: string | null` a `Campamento`

### 1.2 Contexto (`src/context/CampamentoContext.tsx`)
- Renombrar `mapCarpa` → `mapModulo`
- Renombrar variables internas `carpa`, `carpas`, `carpaData` → `modulo`, `modulos`, `moduloData`
- Renombrar en `agregarCampamento()` y `actualizarCampamento()`
- Las llamadas a `supabase.from('carpas')` se mantienen igual
- Agregar `croquis_general` al INSERT y UPDATE de campamentos

### 1.3 Página Constructor (`src/pages/Constructor.tsx`)
- Renombrar todas las referencias a `carpa(s)` → `modulo(s)` en:
  - Textos de tarjetas ("Carpas" → "Módulos")
  - Variables `carpas`, `totalCarpas` → `modulos`, `totalModulos`
  - Iconos y etiquetas

### 1.4 Modal (`src/components/constructor/CrearRefugioModal.tsx`)
- `CarpaDraft` → `ModuloDraft`
- `carpaDrafts` → `moduloDrafts`
- `cantidadCarpas` → `cantidadModulos`
- `handleCantidadCarpasChange` → `handleCantidadModulosChange`
- `updateCarpa` → `updateModulo`
- `toggleCarpa` → `toggleModulo`
- Títulos de acordeón "CARPA X" → "MÓDULO X"
- Labels y placeholders

### 1.5 CroquisEditor (`src/components/constructor/CroquisEditor.tsx`)
- Solo comentarios que refieran a "carpa"

### 1.6 CroquisViewer y CroquisViewer2
- Prop `carpaNombre` → `moduloNombre`
- Referencias internas

### 1.7 Dashboard (`src/pages/Inicio.tsx`)
- "Carpas Activas" → "Módulos Activos"
- Encabezados en PDFs ("Carpa" → "Módulo")
- Variables `carpas`, `carpa`, `carpasOffset` → equivalentes con `modulo`

### 1.8 Actas (`src/pages/Actas.tsx`)
- Variables y referencias en renderizado

---

## Fase 2: DB migration

```sql
ALTER TABLE campamentos ADD COLUMN croquis_general TEXT;
```

Ejecutar en Supabase SQL editor.

---

## Fase 3: CroquisEditor — prop `modo`

### 3.1 Agregar prop
```typescript
interface CroquisEditorProps {
  modo?: 'general' | 'modulo';  // default 'modulo'
  value?: string | null;
  onChange?: (serialized: string) => void;
  maxLiteras?: number;
  maxIndividuales?: number;
  maxDuplex?: number;
  tipoContabilizacion?: 'elemento' | 'cama';
}
```

### 3.2 Condicionar visibilidad de herramientas
En la toolbar (líneas ~909-950), envolver los botones de cama con:
```tsx
{modo !== 'general' && (
  <>
    <button litera ... />
    <button individual ... />
    <button duplex ... />
  </>
)}
```

### 3.3 Deshabilitar creación de camas en handlers
- En mousedown (línea ~496): si `modo === 'general'`, ignorar herramientas `litera`, `individual`, `duplex`

---

## Fase 4: Mejoras al rectángulo

### 4.1 Texto interno

**Tipo CanvasObject:**
Agregar `texto?: string` al discriminante `kind: 'rectangle'`:
```typescript
{ kind: 'rectangle', id: string, x: number, y: number, rotation: number,
  groupId?: string, width: number, height: number, color: string,
  texto?: string }
```

**Doble-click handler (líneas ~733-746):**
Modificar el handler existente de doble-click para que, si el objeto clickeado es un rectángulo, abra prompt para texto:
```typescript
if (obj?.kind === 'rectangle') {
  const nuevoTexto = prompt('Texto del rectángulo:', obj.texto || '');
  if (nuevoTexto !== null) {
    obj.texto = nuevoTexto || undefined;
    drawCanvas();
    saveState();
  }
}
```
(El handler existente para texto independiente se mantiene.)

**Renderizado de rectángulo (función drawRectangle o similar, ~líneas 351-368):**
Después de dibujar el fill y stroke, si `obj.texto` existe:
1. Determinar orientación: `obj.height > obj.width` → vertical; else → horizontal
2. Calcular fontSize dinámico (probar tamaños decrecientes hasta que quepa con padding 4px)
3. Si vertical: `ctx.save(); ctx.translate(cx, cy); ctx.rotate(-Math.PI / 2); ctx.fillText(texto, 0, 0); ctx.restore()`
4. Si horizontal: `ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(texto, cx, cy)`
5. Color del texto: `obj.color`

### 4.2 Edición de color en tiempo real

**Ref adicional para trackear el último color manual:**
```typescript
const lastUsedColorRef = useRef('#374151');
```

**Al seleccionar un rectángulo (función de selección, ~líneas 540-570):**
Si la selección incluye al menos un rectángulo y todos son rectángulos, sincronizar:
```typescript
const rects = selected.filter(o => o.kind === 'rectangle');
if (rects.length > 0) {
  setColor(rects[0].color);
}
```

**useEffect para cambios de color (nuevo):**
```typescript
useEffect(() => {
  if (selectedObjects.length === 0) return;
  const rects = selectedObjects.filter(o => o.kind === 'rectangle');
  if (rects.length > 0) {
    rects.forEach(o => { (o as any).color = color; });
    lastUsedColorRef.current = color;
    drawCanvas();
    saveState();
  }
}, [color]);
```

**Al deseleccionar (clearSelection o click en vacío, ~líneas 460-470):**
No hacer nada — el color actual queda como `lastUsedColorRef`. El picker ya muestra el último color usado.

**Nota:** El `useEffect` debe ignorar cambios de color que vengan de la sincronización (selección). Para evitar loops, usar una flag:
```typescript
const syncingColorRef = useRef(false);

// Al seleccionar:
syncingColorRef.current = true;
setColor(rects[0].color);
// En el efecto de color:
if (syncingColorRef.current) { syncingColorRef.current = false; return; }
```

---

## Fase 5: Zoom (+/-)

### 5.1 Estado
```typescript
const [zoom, setZoom] = useState(1.0);
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;
```

### 5.2 UI (footer del canvas, ~líneas 930+)
Solo visible si `modo === 'general'`:
```tsx
{modo === 'general' && (
  <div className="flex items-center gap-2 justify-center mt-2">
    <button onClick={() => setZoom(z => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
            disabled={zoom <= ZOOM_MIN}
            className="px-2 py-1 border rounded text-sm">−</button>
    <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
    <button onClick={() => setZoom(z => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
            disabled={zoom >= ZOOM_MAX}
            className="px-2 py-1 border rounded text-sm">+</button>
  </div>
)}
```

### 5.3 Ajustar drawCanvas()
Al inicio de `drawCanvas()`, aplicar transform:
```typescript
ctx.save();
ctx.setTransform(zoom, 0, 0, zoom, 0, 0);
// ... todo el dibujo existente ...
ctx.restore();
```

### 5.4 Ajustar hit-testing
En todas las funciones que obtienen coordenadas del mouse relativas al canvas, dividir por zoom:
- `getObjectAt()`: dividir `mx`, `my` por zoom
- `isPointInBounds()`: ya usa coordenadas canvas, probablemente no necesita cambio si las coordenadas vienen de funciones que ya dividieron
- Handlers mousedown/mousemove/mouseup (líneas ~480-730): al calcular `x` e `y` desde `e.clientX - rect.left`, dividir por zoom

Revisar cada handler:
```typescript
const canvasX = (e.clientX - rect.left) / zoom;
const canvasY = (e.clientY - rect.top) / zoom;
```

---

## Fase 6: CrearRefugioModal — sección Croquis General

### 6.1 Estado nuevo
```typescript
const [croquisGeneralData, setCroquisGeneralData] = useState<string | null>(null);
```

### 6.2 Inicializar al editar
En el `useEffect` de carga (líneas ~34-53):
```typescript
setCroquisGeneralData(campamentoToEdit.croquis_general || null);
```

### 6.3 Agregar sección en el JSX (~entre línea 275 y 278)
Antes de la sección de módulos, agregar:
```tsx
{/* Croquis General */}
<div className="border rounded-lg mb-6">
  <button
    type="button"
    onClick={() => setCroquisGeneralExpandido(!croquisGeneralExpandido)}
    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
  >
    <h3 className="text-lg font-semibold">CROQUIS GENERAL</h3>
    <span>{croquisGeneralExpandido ? '▲' : '▼'}</span>
  </button>
  {croquisGeneralExpandido && (
    <div className="p-4">
      <CroquisEditor
        modo="general"
        value={croquisGeneralData}
        onChange={(data) => setCroquisGeneralData(data)}
      />
    </div>
  )}
</div>
```

### 6.4 Incluir en submit
En `handleSubmit()` (~líneas 95-145), agregar `croquis_general: croquisGeneralData` al payload del campamento.

---

## Fase 7: Testing manual

Verificar cada escenario del spec §8.1:
1. Crear campamento con croquis general → canvas sin herramientas de cama
2. Rectángulo + doble-click para texto → prompt y renderizado
3. Rectángulo vertical → texto abajo→arriba
4. Seleccionar rectángulo → mover color picker → cambio en tiempo real
5. Deseleccionar → picker vuelve al último color
6. Zoom +/- → vista escala, botones se deshabilitan en extremos
7. Guardar y recargar → croquis general persiste
8. Dashboard dice "Módulos Activos"
9. PDF dice "Módulo"
10. Modo módulo funciona igual que antes (regresión)

---

## Orden de implementación

1. Fase 2 (DB migration) — rápido, sin código
2. Fase 1 (rename) — cambiar todo de una vez con search & replace cuidadoso
3. Fase 3 (modo prop) — base para el resto
4. Fase 5 (zoom) — independiente de las mejoras de rectángulo
5. Fase 4 (mejoras rectángulo) — texto + color sync
6. Fase 6 (modal) — integrar todo
7. Fase 7 (testing) — verificar todo

La fase 1 es la más riesgosa por tocar muchos archivos. Hacer con búsquedas globales para no dejar ninguna referencia sin cambiar.
