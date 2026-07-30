# Sidebar flotante y scroll de tabla en tablets

**Fecha**: 2026-07-30
**Proyecto**: SIRETRAVI — Gestión de Campamentos
**Archivos afectados**: `MainLayout.tsx`, `Refugiados.tsx`, nuevo componente `ScrollShadowContainer`

---

## Problema 1: Sidebar empuja el contenido en escritorio/tablet

El sidebar de escritorio (`MainLayout.tsx:213`) está dentro de un contenedor `flex` junto al `<main>`. Al alternar entre colapsado (`w-20`) y expandido (`w-64`), el contenido se desplaza horizontalmente. Esto choca con la experiencia del menú hamburguesa móvil, que se superpone sobre el contenido sin desplazarlo.

**Comportamiento deseado**: el sidebar debe flotar sobre el contenido (como el drawer móvil), sin moverlo. El contenido siempre debe ocupar el ancho completo y tener un margen izquierdo fijo que respete el espacio del sidebar colapsado.

---

## Diseño 1: Sidebar flotante con position fixed

### Cambios en `MainLayout.tsx`

#### Sidebar (línea ~213)

- Pasa de estar en el `flex` container a ser `position: fixed`
- Clases: `fixed left-0 top-0 h-full hidden md:flex z-40`
- Transición de ancho entre `w-20` y `w-64` se mantiene
- Sin backdrop ni cierre al hacer clic en el contenido — solo se cierra con el botón de toggle

#### Header de escritorio (línea ~296)

- Añadir `ml-20` para que no quede debajo del sidebar colapsado
- El header ya es `relative hidden md:flex`, solo se agrega el margen

#### Contenedor del contenido — `main` (línea ~352)

- Añadir `md:ml-20` al contenedor `<main>` para que respete el espacio del sidebar colapsado
- El contenido usa `max-w-7xl mx-auto` — el margen izquierdo se aplica al contenedor padre para que el centrado funcione correctamente

#### Layout resultante

```
┌──────┬──────────────────────────────────────────────┐
│ SIDE │  Header (Panel de Control + Campamento)       │  ← ml-20
│ BAR  ├──────────────────────────────────────────────│
│fixed │                                              │
│ z-40 │             Contenido del módulo              │  ← md:ml-20
│      │              (max-w-7xl mx-auto)              │
│      │                                              │
└──────┴──────────────────────────────────────────────┘
   ↑                                    ↑
   flota sobre el contenido             margen fijo respeta sidebar colapsado
```

#### Estado expandido (sidebar `w-64`)

- El sidebar se expande 176px adicionales (de 80px a 256px) cubriendo parte del margen izquierdo y del contenido
- El contenido NO se mueve — el sidebar simplemente lo tapa

#### Comportamiento

| Estado | Ancho | Contenido |
|---|---|---|
| Colapsado | `w-20` (80px) | `ml-20` — sidebar ocupa justo el margen |
| Expandido | `w-64` (256px) | No se mueve, sidebar cubre parte del contenido y del margen |
| Cerrar | Botón de toggle | Clic en contenido no lo cierra |
| Backdrop | No | Sin fondo oscurecido |
| Móvil (<768px) | Sin cambios | Sigue usando header+tabs+drawer como antes |

---

## Problema 2: Columnas cortadas en tabla de integrantes (tablet apaisada)

La tabla de integrantes (`Refugiados.tsx:469`) tiene 9 columnas. En tablets apaisadas (>=768px, típicamente ~1024px de ancho), las últimas columnas (Estatus, Acciones) quedan fuera de la vista. El contenedor tiene `overflow-x-auto` pero el scroll horizontal no es evidente para el usuario en dispositivos táctiles.

**Comportamiento deseado**: que sea visualmente obvio que hay más columnas desplazables a la derecha, sin cambiar la estructura de la tabla ni ocultar columnas.

---

## Diseño 2: Scroll shadows indicadores

### Componente `ScrollShadowContainer`

Componente reutilizable que envuelve cualquier contenedor con overflow horizontal y muestra sombras/gradientes en los bordes como indicadores visuales de contenido desplazable.

#### Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `children` | `ReactNode` | — | Contenido con overflow horizontal |
| `className` | `string` | `""` | Clases adicionales para el wrapper |

#### Estructura

```tsx
<div className={`relative ${className}`}>
  {/* Sombra izquierda */}
  <div className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-100 to-transparent pointer-events-none z-10 transition-opacity ${showLeftShadow ? 'opacity-100' : 'opacity-0'}`} />

  {/* Contenedor scrolleable */}
  <div className="overflow-x-auto" ref={scrollRef} onScroll={handleScroll}>
    {children}
  </div>

  {/* Sombra derecha */}
  <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-100 to-transparent pointer-events-none z-10 transition-opacity ${showRightShadow ? 'opacity-100' : 'opacity-0'}`} />
</div>
```

#### Lógica de visibilidad

- `showRightShadow`: `true` cuando el scroll no ha llegado al final (`scrollLeft < scrollWidth - clientWidth - 1`)
- `showLeftShadow`: `true` cuando el scroll no está al inicio (`scrollLeft > 0`)
- Ambas se recalculan en cada evento `onScroll` y en el montaje inicial

#### Aplicación en `Refugiados.tsx`

Reemplazar el `<div className="overflow-x-auto">` actual (línea ~469) por `<ScrollShadowContainer>`.

### Nota sobre otras tablas

Este componente puede aplicarse a cualquier otra tabla del proyecto que tenga el mismo problema, pero el alcance de este spec se limita a la tabla de integrantes.

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/layouts/MainLayout.tsx` | Sidebar → fixed, header → ml-20, main → md:ml-20 |
| `src/components/ui/ScrollShadowContainer.tsx` | Nuevo componente |
| `src/pages/Refugiados.tsx` | Usar ScrollShadowContainer en la tabla |

---

## Testing

### Sidebar

- [ ] En desktop (>=768px), sidebar colapsado: el contenido ocupa el ancho completo con margen izquierdo de 80px
- [ ] En desktop, sidebar expandido: el sidebar cubre parte del contenido, el contenido NO se desplaza
- [ ] Toggle colapsa/expande correctamente con transición suave
- [ ] Clic en el contenido no cierra el sidebar
- [ ] En móvil (<768px): sin cambios, sigue usando header+tabs+drawer

### Tabla

- [ ] En tablet apaisada, aparece sombra derecha indicando más columnas
- [ ] Al hacer scroll a la derecha, la sombra derecha desaparece y aparece sombra izquierda
- [ ] Sombra izquierda desaparece al volver al inicio del scroll
- [ ] En pantallas grandes donde todas las columnas caben, ninguna sombra aparece
- [ ] Las sombras no interfieren con clics/interacciones (pointer-events: none)
- [ ] El scroll con touch funciona correctamente
