# Sombra de color desplazada en cards de indicadores

**Fecha:** 2026-08-09
**Ámbito:** `src/pages/Inicio.tsx`

---

## 1. Contexto

Las cards de indicadores en el dashboard usan `border-l-4 border-l-caracas-{color}` como acento visual (borde izquierdo de 4px en color institucional). El objetivo es reemplazar este borde por un efecto de "sombra desplazada" del mismo color: un rectángulo del color acento detrás de la card, desplazado 5px hacia abajo y 5px hacia la izquierda, visible solo en los bordes izquierdo e inferior.

```
  ██ ┌───────────┐
  ██ │  Card     │
  ██ │           │
  ██ └───────────┘
  ████████████████
```

## 2. Comportamiento deseado

- El acento de color ya no es un `border-left`, sino un `box-shadow` sólido desplazado `-5px` (izquierda) y `5px` (abajo).
- Se conserva la sombra difuminada actual (`shadow-sm`) combinada con la nueva sombra de color.
- En mobile (`max-md:`), la sombra de color se oculta (`shadow-none`) porque las cards cambian a fondo sólido.
- El `hover:shadow-md` actual se mantiene (en hover solo se ve la sombra de elevación, sin la sombra de color; igual que el comportamiento actual donde el borde izquierdo no se modifica en hover).

### 2.1 Cards afectadas (12 en total)

| # | Indicador | Color acento | Hex |
|---|-----------|-------------|-----|
| 1 | Modulos Activos | `caracas-blue` | `#0033A0` |
| 2 | Camas Ocupadas | `caracas-green` | `#007229` |
| 3 | Total Personas | `caracas-red` | `#bc2f4a` |
| 4 | Total Familias | `indigo-500` | `#6366f1` |
| 5 | Mujeres | `pink-500` | `#ec4899` |
| 6 | Hombres | `purple-500` | `#a855f7` |
| 7 | Niños (0-11) | `orange-400` | `#fb923c` |
| 8 | Lactantes (0-2) | `orange-400` | `#fb923c` |
| 9 | No Lactantes (3-11) | `orange-500` | `#f97316` |
| 10 | Adolescentes (12-17) | `amber-500` | `#f59e0b` |
| 11 | Adultos (18-59/18-54) | `emerald-400` | `#34d399` |
| 12 | Adulto Mayor | `rose-400` | `#fb7185` |

---

## 3. Implementación

### 3.1 Archivo: `src/pages/Inicio.tsx`

Cada card sigue este patrón de cambio:

**Antes:**
```tsx
className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-caracas-blue flex items-center gap-4 hover:shadow-md transition-shadow max-md:bg-caracas-blue max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:border-l-0 max-md:px-4 max-md:py-3 max-md:gap-2"
```

**Después:**
```tsx
className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_#0033A0] flex items-center gap-4 hover:shadow-md transition-shadow max-md:bg-caracas-blue max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:gap-2"
```

Resumen de cambios por card:

| Quitar | Agregar |
|--------|---------|
| `shadow-sm` | `shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_{hex}]` |
| `border-l-4` | — |
| `border-l-{color}` | — |
| `max-md:border-l-0` | — |

### 3.2 Mapeo completo de reemplazos

```
#1  caracas-blue    → shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_#0033A0]
#2  caracas-green   → shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_#007229]
#3  caracas-red     → shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_#bc2f4a]
#4  indigo-500      → shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_#6366f1]
#5  pink-500        → shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_#ec4899]
#6  purple-500      → shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_#a855f7]
#7  orange-400      → shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_#fb923c]
#8  orange-400      → shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_#fb923c]
#9  orange-500      → shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_#f97316]
#10 amber-500       → shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_#f59e0b]
#11 emerald-400     → shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_#34d399]
#12 rose-400        → shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-5px_5px_0_0_#fb7185]
```

---

## 4. Archivos afectados

| Archivo | Tipo | Cambio |
|---|---|---|
| `src/pages/Inicio.tsx` | Modificado | 12 cards: reemplazar `border-l-*` + `shadow-sm` + `max-md:border-l-0` por `shadow-[...]` |

**No se modifican:** tailwind.config.js, CSS global, otros módulos.

---

## 5. Casos de prueba

| # | Caso | Esperado |
|---|---|---|
| 1 | Dashboard con campamento seleccionado | Los 12 indicadores muestran sombra de color desplazada a la izquierda y abajo |
| 2 | Hover sobre una card | Transición a `shadow-md` (sombra de elevación gris), la sombra de color desaparece durante el hover |
| 3 | Vista mobile (<768px) | Sin sombra de color ni borde izquierdo (comportamiento actual preservado) |
| 4 | Sin campamento seleccionado | Cards no se renderizan (sin cambios) |
