# Implementation Plan: Croquis Mobile Revision

**Spec:** `docs/superpowers/specs/2026-07-28-croquis-mobile-revision-design.md`
**Date:** 2026-07-28
**Files:** 3

---

## Step 1 — Fix rastro bug in CroquisViewer.tsx

**File:** `src/components/constructor/CroquisViewer.tsx`

**1a.** In `finishRender()` (line ~139), before the `ctx.setTransform(1,0,0,1,0,0)` line, add:
```js
ctx.clearRect(0, 0, canvas.width, canvas.height);
```
And remove the `ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, width, Math.max(height, width));` that comes after transforms.

**1b.** In the `img.onload` callback (line ~154), same treatment: add `ctx.clearRect(0, 0, canvas.width, canvas.height)` at the very start of the callback, before any transform. The existing fillRect inside transformed space must be removed.

**Verification:** On mobile, pan the croquis at zoom>1.0 — no ghost trails should remain.

---

## Step 2 — Add long-press 1.5s to CroquisViewer.tsx

**File:** `src/components/constructor/CroquisViewer.tsx`

**2a.** Add two new refs after the existing refs (after `isPanningRef`):
```ts
const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const isLongPressActiveRef = useRef(false);
```

**2b.** Modify `handleTouchStart` — add clause for `zoom <= 1.0 && e.touches.length === 1`:
```ts
if (zoom <= 1.0 && e.touches.length === 1) {
  e.preventDefault();
  const touch = e.touches[0];
  longPressTimerRef.current = setTimeout(() => {
    isLongPressActiveRef.current = true;
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    isPanningRef.current = true;
    panStartRef.current = {
      x: touch.clientX * (canvas.width / rect.width),
      y: touch.clientY * (canvas.height / rect.height),
      offsetX,
      offsetY
    };
  }, 1500);
  return;
}
```

**2c.** Modify `handleTouchMove` — at the top, add early abort for in-progress long-press timer:
```ts
if (longPressTimerRef.current && !isLongPressActiveRef.current) {
  // user moved before 1.5s — cancel long-press
  clearTimeout(longPressTimerRef.current);
  longPressTimerRef.current = null;
  return;
}
```
This must go BEFORE the existing `e.preventDefault()` to not block normal behavior when long-press was cancelled.

**2d.** Modify `handleTouchMove` — the existing single-finger pan clause `e.touches.length === 1 && isPanningRef.current` already covers the long-press case since we set `isPanningRef.current = true` in the timer callback. No extra changes needed for the pan itself.

**2e.** Modify `handleTouchEnd` — clean up long-press state:
```ts
if (longPressTimerRef.current) {
  clearTimeout(longPressTimerRef.current);
  longPressTimerRef.current = null;
}
if (isLongPressActiveRef.current) {
  isLongPressActiveRef.current = false;
  isPanningRef.current = false;
}
```
Add this at the top of `handleTouchEnd`, before the existing `if (e.touches.length === 0)` logic.

**Verification:** 
- Tap short (< 1.5s) on a bed at zoom=1.0 → tooltip shows.
- Press and hold 1.5s, then drag → canvas pans.
- Pinch zoom (2 dedos) at zoom=1.0 → still works, zooms in.

---

## Step 3 — Fix rastro + race condition in PlanoGeneralViewer.tsx

**File:** `src/components/constructor/PlanoGeneralViewer.tsx`

**3a.** Add render version ref after existing refs:
```ts
const renderVersionRef = useRef(0);
```

**3b.** In `triggerRender()` (line ~132), wrap the async image path with version check:
```ts
function triggerRender() {
  const canvas = internalCanvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const data = parsedDataRef.current;

  renderVersionRef.current += 1;
  const version = renderVersionRef.current;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY);

  if (data.drawingBase64) {
    const img = new Image();
    img.onload = () => {
      if (version !== renderVersionRef.current) return; // discard stale render
      ctx.drawImage(img, 0, 0);
      drawRectangles(ctx, data.rectangles);
      drawLines(ctx, data.lines);
      drawTexts(ctx, data.texts);
      ctx.restore();
    };
    img.src = data.drawingBase64;
  } else {
    drawRectangles(ctx, data.rectangles);
    drawLines(ctx, data.lines);
    drawTexts(ctx, data.texts);
    ctx.restore();
  }
}
```

**Verification:** Rapid pan/zoom does not leave ghost artifacts.

---

## Step 4 — Add long-press 1.5s to PlanoGeneralViewer.tsx

**File:** `src/components/constructor/PlanoGeneralViewer.tsx`

**4a.** Add refs (same pattern as CroquisViewer, after `pinchRef`):
```ts
const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const isLongPressActiveRef = useRef(false);
```

**4b.** Modify `handleTouchStart` — add clause before the existing `if (zoom <= 1.0 && e.touches.length < 2) return;`:
Replace that early return with:
```ts
if (zoom <= 1.0 && e.touches.length < 2) {
  if (e.touches.length === 1) {
    e.preventDefault();
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      const canvas = internalCanvasRef.current;
      if (!canvas) return;
      isPanningRef.current = true;
      const rect = canvas.getBoundingClientRect();
      panStartRef.current = {
        x: touch.clientX * (canvas.width / rect.width),
        y: touch.clientY * (canvas.height / rect.height),
        offsetX,
        offsetY
      };
    }, 1500);
  }
  return;
}
```

**4c.** Modify `handleTouchMove` — cancel long-press on early movement:
```ts
if (longPressTimerRef.current && !isLongPressActiveRef.current) {
  clearTimeout(longPressTimerRef.current);
  longPressTimerRef.current = null;
  return;
}
```
Add this before `e.preventDefault()`.

**4d.** Modify `handleTouchEnd` — clean up long-press state:
```ts
if (longPressTimerRef.current) {
  clearTimeout(longPressTimerRef.current);
  longPressTimerRef.current = null;
}
if (isLongPressActiveRef.current) {
  isLongPressActiveRef.current = false;
  isPanningRef.current = false;
}
```
Add at top of `handleTouchEnd`.

**Verification:** Long-press → pan works. Pinch zoom unaffected.

---

## Step 5 — Card wrapper removal + alternating backgrounds in Inicio.tsx

**File:** `src/pages/Inicio.tsx`

### 5a. "Planos Generales" section (line ~895)

Change the wrapper `<div>` from:
```html
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
```
to:
```html
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6
            max-md:bg-transparent max-md:shadow-none max-md:border-0 max-md:rounded-none max-md:p-0 max-md:-mx-4">
```

Add `max-md:px-4` to the `<h2>` title.
Add `max-md:mx-4` to the "Exportar PDF Planos" button.

### 5b. Wrap each PlanoGeneralViewer in alternating background div

Inside the `.map()` on `planos`, wrap `<PlanoGeneralViewer>`:
```tsx
{expandido && (
  <div className={isMobile ? (index % 2 === 0 ? 'bg-[#FFF8E7] px-4 py-4' : 'bg-transparent px-4 py-4') : ''}>
    <PlanoGeneralViewer ... />
  </div>
)}
```

### 5c. "Distribución del Campamento" section (line ~946)

Same wrapper change as 5a:
```html
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6
            max-md:bg-transparent max-md:shadow-none max-md:border-0 max-md:rounded-none max-md:p-0 max-md:-mx-4">
```

Add `max-md:px-4` to `<h2>`.
Add `max-md:mx-4` to "Exportar PDF Impresión" button.
Add `max-md:px-4` to the resumen de tipos (literas/individuales/duplex row).

### 5d. Wrap each CroquisViewer in alternating background div

Inside `modulosConOffset.map()`, wrap `<CroquisViewer>`:
```tsx
<div className={isMobile ? (index % 2 === 0 ? 'bg-[#FFF8E7] px-4 py-4' : 'bg-transparent px-4 py-4') : ''}>
  <CroquisViewer ... />
</div>
```

**Verification:** 
- Desktop: no visual changes, cards remain white.
- Mobile: cards disappear, modules/planos span full width.
- First module = cream yellow, second = transparent, third = cream, etc.

---

## Execution Order

1. CroquisViewer.tsx — rastro fix + long-press
2. PlanoGeneralViewer.tsx — race condition fix + long-press
3. Inicio.tsx — card removal + alternating backgrounds
4. Manual test on mobile viewport
