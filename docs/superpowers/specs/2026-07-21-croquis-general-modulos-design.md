# Croquis General + Rename Carpas a Módulos

**Fecha:** 2026-07-21
**Estado:** Diseño aprobado

---

## 1. Resumen

Esta especificación cubre cuatro cambios en el módulo de Construcción:

1. **Croquis General del campamento**: una nueva sección en `CrearRefugioModal`, antes de los acordeones de módulos, con un canvas que permite dibujar rectángulos, texto, lápiz y borrador (sin camas).
2. **Mejoras al rectángulo**: texto interno (doble-click para editar, orientación automática) y edición de color en tiempo real vía sincronización con el picker de la toolbar.
3. **Zoom visual (+/-)** en el footer del CroquisEditor en modo general.
4. **Renombrar "carpas" → "módulos"** en todo el frontend, manteniendo el nombre de tabla `carpas` en Supabase.

---

## 2. Cambios en el modelo de datos

### 2.1 Nueva columna en `campamentos`

```sql
ALTER TABLE campamentos ADD COLUMN croquis_general TEXT;
```

- Columna `TEXT`, nullable.
- Almacena un JSON serializado con la misma estructura que `carpas.croquis_data`:
  ```json
  {
    "drawingBase64": "<png data URL del offscreen canvas>",
    "objects": [
      { "kind": "rectangle", "id": "...", "x": 100, "y": 80, "rotation": 0,
        "width": 200, "height": 120, "color": "#374151", "texto": "Módulo A" },
      { "kind": "text", "id": "...", "x": 50, "y": 50, "rotation": 0,
        "text": "Pasillo", "fontSize": 16, "color": "#000000" }
    ]
  }
  ```

### 2.2 Tipos en TypeScript (`src/types/index.ts`)

- La interfaz `Campamento` gana un campo: `croquis_general?: string | null`
- La interfaz `Carpa` se renombra a `Modulo` (solo en el frontend).
- `Campamento.carpas` pasa a `Campamento.modulos` (tipo `Modulo[]`).

### 2.3 Contexto (`CampamentoContext.tsx`)

- `mapCampamento()`: incluye `croquis_general` del row de campamento.
- `agregarCampamento()`: persiste `croquis_general` en el INSERT de campamento (si el usuario lo llenó).
- `actualizarCampamento()`: actualiza `croquis_general` en el UPDATE de campamento.
- Todas las referencias internas a "carpa" se renombran a "modulo" (variables, nombres de funciones como `mapCarpa` → `mapModulo`).
- El mapeo con la tabla `carpas` de Supabase mantiene los nombres de columna de BD. Solo cambia cómo se llaman en el código TypeScript.

---

## 3. CroquisEditor: prop `modo`

### 3.1 Nueva prop

```typescript
interface CroquisEditorProps {
  modo?: 'general' | 'modulo';  // default: 'modulo'
  // ... resto de props igual
}
```

### 3.2 Comportamiento por modo

| Herramienta       | `modo='modulo'` (actual) | `modo='general'` (nuevo) |
|-------------------|--------------------------|---------------------------|
| Seleccionar       | Visible                  | Visible                   |
| Lápiz             | Visible                  | Visible                   |
| Texto             | Visible                  | Visible                   |
| Rectángulo        | Visible                  | Visible                   |
| Borrador          | Visible                  | Visible                   |
| Litera             | Visible (si max > 0)    | **Oculto**                |
| Individual         | Visible (si max > 0)    | **Oculto**                |
| Dúplex              | Visible (si max > 0)    | **Oculto**                |
| Color picker      | Visible                  | Visible                   |
| Grid toggle       | Visible                  | Visible                   |
| Zoom +/-          | **Oculto**               | Visible                   |
| Rotar (R)         | Visible                  | Visible                   |
| Ctrl+C/V/G/U      | Visible                  | Visible                   |
| Delete/Backspace  | Visible                  | Visible                   |

### 3.3 CanvasObject — cambios mínimos

La estructura general del tipo `CanvasObject` (union discriminada `bed | rectangle | text`) se mantiene. Los rectángulos ganan un campo opcional `texto` (detallado en §4.1). Las camas (`kind: 'bed'`) simplemente no se pueden crear en modo `general` porque las herramientas están ocultas, pero el tipo las soporta por si un croquis general heredara datos viejos.

---

## 4. Mejoras al rectángulo

### 4.1 Texto interno

**Campo nuevo en CanvasObject (kind: 'rectangle'):**

```typescript
{ kind: 'rectangle', ..., texto?: string }
```

#### Comportamiento

1. Al hacer **doble-click** sobre un rectángulo (herramienta seleccionar activa), se abre `prompt()`:
   - Si el rectángulo ya tiene texto, el prompt lo pre-llena para edición.
   - Si se cancela o deja vacío, se borra el texto (`texto = undefined`).
2. El texto se renderiza **centrado** dentro del rectángulo.
3. **Orientación automática:**
   - Si `height > width` → **vertical**, leyéndose de **abajo hacia arriba**.
   - Si `width >= height` → **horizontal**.
   - Se recalcula en cada render, por si el rectángulo se redimensiona.
4. **Tamaño de fuente dinámico:** se calcula un `fontSize` que maximice el texto respetando un padding interno de 4px en cada lado. Si el texto es muy largo, se trunca con elipsis.
5. **Color del texto:** mismo `obj.color` del rectángulo (color de stroke).
6. **Renderizado:**
   ```
   Horizontal: ctx.fillText(texto, centerX, centerY)        // textAlign: center, textBaseline: middle
   Vertical:   ctx.save(); ctx.translate(); ctx.rotate(-PI/2); // o PI/2 para abajo→arriba
               ctx.fillText(texto, 0, 0); ctx.restore()
   ```

### 4.2 Edición de color en tiempo real

#### Comportamiento

1. Al **seleccionar** un rectángulo con herramienta seleccionar:
   - El color-picker de la toolbar (`<input type="color">`) se **sincroniza** — su valor cambia a `obj.color`.
   - El estado React `color` también se actualiza al color del rectángulo.
2. Mientras el rectángulo esté seleccionado, **cualquier cambio en el picker de color** actualiza `obj.color` en tiempo real y fuerza un `drawCanvas()` inmediato.
3. Si hay **múltiples rectángulos** seleccionados (shift+click), el picker aplica el nuevo color a **todos** simultáneamente.
4. Al **deseleccionar** (click en vacío o Escape), el color-picker **revierte** al estado `color` global (el último color usado antes de la selección). No se guarda el color del rectángulo como default.

#### Implementación técnica

- El `useEffect` que escucha cambios en `color` distingue si hay una selección activa de rectángulo(s):
  ```
  if (selectedObjects.some(o => o.kind === 'rectangle')) {
    selectedObjects.forEach(o => { if (o.kind === 'rectangle') o.color = color; });
    drawCanvas();
  }
  ```
- Al seleccionar: `setColor(rect.color)` sincroniza el picker.
- Al deseleccionar: se restaura `color` desde una ref `lastUsedColorRef` que trackea cambios manuales del picker (no los inducidos por selección).

---

## 5. Zoom visual (+/-)

### 5.1 Estado

```typescript
const [zoom, setZoom] = useState(1.0);
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;
```

### 5.2 UI

- Solo visible cuando `modo === 'general'`.
- Dos botones en el **footer** del canvas:
  ```
  [-] 100% [+]
  ```
- El texto central muestra el porcentaje actual (ej: "100%", "130%", "70%").
- `[-]` deshabilitado en `ZOOM_MIN`, `[+]` deshabilitado en `ZOOM_MAX`.

### 5.3 Renderizado

- En `drawCanvas()`, antes de iterar objetos, se aplica:
  ```typescript
  ctx.save();
  ctx.setTransform(zoom, 0, 0, zoom, 0, 0);
  // ... dibujar todo
  ctx.restore();
  ```
- La grilla se escala automáticamente con el zoom.

### 5.4 Hit-testing

- Todas las funciones que convierten coordenadas del mouse a coordenadas del canvas deben dividir por `zoom`:
  ```typescript
  const canvasX = (e.clientX - rect.left) / zoom;
  const canvasY = (e.clientY - rect.top) / zoom;
  ```
- Funciones afectadas: `getObjectAt()`, `isPointInBounds()`, handlers de mousedown/mousemove/mouseup.

---

## 6. CrearRefugioModal: nueva sección Croquis General

### 6.1 Layout

```
┌─────────────────────────────────────────────┐
│  Datos Generales                            │
│  (nombre, ubicación, etc.)                  │
├─────────────────────────────────────────────┤
│  CROQUIS GENERAL              [expandir]   │  ← NUEVA sección
│  ┌───────────────────────────────────────┐  │
│  │  <CroquisEditor                      │  │
│  │     modo="general"                   │  │
│  │     value={croquisGeneralData}       │  │
│  │     onChange={handleCroquisGeneral}  │  │
│  │  />                                  │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│  MÓDULOS                                    │
│  ┌ Módulo A  ▼                             │
│  │  <CroquisEditor modo="modulo" ... />     │
│  └ Módulo B  ▼                             │
│  ...                                        │
└─────────────────────────────────────────────┘
```

### 6.2 Estado y handlers

- Nuevo estado en el modal: `croquisGeneralData` (string | null), inicializado desde `campamentoToEdit.croquis_general`.
- Handler: `handleCroquisGeneral(data: string)` actualiza el estado.
- Al submit, se incluye `croquis_general: croquisGeneralData` en el payload.
- El CroquisEditor en modo general **no recibe** las props de límites de camas (`maxLiteras`, `maxIndividuales`, `maxDuplex`, `tipoContabilizacion`).

---

## 7. Rename "carpas" → "módulos" (solo frontend)

### 7.1 Archivos y cambios

| Archivo | Cambios |
|---|---|
| `src/types/index.ts` | `Carpa` → `Modulo`; `Campamento.carpas` → `modulos` |
| `src/context/CampamentoContext.tsx` | Variables/funciones internas renombradas. El mapeo con tabla `carpas` de BD mantiene `from('carpas')`. |
| `src/pages/Constructor.tsx` | Etiquetas: "Carpas" → "Módulos", totalizadores en tarjetas |
| `src/components/constructor/CrearRefugioModal.tsx` | Títulos de acordeón "CARPA X" → "MÓDULO X", `cantidadCarpas` → `cantidadModulos`, estados `carpaDrafts` → `moduloDrafts` |
| `src/components/constructor/CroquisEditor.tsx` | Comentarios que refieran a carpa |
| `src/components/constructor/CroquisViewer.tsx` | Prop `carpaNombre` → `moduloNombre`; referencias internas |
| `src/components/constructor/CroquisViewer2.tsx` | Igual que CroquisViewer |
| `src/pages/Inicio.tsx` | Tarjeta "Carpas Activas" → "Módulos Activos"; textos en PDF; encabezados de columnas de croquis |
| `src/pages/Actas.tsx` | Nombres de variable y referencias en renderizado de croquis |

### 7.2 Qué NO cambia

- Tabla `carpas` en PostgreSQL.
- `CampamentoContext` sigue usando `supabase.from('carpas')`.
- La migración de BD es solo agregar `croquis_general` a `campamentos`.

---

## 8. Testing

### 8.1 Tests manuales

| Escenario | Resultado esperado |
|---|---|
| Crear campamento, expandir Croquis General | Canvas visible, sin herramientas de cama |
| Dibujar rectángulo en croquis general | Se crea con color default, se renderiza |
| Doble-click en rectángulo | Prompt para texto, texto aparece centrado |
| Rectángulo vertical (alto > ancho) | Texto en vertical, abajo→arriba |
| Seleccionar rectángulo → mover color picker | Color cambia en tiempo real |
| Deseleccionar rectángulo | Picker vuelve al último color usado |
| Zoom [+] varias veces | Vista se acerca, porcentaje se actualiza |
| Zoom [-] hasta 30% | Botón [-] se deshabilita |
| Guardar campamento con croquis general | Se persiste en BD, se carga al editar |
| Dashboard (Inicio) muestra módulos | "Módulos Activos", sin referencias a "carpas" |
| PDF de reporte | Encabezados dicen "Módulo", no "Carpa" |

### 8.2 Regresiones

- El CroquisEditor en modo `modulo` debe funcionar exactamente igual que antes (camas, límites, rotación, etc.).
- CroquisViewer y CroquisViewer2 deben seguir mostrando ocupación y actas correctamente.
- La exportación PDF desde Inicio debe seguir funcionando.
- El CRUD de campamentos (crear, editar, eliminar) no debe romperse.

---

## 9. Scope y exclusiones

### Incluido
- Croquis general con rectángulo, texto, lápiz, borrador, color
- Texto interno en rectángulo con orientación automática
- Sincronización de color picker con rectángulo seleccionado
- Zoom visual (+/-) solo en modo general
- Rename frontend carpas→módulos

### Excluido
- Herramientas de cama en croquis general
- Redimensionar rectángulos con handles (solo creación por drag)
- Rotación del croquis general (solo rotación de objetos individuales, ya existente)
- Zoom en modo módulo
- Migración de nombre de tabla `carpas` en BD
- Visualización del croquis general en el dashboard/Inicio (se puede agregar en spec futura)
- Visualización del croquis general en PDFs

