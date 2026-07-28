# Homologación Móvil — Cards de Gráficos de Inicio

**Fecha:** 2026-07-28
**Alcance:** Solo versión móvil (< 768px), 3 cards de gráficos del módulo Inicio

## Resumen

Aplicar la misma estructura full-width de las stat cards a las 3 cards de gráficos
(Tenencia de Vivienda, Situación de Estatus, Ranking de Procedencias), con dos
diferencias: fondo transparente en vez de color, y layout vertical para el Ranking
de Procedencias.

## Cards afectadas

1. Tenencia de Vivienda (donut)
2. Situación de Estatus (donut)
3. Ranking de Procedencias (barras horizontales)

## Diseño visual

### Contenedor

| Propiedad | Desktop | Móvil |
|---|---|---|
| Fondo | `bg-white` | Transparente |
| Borde/sombra | `rounded-2xl shadow-sm border` | Ninguno |
| Padding | `p-6` | `px-4 py-3` |
| Sangrado | Normal | `-mx-4` (cada card individualmente) |
| Gap entre cards | `gap-6` (columna izquierda) | `gap-y-2` |

### Ranking de Procedencias — layout vertical en móvil

```
Desktop:
[PROCEDENCIA w-36 derecha truncate] [========BARRA========]

Móvil:
[PROCEDENCIA alineada izquierda, full-width]
[==================BARRA==================]
```

El título deja de estar truncado y limitado a `w-36`, ocupando todo el ancho
disponible. La barra va debajo, también a ancho completo. El tooltip hover se
mantiene.

### Tenencia y Estatus

Sin cambios de contenido. La dona (SVG) y la leyenda de colores se mantienen
igual, solo cambia el contenedor exterior.

## Implementación

Archivo: `src/pages/Inicio.tsx`

1. **Grid exterior** (`lg:grid-cols-2`): sin cambios
2. **Columna izquierda** (`flex flex-col gap-6`): cambiar a `gap-y-2 md:gap-6`
3. **Cada card de gráfico** — remover card chrome en móvil:
   - `bg-white` → sin reemplazo (transparente)
   - `rounded-2xl shadow-sm border border-gray-100` → `max-md:rounded-none max-md:shadow-none max-md:border-0`
   - `p-6` → `max-md:px-4 max-md:py-3`
   - Agregar `max-md:-mx-4`
4. **Ranking de Procedencias** — cada fila:
   - En móvil: cambiar `flex items-center gap-3` a `max-md:flex-col max-md:items-start max-md:gap-1`
   - Título: `w-36 shrink-0 truncate` → agregar `max-md:w-full max-md:text-left max-md:truncate-none`

## Pruebas

- Verificar en viewport < 768px: cards de gráficos sangran borde a borde, fondo
  transparente, padding correcto
- Ranking: títulos sobre las barras, sin truncar
- Verificar en viewport >= 768px: diseño idéntico al actual
