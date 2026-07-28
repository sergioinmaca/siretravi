# Rediseño Móvil — Cards de Inicio

**Fecha:** 2026-07-28
**Alcance:** Solo versión móvil (< 768px) del módulo Inicio

## Resumen

Cambiar la presentación de los 10 stat cards de la página Inicio exclusivamente en
dispositivos móviles. Se elimina el estilo clásico de card (fondo blanco, bordes
redondeados, sombra, borde izquierdo coloreado) y se reemplaza por divs full-width
con fondo de color distintivo, texto blanco, iconos más pequeños e info secundaria
con colores de contraste.

## Secciones afectadas

Solo los 10 stat cards. Las gráficas (donas, barras de procedencias), planos
generales y croquis de distribución **no se modifican**.

1. Módulos Activos
2. Camas Disponibles
3. Total de Personas
4. Total de Familias
5. Niños (0-11)
6. Niños Lactantes (0-2)
7. No Lactantes (3-11)
8. Adolescentes (12-17)
9. Adultos
10. Adulto Mayor

## Enfoque elegido

**Enfoque A — CSS responsivo puro** usando prefijos `max-md:` de Tailwind. No se
crean nuevos componentes, no se duplica lógica ni JSX. Cada card mantiene su
estructura actual y solo recibe clases condicionales por breakpoint.

## Diseño visual

### Antes (desktop y móvil actual)

```
┌─ bg-white, rounded-2xl, shadow-sm, border, border-l-4 ───┐
│ p-6                                                       │
│ [ICON 32]  Label                                          │
│            Value (text-3xl bold text-gray-900)            │
│            Subtext (text-xs text-gray-400)                │
└───────────────────────────────────────────────────────────┘
```

### Después (solo móvil < 768px)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ -mx-4 (sangra al viewport completo)                        ┃
┃ px-2 py-3    fondo = color distintivo                      ┃
┃                                                            ┃
┃  [icon 18]  Label (text-sm font-medium text-white)         ┃
┃             Value (text-xl font-bold text-white)           ┃
┃             Subtext (text-xs, color distintivo contraste)  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Detalle por card

| Card | Fondo (bg-*) | Ícono (size) | Info secundaria |
|---|---|---|---|
| Módulos Activos | `caracas-blue` | Tent 18 | — |
| Camas Disponibles | `caracas-green` | BedDouble 18 | Ocupadas: `text-yellow-300` |
| Total Personas | `caracas-red` | Users 18 | H: `text-blue-300`, M: `text-pink-300` |
| Total Familias | `indigo-500` | Home 18 | — |
| Niños (0-11) | `orange-400` | Baby 18 | H/M en `text-blue-200` / `text-pink-200` |
| Lactantes (0-2) | `orange-400` | Milk 18 | ídem |
| No Lactantes (3-11) | `orange-300` | Baby 18 | ídem |
| Adolescentes | `yellow-400` | Sparkles 18 | ídem |
| Adultos | `emerald-400` | UserCheck 18 | ídem |
| Adulto Mayor | `rose-400` | Heart 18 | ídem |

### Full-width bleed

El `MainLayout` aplica `p-4` al contenedor de contenido en móvil. Cada card
usa `-mx-4` para contrarrestar ese padding y sangrar de borde a borde del
viewport. El contenido interno usa `px-2` (8px) como padding horizontal.

### Layout y espaciado

- Los contenedores grid existentes (`grid-cols-1 md:grid-cols-2`,
  `grid-cols-1 md:grid-cols-3`) ya apilan a 1 columna en móvil. Se mantienen.
- Gap entre cards en móvil: `gap-y-2` (8px vertical).
- Layout interno de cada card: `flex items-center gap-2` (más compacto que
  el `gap-4` actual).
- Padding vertical: `py-3` en móvil (más compacto que `p-6` actual).

### Desktop (≥768px)

Sin cambios. Las clases con prefijo `md:` preservan el diseño actual: fondo
blanco, rounded-2xl, shadow-sm, border, border-l-4 coloreado.

## Implementación

Archivo a modificar: `src/pages/Inicio.tsx`

Cambios a realizar:
1. Agregar `-mx-4` a los contenedores grid en mobile para habilitar el sangrado
2. Modificar cada card añadiendo clases `max-md:` para:
   - Eliminar: `bg-white`, `rounded-2xl`, `shadow-sm`, `border`,
     `border-gray-100`, `border-l-4`, `border-l-*`, `p-6`, `hover:shadow-md`,
     `transition-shadow`
   - Agregar: color de fondo distintivo, `px-2`, `py-3`, texto blanco
3. Reducir iconos de 32/28 a `size={18}` con prefijo `max-md:`
4. Mantener icon wrapper (`p-4 bg-*/10 rounded-xl`) pero ocultarlo en mobile
5. Ajustar clases de texto: `text-white` para label/value, colores de contraste
   para subtext
6. Reducir `gap-6` grid a `gap-y-2` en mobile

## Pruebas

- Verificar visualmente en viewport < 768px: cards sangran borde a borde, fondo
  de color correcto, texto blanco legible, iconos pequeños visibles.
- Verificar en viewport >= 768px: diseño idéntico al actual.
- Verificar en dispositivo real (Chrome DevTools device emulation).
- Verificar que gráficas (donas, barras) y secciones de croquis no sufrieron
  cambios.
