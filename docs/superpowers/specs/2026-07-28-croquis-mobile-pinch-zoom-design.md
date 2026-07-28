# Croquis Móvil + Pinch-to-Zoom — Módulo Inicio

**Fecha:** 2026-07-28
**Alcance:** Solo versión móvil (< 768px) del módulo Inicio

## Resumen

1. Canvas del CroquisViewer en orientación vertical (portrait) en móvil
2. Pinch-to-zoom táctil en CroquisViewer y PlanoGeneralViewer

## Canvas vertical

En `Inicio.tsx`, condicionar `width`/`height` del CroquisViewer vía `isMobile`:

| Prop | Desktop | Móvil |
|---|---|---|
| `width` | 1500 | 800 |
| `height` | 800 | 1200 |

El contenido se redibuja en el nuevo marco. CSS `w-full` escala al ancho de pantalla.

## Pinch-to-Zoom — CroquisViewer

Archivo: `src/components/constructor/CroquisViewer.tsx`

Agregar infraestructura completa de zoom+pan:
- Estado: `zoom`, `offsetX`, `offsetY`, constantes ZOOM_MIN/MAX/STEP
- Handlers: touch (pan 1 dedo + pinch 2 dedos), wheel (zoom al cursor), mouse (pan)
- Renderizado con `ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY)`
- Tooltip hover: ajustar coordenadas por zoom+offset
- Canvas CSS: `cursor-grab` si zoom > 1, `touch-action: none`
- Zoom buttons: barra `-` / `+` con porcentaje, visible si `zoom !== 1`

## Pinch-to-Zoom — PlanoGeneralViewer

Archivo: `src/components/constructor/PlanoGeneralViewer.tsx`

Extender touch handlers existentes:
- Detectar 2 dedos → modo pinch
- Calcular escala desde distancia entre dedos
- Ajustar offset para anclar centro del pinch
- Compatible con pan de 1 dedo, botones y wheel existentes

## Algoritmo pinch

```
touchstart(2 dedos): guardar {dist, zoom, offset, centro}
touchmove(2 dedos):  scale = nuevaDist / distInicial
                     nuevoZoom = clamp(zoom * scale, MIN, MAX)
                     ajustar offset al centro del pinch
touchend:            si 1 dedo → pan; si 0 → soltar
```
