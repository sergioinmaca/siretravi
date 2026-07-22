# Contexto — Captura de foto con cámara web + archivos locales

## Estado
**Diseño aprobado** — pendiente de implementación. Spec en `docs/superpowers/specs/2026-07-21-foto-camara-web-design.md`.

## Objetivo
Modificar el botón de "Foto" (integrante y mascota) para que ofrezca dos vías de captura:
- Cámara web (desktop): usando `getUserMedia` nativo con visor flotante y overlay de encuadre
- Archivos locales: flujo existente con `<input type="file">`
- Mobile: diálogo nativo del SO con `<input type="file" capture="environment">`

## Decisiones de diseño tomadas

| Decisión | Opción elegida | Alternativas descartadas |
|----------|---------------|--------------------------|
| UX en desktop | Popover con 2 opciones ("Usar webcam" / "Elegir de archivos") | Modal de selección, diálogo nativo (solo mobile) |
| UX en mobile | Diálogo nativo del SO | Popover, modal |
| Implementación cámara | `getUserMedia` nativo + canvas | `react-webcam` (libería extra), adaptar `useFotoUpload` |
| Visor de cámara | Popover flotante con overlay de encuadre | Modal, área inline |
| Overlay de encuadre | Gris semitransparente (`bg-gray-900/60`) con zona clara recortada vía `clip-path` | — |
| Recorte | Automático al disparar, inmediato vía canvas | — |
| Post-captura | Preview con "Aceptar" / "Volver a tomar" | — |

## Archivos nuevos

```
src/
├── hooks/
│   └── useCameraCapture.ts        # getUserMedia, stream, captura y crop vía canvas
└── components/
    └── ui/
        ├── PhotoUploadButton.tsx   # Botón unificado desktop vs mobile
        └── CameraViewer.tsx        # Popover con visor + overlay de encuadre
```

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `RegistroModal.tsx` | Reemplazar botón foto (L467-520) y botón mascota (L844-886) por `<PhotoUploadButton>` |
| `FichaRefugiadoModal.tsx` | Reemplazar botón foto (L935-983) y botón mascota (L1126-1173) por `<PhotoUploadButton>` |

## Archivos que NO se tocan

- `useFotoUpload.ts` — lógica de upload/validación a Supabase intacta
- `CampamentoContext.tsx` — `actualizarFotoRefugiado()` intacto
- Supabase Storage y DB — ningún cambio

## Flujo

```
PhotoUploadButton
├── [mobile] → <input type="file" capture="environment"> → diálogo nativo SO
└── [desktop] → Popover:
    ├── "Elegir de archivos" → <input type="file" accept="image/*"> (flujo existente)
    └── "Usar webcam" → CameraViewer:
         1. getUserMedia → stream activo → <video> + overlay
         2. Disparar → canvas.drawImage() + crop al encuadre
         3. Preview → Aceptar (entrega File) / Volver a tomar
         4. Cierre → libera stream
```

El File resultante (de cámara o archivos) sigue el mismo camino de siempre: `validarArchivo()` → preview con FileReader → `uploadFoto()` → Supabase Storage → `actualizarFotoRefugiado()`.

## Contratos

### PhotoUploadButton
```ts
{ currentPhotoUrl?, onFileSelected, isUploading?, disabled?, label?, aspectRatioW?, aspectRatioH? }
```

### useCameraCapture
```ts
{ stream, error, fotoCapturada, estado: 'inactivo'|'solicitando'|'activo'|'capturado', iniciar, capturar, reiniciar, detener }
```

### CameraViewer
```ts
{ isOpen, onClose, onConfirm, aspectRatioW?, aspectRatioH? }
```

## Manejo de errores

| Escenario | Comportamiento |
|-----------|---------------|
| Permiso denegado (`NotAllowedError`) | Mensaje inline + "Reintentar" |
| Sin cámara (`NotFoundError`) | Mensaje "No se detectó ninguna cámara" |
| Stream interrumpido | Evento `ended` → error en hook → mensaje en viewer |
| Error canvas (`toBlob`) | Try/catch en `capturar()`, mensaje "Error al procesar" |
| Archivo inválido / upload falla | Flujo existente sin cambios |

## Proporciones de encuadre

| Contexto | Dimensiones preview | Ratio |
|----------|-------------------|-------|
| RegistroModal (integrante) | 96×100 px | ~1:1.04 |
| RegistroModal (mascota) | 96×100 px | ~1:1.04 |
| FichaRefugiadoModal (integrante) | 112×128 px | 7:8 |
| FichaRefugiadoModal (mascota) | 96×100 px | ~1:1.04 |
