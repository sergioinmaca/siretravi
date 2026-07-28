# Responsive Mobile — Sidebar a Tab Bar

**Fecha:** 2026-07-28
**Ámbito:** `src/layouts/MainLayout.tsx`
**Breakpoint:** `max-width: 768px` (Tailwind `md`)

---

## 1. Arquitectura de Layout

### Desktop (≥768px)

Sin cambios. Sidebar lateral + header + contenido, como está actualmente.

### Mobile (<768px)

```
┌─────────────────────────────┐
│ Header (h-14, 56px)         │
│ "Integr."               ☰   │
├─────────────────────────────┤
│ Contenido (scrollable)      │
│ pb-[72px] + safe-area       │
├─────────────────────────────┤
│ Tab Bar (fixed, bottom: 0)  │
│  ←   🏠    👥    ❤️    →    │
│   Hola, Iraki · Sede Ctrl   │
└─────────────────────────────┘
```

- Sidebar desktop se oculta con `hidden md:flex`
- Tab bar se muestra con `flex md:hidden`
- El contenido principal tiene `pb-[72px]` en móvil para compensar el tab bar fijo

---

## 2. Transición de Breakpoint

Al cruzar los 768px (por resize de ventana o rotación), se interpone un overlay para evitar que el usuario vea el reflujo brusco del layout.

- **Overlay:** `fixed inset-0 z-50 bg-caracas-light flex items-center justify-center`
- **Spinner:** CSS puro (2 anillos concéntricos con `border-[3px] border-gray-200 border-t-caracas-red rounded-full animate-spin`), sin librerías ni iconos
- **Timing:** overlay se monta → 250ms → se desmonta. El layout refluye por debajo (CSS `hidden`/`md:flex`) mientras el overlay está visible
- **Implementación:** listener de `resize` + debounce 150ms; detecta cruce del breakpoint comparando `window.innerWidth < 768` antes y después

---

## 3. Header (Móvil)

```
┌─────────────────────────────┐
│ "Integr."               ☰   │
└─────────────────────────────┘
```

- **Altura:** `h-14` (56px) con `shrink-0`
- **Izquierda:** título del módulo actual, dinámico según ruta
- **Abreviaturas:** solo módulos con nombre largo:
  - Integrantes → **Integr.**
  - Constructor → **Constr.**
  - Los demás (Inicio, Familias, Salud, Reportes, Usuarios, Agenda, Actas) quedan igual
- **Derecha:** botón hamburguesa ☰ (tres líneas horizontales simples, CSS puro)
- **Selector de campamento:** NO va en el header móvil, se mueve al tab bar

---

## 4. Tab Bar (Móvil)

### Estructura

```
┌─────────────────────────────┐
│  ←   🏠    👥    ❤️    →    │  ← fila carrusel (~40px)
│   Hola, Iraki · Sede Ctrl   │  ← fila info (~24px)
└─────────────────────────────┘
```

### CSS

```
position: fixed; bottom: 0; left: 0; right: 0;
height: 72px;
z-index: 40;
background: white;
border-top: 1px solid #e5e7eb;
padding-bottom: env(safe-area-inset-bottom);
```

### Fila 1 — Carrusel de Módulos (~40px)

- **3 iconos visibles simultáneamente**
- **Scroll de 1 en 1**: al tocar → o swipe, avanza/retrocede 1 posición
- **Flechas** `<` y `>` a los lados con `p-3`, tamaño ~16px
  - Extremo izquierdo alcanzado → flecha izq con `opacity-30 pointer-events-none`
  - Extremo derecho alcanzado → flecha der con `opacity-30 pointer-events-none`
- **Swipe táctil:** threshold de ~50px, transición `transform translateX` con `duration-300`
- Cada item del carrusel ocupa ~1/3 del ancho disponible entre flechas, `flex-shrink-0`
- **Módulo activo** (ver sección 5)

### Fila 2 — Usuario + Campamento (~24px)

```
Hola, Iraki · Sede Control
```

- `text-xs text-gray-500 text-center truncate px-2`
- Formato: "Hola, [nombres]" + " · " + [nombre campamento seleccionado]
- Los datos vienen de `useAuth().usuarioActual` y `useCampamento().campamentoSeleccionado`

### Permisos — Caso ≤ 3 módulos

Si el usuario tiene permisos para 3 o menos módulos:
- Sin flechas (no hay carrusel)
- Los iconos se muestran centrados con `justify-center gap-4`
- No se renderizan los botones ← ni →

---

## 5. Indicador de Módulo Activo

El módulo donde está posicionado el usuario se destaca proporcionalmente:

- **Icono activo:** `size={25}` (vs `size={20}` inactivos)
- **Label activo:** `text-[11px] font-semibold text-caracas-red`
- **Label inactivo:** `text-[10px] text-gray-400 font-medium`
- **Barrita indicadora:** debajo del label activo, `w-4 h-0.5 bg-caracas-red rounded-full mx-auto`
- **Transición:** `transition-all duration-200 ease-out`
- **Navegación:** `<Link to={path}>` wrappea cada item (mismo comportamiento que sidebar desktop)

---

## 6. Menú Hamburguesa (Drawer)

Slide-in desde la derecha al tocar ☰ en el header móvil.

```
┌─────────────────────┐
│                 ✕   │  ← cerrar
│ ┌─────────────────┐ │
│ │ 👤 Iraki Reyes   │ │
│ └─────────────────┘ │
│                     │
│  🚪 Cerrar Sesión  │
└─────────────────────┘
```

- **Overlay:** fondo negro semitransparente (`bg-black/30`, tap cierra el drawer)
- **Drawer:** `fixed top-0 right-0 h-full w-64 bg-white shadow-xl z-50`
- **Animación:** slide-in `translate-x-full` → `translate-x-0` con `duration-300 ease-out`
- **Header drawer:** botón ✕ para cerrar
- **Usuario card:** nombre + apellido con icono UserCircle
- **Logout:** botón con texto "Cerrar Sesión", estilo `text-red-600 hover:bg-red-50`, ejecuta `useAuth().logout()` + `navigate('/login')`
- **Estado:** `useState(false)` local en MainLayout

---

## 7. Implementación Técnica

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/layouts/MainLayout.tsx` | Agregar lógica responsive, tab bar, drawer hamburguesa, overlay de transición |

### Hook de breakpoint

Se crea un custom hook `useIsMobile()` que devuelve `boolean` basado en `window.innerWidth < 768`:

```ts
// src/hooks/useIsMobile.ts
import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);
  
  return isMobile;
}
```

### Overlay de transición

```ts
const [showTransition, setShowTransition] = useState(false);
const prevMobile = useRef(isMobile);

useEffect(() => {
  if (prevMobile.current !== isMobile) {
    setShowTransition(true);
    const timer = setTimeout(() => setShowTransition(false), 250);
    prevMobile.current = isMobile;
    return () => clearTimeout(timer);
  }
}, [isMobile]);
```

### Spinner CSS

```html
<div className="w-10 h-10 border-[3px] border-gray-200 border-t-caracas-red rounded-full animate-spin" />
```

### Carrusel

Estado: `carouselIndex` (entero, 0-based). Cálculos:
- `maxIndex = Math.max(0, menuItemsFiltrados.length - 3)`
- `handlePrev()`: `setCarouselIndex(prev => Math.max(0, prev - 1))`
- `handleNext()`: `setCarouselIndex(prev => Math.min(maxIndex, prev + 1))`
- Swipe: `onTouchStart` / `onTouchEnd` comparando `clientX` con threshold 50px

---

## 8. Estados y Casos Borde

| Estado | Comportamiento |
|--------|---------------|
| **Cargando** (loading/errorCarga) | El loader central existente se mantiene. No se renderiza ni sidebar ni tab bar |
| **Sin campamento seleccionado** | Tab bar muestra "Hola, [nombre] · Sin campamento" |
| **≤ 3 módulos por permisos** | Tab bar sin flechas, iconos centrados (no hay nada que scrollear) |
| **Módulo activo fuera de los 3 visibles** | Al navegar por URL, `carouselIndex` se ajusta automáticamente para que el módulo activo esté visible |
| **Rotación del dispositivo** | El overlay de transición se activa al cruzar el breakpoint |
| **Desktop resized <768px** | Misma transición overlay, layout cambia a móvil |
