# Croquis Mobile Revision — Inicio & Viewer Components

**Fecha:** 2026-07-28
**Alcance:** Versión móvil (< 768px) de las secciones de croquis y planos en Inicio, más fixes en CroquisViewer y PlanoGeneralViewer

## Resumen

1. Corrección del bug de rastro/ghost al hacer pan en CroquisViewer y PlanoGeneralViewer
2. Long-press (1.5s) para activar navegación/pan a zoom=1.0 en ambos viewers
3. Eliminación de cards blancas contenedoras en móvil, reemplazadas por fondo full-width con alternancia de color por módulo/plano

---

## 1. Bug: rastro visual al hacer pan (CroquisViewer)

**Archivo:** `src/components/constructor/CroquisViewer.tsx`

**Causa:** En el `useEffect` de renderizado, la limpieza del canvas (`fillRect` blanco) se ejecuta dentro del espacio transformado (post-rotación, post-offset, post-zoom). Cuando el usuario hace pan con offset negativo, el rectángulo blanco no cubre toda el área visible en píxeles, dejando franjas del frame anterior visibles.

**Solución:** Antes de aplicar cualquier transformación, limpiar la totalidad del canvas en espacio de píxeles:

```js
ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.clearRect(0, 0, canvas.width, canvas.height);
```

Insertar esto al inicio de `finishRender()` y del callback `img.onload`, reemplazando el `fillRect(0, 0, width, Math.max(height, width))` actual que ocurre dentro del espacio transformado.

---

## 2. Long-press 1.5s para pan a zoom=1.0 (CroquisViewer)

**Archivo:** `src/components/constructor/CroquisViewer.tsx`

**Comportamiento actual:** El pan solo se activa cuando `zoom > 1.0`. A zoom=1.0, el touch de 1 dedo es ignorado.

**Comportamiento nuevo:**

- **touchStart (1 dedo, zoom=1.0):** Inicia un timer de 1500ms (`longPressTimerRef`). Si el dedo se levanta antes → tap normal (tooltip/hover). Si el dedo permanece 1.5s sin movimiento significativo → se activa modo pan (`isLongPressActiveRef = true`), se captura la posición inicial para el pan.
- **touchMove (1 dedo, zoom=1.0):** Si `isLongPressActiveRef` es true → ejecuta lógica de pan normal. Si el timer sigue corriendo y el movimiento supera un umbral pequeño (~5px), cancela el timer (no fue long-press, fue scroll involuntario).
- **touchEnd (1 dedo, zoom=1.0):** Limpia el timer. Si `isLongPressActiveRef` es false → fue tap corto → procesa hover/tooltip normalmente. Si fue long-press → finaliza el pan.
- **2 dedos y zoom>1.0:** Sin cambios, comportamiento actual se mantiene.

**Nuevos refs requeridos:**
- `longPressTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>`
- `isLongPressActiveRef: MutableRefObject<boolean>`

---

## 3. Bug: rastro visual (PlanoGeneralViewer)

**Archivo:** `src/components/constructor/PlanoGeneralViewer.tsx`

**Diagnóstico:** El `clearRect` en `triggerRender()` ya se hace antes de las transformaciones, lo cual es correcto. Sin embargo existe una condición de carrera: si `triggerRender` se llama mientras una imagen base64 está cargándose asincrónicamente, el callback `img.onload` puede dibujar contenido stale después de que un nuevo `triggerRender` ya limpió y comenzó otro renderizado.

**Solución:** Agregar un contador de versión de renderizado:

```js
const renderVersionRef = useRef(0);

function triggerRender() {
  renderVersionRef.current += 1;
  const version = renderVersionRef.current;
  // ... clear + setup ...
  if (data.drawingBase64) {
    const img = new Image();
    img.onload = () => {
      if (version !== renderVersionRef.current) return; // stale, discard
      ctx.drawImage(img, 0, 0);
      // ... draw shapes ...
    };
    img.src = data.drawingBase64;
  }
}
```

Esto asegura que callbacks asincrónicos de renders anteriores sean descartados.

---

## 4. Long-press 1.5s (PlanoGeneralViewer)

**Archivo:** `src/components/constructor/PlanoGeneralViewer.tsx`

Misma lógica que la sección 2, adaptada a los handlers existentes de PlanoGeneralViewer. No tiene hover/tooltip, así que el tap corto simplemente no hace nada (comportamiento actual se preserva).

---

## 5. Card wrapper → full-width + fondos alternados (Inicio.tsx)

**Archivo:** `src/pages/Inicio.tsx`

### 5a. Sección "Distribución del Campamento" (línea 946)

El wrapper `<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">` cambia a:

```html
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6
            max-md:bg-transparent max-md:shadow-none max-md:border-0 max-md:rounded-none max-md:p-0 max-md:-mx-4">
```

El título `<h2>` recibe padding horizontal en móvil:

```html
<h2 className="... max-md:px-4">
```

El botón "Exportar PDF" también recibe `max-md:mx-4`.

### 5b. Sección "Planos Generales" (línea 895)

Mismo patrón que 5a: wrapper pierde la card en móvil, mismo set de clases `max-md:`.

### 5c. Fondos alternados por módulo/plano

Cada CroquisViewer y PlanoGeneralViewer se envuelve en un `<div>` con clase condicional:

```tsx
<div className={isMobile ? (index % 2 === 0 ? 'bg-[#FFF8E7] px-4 py-4' : 'bg-transparent px-4 py-4') : ''}>
  <CroquisViewer ... />
</div>
```

- Índice par (0, 2, 4...): `bg-[#FFF8E7]` (amarillo crema, casi blanco)
- Índice impar (1, 3, 5...): `bg-transparent`
- Ambos con `px-4 py-4` para padding interno en móvil

El color `#FFF8E7` es un amarillo extremadamente suave, perceptible como fondo cálido pero cercano al blanco.

---

## 6. No cambios

- **Dimensiones del canvas:** Se mantienen `width=1500, height=1500` para móvil con `portrait={isMobile}`. Sin cambios.
- **Tab bar:** Se mantiene con `bg-[#ffb41d]`. Sin cambios.
- **Tooltip/hover en CroquisViewer:** Sigue funcionando con tap normal (menos de 1.5s). Sin cambios.
- **Bloqueo de orientación:** No se implementa. Descartado.
- **PlanoGeneralViewer en Inicio.tsx:** Las props `width={1500} height={700}` se mantienen sin cambios.

---

## Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `src/components/constructor/CroquisViewer.tsx` | Fix rastro (clearRect antes de transforms) + long-press 1.5s |
| `src/components/constructor/PlanoGeneralViewer.tsx` | Fix rastro (render version counter) + long-press 1.5s |
| `src/pages/Inicio.tsx` | Card wrappers a full-width en móvil + fondos alternados por módulo/plano |
