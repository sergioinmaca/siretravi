# Diseño: Botón de foto con cámara web + archivos locales

**Fecha:** 2026-07-21
**Estado:** Aprobado

## Resumen

Modificar el botón de "Foto" (integrante y mascota) para que ofrezca dos vías de captura:
- **Cámara web** (desktop): usando `getUserMedia` nativo con visor flotante
- **Archivos locales**: flujo existente con `<input type="file">`
- **Mobile**: diálogo nativo del SO con `<input type="file" capture="environment">`

## Arquitectura

### Nuevos archivos

```
src/
├── hooks/
│   └── useCameraCapture.ts        # Hook: getUserMedia, stream, captura y crop vía canvas
└── components/
    └── ui/
        ├── PhotoUploadButton.tsx   # Botón unificado, decide flujo desktop vs mobile
        └── CameraViewer.tsx        # Popover flotante con visor + overlay de encuadre
```

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/refugiados/RegistroModal.tsx` | Reemplazar botón foto (L467-520) y botón mascota (L844-886) por `<PhotoUploadButton>` |
| `src/components/refugiados/FichaRefugiadoModal.tsx` | Reemplazar botón foto (L935-983) y botón mascota (L1126-1173) por `<PhotoUploadButton>` |

### Archivos sin cambios

- `src/hooks/useFotoUpload.ts` — lógica de upload/validación a Supabase intacta
- `src/context/CampamentoContext.tsx` — `actualizarFotoRefugiado()` intacto
- Supabase Storage y DB — ningún cambio

### Árbol de componentes

```
PhotoUploadButton
├── [mobile] → <input type="file" capture="environment">
└── [desktop] → Popover con 2 opciones:
    ├── "Usar webcam" → abre <CameraViewer>
    └── "Elegir de archivos" → <input type="file" accept="image/*"> (existente)
```

### Relación entre unidades

| Unidad | Responsabilidad | Dependencias |
|--------|----------------|--------------|
| `useCameraCapture` | Gestiona stream de cámara, permisos, captura de frame, crop vía canvas. Expone `{ stream, capturar, fotoRecortada, error, estado, iniciar, reiniciar, detener }` | APIs del navegador (`navigator.mediaDevices`, `canvas`) |
| `CameraViewer` | Renderiza popover con `<video>` del stream, overlay de encuadre, botón disparar, preview post-captura con "Aceptar" / "Volver a tomar" | `useCameraCapture` |
| `PhotoUploadButton` | Detecta mobile/desktop, renderiza el botón, decide flujo, unifica el `File` resultante (cámara o archivos) | `CameraViewer`, `<input type="file">` |

## UI del CameraViewer

### Popover flotante de cámara

```
┌─────────────────────────────────┐
│  popover flotante (centrado)    │
│                                 │
│  ┌───────────────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░ │  │  ← overlay gris semitransparente
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░ │  │    (bg-gray-900/60)
│  │ ░░░░░┌─────────┐░░░░░░░░░ │  │
│  │ ░░░░░│         │░░░░░░░░░ │  │  ← zona de encuadre (transparente)
│  │ ░░░░░│  FEED   │░░░░░░░░░ │  │    muestra el video en vivo
│  │ ░░░░░│ CÁMARA  │░░░░░░░░░ │  │
│  │ ░░░░░│         │░░░░░░░░░ │  │
│  │ ░░░░░└─────────┘░░░░░░░░░ │  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  └───────────────────────────┘  │
│                                 │
│     [ 📷 Disparar ]             │
└─────────────────────────────────┘
```

### Implementación del overlay

- `<div>` posicionado absolutamente sobre el `<video>` con `pointer-events: none`
- El encuadre se dibuja con `clip-path` recortando un rectángulo central proporcional al `aspectRatio`
- Color del overlay: `bg-gray-900/60`

### Proporción del encuadre

Se recibe vía prop `aspectRatioW` y `aspectRatioH` desde cada contexto:
- **RegistroModal**: 96×100 px (ratio ~1:1.04)
- **FichaRefugiadoModal**: 112×128 px (ratio 7:8)

### Flujo de captura

1. Popover se abre → `useCameraCapture.iniciar()` → `getUserMedia({ video: true })`
2. Stream activo → video en vivo con overlay de encuadre
3. Click en "Disparar" → `capturar()` → frame al canvas + crop → preview con botones
4. "Aceptar" → `onConfirm(fotoFile)` → cierra popover, entrega `File` a `PhotoUploadButton`
5. "Volver a tomar" → `reiniciar()` → vuelve al visor en vivo
6. Cierre (X o click fuera) → `detener()` libera stream, descarta foto no confirmada

## Contratos (interfaces)

### PhotoUploadButton

```ts
interface PhotoUploadButtonProps {
  currentPhotoUrl?: string | null;
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
  disabled?: boolean;
  label?: string;                     // default: "Foto"
  aspectRatioW?: number;              // default: 1
  aspectRatioH?: number;              // default: 1
}
```

### useCameraCapture

```ts
type CameraState = 'inactivo' | 'solicitando' | 'activo' | 'capturado';

interface UseCameraCaptureResult {
  stream: MediaStream | null;
  error: string | null;
  fotoCapturada: Blob | null;
  estado: CameraState;
  iniciar: () => Promise<void>;
  capturar: () => void;
  reiniciar: () => void;
  detener: () => void;
}
```

### CameraViewer

```ts
interface CameraViewerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (foto: File) => void;
  aspectRatioW?: number;
  aspectRatioH?: number;
}
```

## Manejo de errores

| Escenario | Comportamiento |
|-----------|---------------|
| Permiso de cámara denegado (`NotAllowedError`) | Mensaje inline: "Acceso a la cámara denegado. Permití el acceso desde la configuración del navegador." Botón "Reintentar". |
| No hay cámara (`NotFoundError`) | Mensaje: "No se detectó ninguna cámara." Popover permite cerrarse. |
| Stream interrumpido (evento `ended` del track) | `useCameraCapture` detecta el evento y expone `error`. CameraViewer muestra mensaje y botón reintentar. |
| Error al procesar canvas (`toBlob` falla) | Try/catch en `capturar()`. Mensaje: "Error al procesar la imagen. Intentá de nuevo." |
| Archivo inválido (tipo o tamaño) | Sin cambios: `validarArchivo()` existente muestra toast de error. |
| Fallo de upload a Supabase | Sin cambios: `useFotoUpload` maneja con try/catch + toast. |
| Popover cerrado sin confirmar | Stream liberado, foto capturada descartada. Sin efecto. |

## Testing

| Prueba | Método |
|--------|--------|
| `useCameraCapture` — ciclo de vida | Iniciar → stream activo → capturar → blob generado → reiniciar → detener libera tracks |
| `useCameraCapture` — `NotAllowedError` | Mock `getUserMedia` que rechaza con `NotAllowedError` |
| `useCameraCapture` — `NotFoundError` | Mock que rechaza con `NotFoundError` |
| `CameraViewer` — overlay de encuadre | Verificar que `clip-path` refleja `aspectRatioW`/`aspectRatioH` |
| `CameraViewer` — preview post-captura | Capturar → aparece preview con "Aceptar" / "Volver a tomar" |
| `CameraViewer` — confirm entrega File | Mock `onConfirm`, verificar File con tamaño > 0 |
| `CameraViewer` — volver a tomar | Click "Volver a tomar" → vuelve a stream activo, foto anterior descartada |
| `PhotoUploadButton` — rama desktop | Mock `isMobile=false`, verificar que click abre popover con 2 opciones |
| `PhotoUploadButton` — rama mobile | Mock `isMobile=true`, verificar que click dispara input nativo |
| `PhotoUploadButton` — file picker | Click "Elegir archivos" → seleccionar → `onFileSelected` llamado |
