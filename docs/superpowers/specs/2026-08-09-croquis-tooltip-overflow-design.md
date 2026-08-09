# Tooltip del croquis — evitar recorte por overflow-hidden

**Fecha:** 2026-08-09
**Ámbito:** `src/components/constructor/CroquisViewer.tsx` + `src/components/constructor/CroquisViewer2.tsx`

---

## 1. Contexto

En los módulos **Inicio** (dashboard) y **Actas**, el visor de croquis muestra un tooltip al hacer hover sobre una cama ocupada. Este tooltip se renderiza dentro de un `<div className="... overflow-hidden ...">` que tiene como propósito mantener los bordes redondeados (`rounded-xl`) del contenedor. Sin embargo, el `overflow: hidden` también recorta el tooltip cuando se posiciona por encima del borde del contenedor (`translateY(calc(-100% - 5px))`), perdiendo parte de la información (nombres de ocupantes, número de cama).

### Archivos afectados

| Archivo | Línea del `overflow-hidden` |
|---|---|
| `CroquisViewer.tsx` | 475 |
| `CroquisViewer2.tsx` | 535 |

---

## 2. Comportamiento deseado

Al hacer hover sobre una cama ocupada en el croquis:

1. El tooltip se muestra completo, sin recortes, independientemente de su posición relativa al borde del contenedor.
2. El contenedor del canvas mantiene sus bordes redondeados (`rounded-xl`) y el canvas sigue estando recortado dentro de ellos.
3. La posición visual del tooltip no cambia: sigue apareciendo centrado sobre el cursor, desplazado hacia arriba.
4. El comportamiento en modo portrait (CroquisViewer.tsx, donde el tooltip rota 90°) se preserva intacto.

---

## 3. Diseño de la solución

### 3.1 Estrategia

Mover el tooltip fuera del contexto con `overflow: hidden` para que deje de ser recortado. El tooltip pasa de ser **hijo** del `overflow-hidden` a ser **hermano** del mismo, posicionado mediante `absolute` relativo a un nuevo `relative` en el wrapper exterior.

### 3.2 Cambios estructurales

```
ACTUAL:
<div className="space-y-3 min-w-0">              ← wrapper
  <header />
  <legend />
  <div className="... overflow-hidden ...">        ← clipping container
    <div className="relative">                     ← positioning context
      <canvas />
      {hoveredBed && <tooltip absolute />}         ← recortado
    </div>
  </div>
</div>

NUEVO:
<div ref={containerRef} className="space-y-3 min-w-0 relative">  ← +ref +relative
  <header />
  <legend />
  <div className="... overflow-hidden ...">                        ← sigue recortando canvas
    <div>                                                          ← sin relative
      <canvas />
    </div>
  </div>
  {hoveredBed && <tooltip absolute />}                            ← hermano del overflow-hidden
</div>
```

### 3.3 Cambio de coordenadas

Las coordenadas del tooltip (`hoveredBed.x`, `hoveredBed.y`) actualmente son relativas al bounding rect del canvas. Como el tooltip ahora se posiciona relativo al wrapper exterior, las coordenadas deben recalcularse respecto al bounding rect del wrapper.

**Antes** (relativo al canvas):
```typescript
x: e.clientX - canvasRect.left,
y: e.clientY - canvasRect.top,
```

**Después** (relativo al wrapper exterior):
```typescript
x: e.clientX - containerRect.left,
y: e.clientY - containerRect.top,
```

Donde `containerRect` es `containerRef.current.getBoundingClientRect()`.

El cálculo de hit-test (detección de qué cama está bajo el cursor) sigue usando `canvasRect` porque opera en coordenadas del mundo (world space) y no se ve afectado.

---

## 4. Implementación

### 4.1 Archivo: `CroquisViewer.tsx`

| # | Ubicación | Cambio |
|---|-----------|--------|
| 1 | ~línea 68 (junto a otros refs) | Agregar `const containerRef = useRef<HTMLDivElement>(null);` |
| 2 | ~líneas 235, 257-258 (`handleCanvasMouseMove`) | Obtener `containerRef.current?.getBoundingClientRect()` y usar `containerRect` para las coordenadas `x`/`y` del `found` |
| 3 | ~línea 445 (wrapper `div`) | Agregar `ref={containerRef}` y la clase `relative` → `className="space-y-3 min-w-0 relative"` |
| 4 | ~línea 476 (div interno) | Quitar `relative` → `className=""` (o eliminar la clase) |
| 5 | ~líneas 491-519 (bloque tooltip) | Mover `{hoveredBed && (<div>...</div>)}` justo después del cierre del `</div>` del `overflow-hidden`, manteniéndolo dentro del wrapper con `relative` |

#### 4.1.1 Detalle del cambio en `handleCanvasMouseMove` (líneas 214-265)

El hit-test (líneas 238-263) sigue usando `canvasRect` para sus cálculos de coordenadas world → screen. Solo cambian las líneas 257-258 que asignan `x`/`y` al objeto `found`:

```typescript
// Antes (línea 235)
const rect = canvas.getBoundingClientRect();

// Después
const rect = canvas.getBoundingClientRect();
const containerRect = containerRef.current?.getBoundingClientRect();

// Antes (líneas 257-258)
x: e.clientX - rect.left,
y: e.clientY - rect.top,

// Después
x: e.clientX - (containerRect?.left ?? rect.left),
y: e.clientY - (containerRect?.top ?? rect.top),
```

El fallback a `rect.left`/`rect.top` en caso de que `containerRef.current` sea null evita errores.

#### 4.1.2 Detalle del movimiento del tooltip (líneas 491-519)

El bloque:
```tsx
{hoveredBed && (
  <div className="absolute z-50 ..." style={{...}}>
    {hoveredBed.numbers.map(...)}
  </div>
)}
```

Se mueve desde su posición actual (dentro de `<div className="relative">`) hacia después del `</div>` que cierra el `overflow-hidden`, antes del `</div>` que cierra el wrapper con `relative`.

### 4.2 Archivo: `CroquisViewer2.tsx`

| # | Ubicación | Cambio |
|---|-----------|--------|
| 1 | ~línea 317 (junto a otros refs) | Agregar `const containerRef = useRef<HTMLDivElement>(null);` |
| 2 | ~líneas 469, 490-491 (`handleCanvasMouseMove`) | Obtener `containerRef.current?.getBoundingClientRect()` y usar `containerRect` para las coordenadas `x`/`y` del `found` |
| 3 | ~línea 505 (wrapper `div`) | Agregar `ref={containerRef}` y la clase `relative` → `className="space-y-3 relative"` |
| 4 | ~línea 536 (div interno) | Quitar `relative` |
| 5 | ~líneas 546-574 (bloque tooltip) | Mover `{hoveredBed && (...)}` fuera del `overflow-hidden`, como hermano |

#### 4.2.1 Detalle del cambio en `handleCanvasMouseMove` (líneas 466-498)

Igual que en CroquisViewer.tsx: agregar `containerRect` y cambiar las líneas 490-491 para usar `containerRect.left` / `containerRect.top` en vez de `rect.left` / `rect.top`.

---

## 5. Archivos afectados

| Archivo | Tipo | Cambio |
|---|---|---|
| `src/components/constructor/CroquisViewer.tsx` | Modificado | 5 cambios puntuales (4.1) |
| `src/components/constructor/CroquisViewer2.tsx` | Modificado | 5 cambios puntuales (4.2) |

**No se modifican:**
- `src/pages/Inicio.tsx`
- `src/pages/Actas.tsx`
- `CroquisEditor.tsx` (no tiene tooltips con este problema)
- `PlanoGeneralViewer.tsx`
- CSS / Tailwind config
- Base de datos

---

## 6. Casos de prueba

| # | Caso | Esperado |
|---|---|---|
| 1 | Hover sobre cama ocupada en borde superior del croquis | Tooltip se muestra completo, sin recorte |
| 2 | Hover sobre cama ocupada en borde inferior del croquis | Tooltip se muestra completo (ya funcionaba, verificar que no se rompa) |
| 3 | Hover sobre cama ocupada en modo portrait (móvil) | Tooltip rota 90° y se muestra completo |
| 4 | Hover sobre cama libre | No aparece tooltip (comportamiento sin cambios) |
| 5 | Quitar hover (mouse leave) | Tooltip desaparece |
| 6 | Croquis en módulo Inicio | Tooltip visible y completo |
| 7 | Croquis en módulo Actas | Tooltip visible y completo con colores de actas |
| 8 | Pan/zoom en el croquis | El tooltip sigue la posición correcta del cursor |
| 9 | Bordes redondeados del contenedor | Se mantienen intactos (el canvas sigue recortado por `rounded-xl`) |
