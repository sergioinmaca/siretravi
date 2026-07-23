# Captura de Foto con Cámara Web

**Fecha:** 2026-07-21
**Estado:** Diseño aprobado

---

## 1. Resumen

Agregar la capacidad de tomar fotos directamente desde la cámara web del dispositivo como alternativa al upload de archivo, en los modales de registro y ficha de refugiados. Reutiliza el pipeline existente de `useFotoUpload` (validación, upload a Supabase Storage, preview).

---

## 2. Nuevo hook: useCamera

Archivo: `src/hooks/useCamera.ts`

### API

```
useCamera() → {
  // Estado
  stream: MediaStream | null,
  error: string | null,
  status: 'idle' | 'starting' | 'active' | 'error',

  // Acciones
  startCamera: () => Promise<void>,
  stopCamera: () => void,
  capturePhoto: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => File | null,
}
```

### Funcionamiento

- `startCamera()` — llama a `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })`. Almacena el stream en estado y lo expone. Si falla, setea `error` con mensaje descriptivo (permiso denegado, no soportado, etc.).
- `stopCamera()` — detiene todos los tracks del stream con `.getTracks().forEach(t => t.stop())` y resetea el estado.
- `capturePhoto(video, canvas)` — dibuja el frame actual del `<video>` en un `<canvas>` a resolución 2x del tamaño de display del video, exporta a `Blob` JPEG con calidad 0.9, y lo envuelve en un `File` con nombre `camara_{timestamp}.jpg`. Retorna `null` si el stream no está activo.
- Limpieza automática vía `useEffect` cleanup al desmontar (llama a `stopCamera`).

### Manejo de errores

| Error | Mensaje al usuario |
|-------|-------------------|
| `NotAllowedError` | "Permiso de cámara denegado. Conceda acceso desde la configuración del navegador." |
| `NotFoundError` | "No se detectó ninguna cámara en este dispositivo." |
| `NotReadableError` | "La cámara está en uso por otra aplicación." |
| HTTPS no disponible | "La cámara solo funciona en conexiones seguras (HTTPS)." |

---

## 3. Nuevo componente: CameraCapture

Archivo: `src/components/shared/CameraCapture.tsx`

### Props

```ts
interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}
```

### Layout

Sub-modal que se superpone al modal padre (z-50 + 10 = z-[60]):

```
┌──────────────────────────────────────────┐
│ overlay: bg-black/80                     │
│                                          │
│   ┌────────────────────────────────┐     │
│   │ header: "Tomar Foto"    [X]    │     │
│   ├────────────────────────────────┤     │
│   │                                │     │
│   │   ┌──────────────────────┐     │     │
│   │   │                      │     │     │
│   │   │   <video> stream     │     │     │
│   │   │   (espejo horizontal) │     │     │
│   │   │                      │     │     │
│   │   └──────────────────────┘     │     │
│   │                                │     │
│   │         [●] capturar           │     │
│   │                                │     │
│   ├────────────────────────────────┤     │
│   │ footer: "Cancelar"             │     │
│   └────────────────────────────────┘     │
└──────────────────────────────────────────┘
```

### Estados del componente

**1. Iniciando cámara (`status === 'starting'`)**
- Spinner centrado con texto "Activando cámara..."

**2. Cámara activa (`status === 'active'`)**
- `<video>` con `autoPlay playsInline muted` y `ref` para acceder al elemento
- CSS: `object-cover`, `rounded-2xl`, `scale-x-[-1]` (efecto espejo para cámara frontal)
- Botón circular de captura centrado debajo del video:
  ```tsx
  <button className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-all">
    <div className="w-12 h-12 rounded-full bg-white mx-auto" />
  </button>
  ```

**3. Preview post-captura**
- Imagen capturada en reemplazo del `<video>`, con mismos bordes redondeados
- Dos botones: "Retomar" (vuelve al stream) y "Usar esta foto" (llama a `onCapture(file)` y cierra)

**4. Sin permisos / Error**
- Mensaje descriptivo con icono de cámara tachada
- Botón "Cerrar"

### Ciclo de vida
- Al abrir (`isOpen === true`) → `startCamera()`
- Al cerrar (`isOpen === false`) → `stopCamera()`
- Al desmontar → `stopCamera()` (useEffect cleanup)

### `<canvas>` oculto
- Un `<canvas>` con `ref` para `capturePhoto`, oculto con `className="hidden"`. Se usa solo para capturar frames, no se renderiza.

---

## 4. Cambios en RegistroModal.tsx

### Estado nuevo
```ts
const [showCamera, setShowCamera] = useState(false);
const [showMascotaCamera, setShowMascotaCamera] = useState(false);
```

### Sección "Foto del integrante"
Se agrega un segundo botón junto al existente "Foto":

```
[📷 Cámara]  [🖼 Foto]
```

- Botón "Cámara": abre `<CameraCapture>` para integrante
- Botón "Foto": comportamiento existente (input file)
- Layout: dos botones apilados verticalmente dentro del contenedor `w-24`, separados por `gap-2`

```tsx
{/* Columna de botones */}
<div className="flex flex-col gap-2">
  <button type="button" onClick={() => setShowCamera(true)} disabled={isUploading}
    className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-caracas-red hover:text-caracas-red transition-colors flex items-center justify-center gap-1">
    <Camera size={14} /> Cámara
  </button>
  {/* botón "Foto" existente */}
</div>
```

### Integración con CameraCapture
```tsx
<CameraCapture
  isOpen={showCamera}
  onClose={() => setShowCamera(false)}
  onCapture={async (file) => {
    setShowCamera(false);
    setFotoFile(file);
    const dataUrl = await leerArchivoComoDataURL(file);
    setFotoPreview(dataUrl);
  }}
/>
```

### Sección "Foto mascota"
Mismo patrón con `showMascotaCamera` y segundo `<CameraCapture>` para la mascota.

---

## 5. Cambios en FichaRefugiadoModal.tsx

Mismo patrón que RegistroModal:
- Estado `showCamera` / `showMascotaCamera`
- Botón "Cámara" junto a "Subir foto" (solo si `esMaster`)
- `<CameraCapture>` integrado con el flujo existente de preview + guardado explícito
- La lógica de dirty-state y botón "Guardar" no cambia

---

## 6. Scope

**Incluido:**
- Captura con cámara frontal (user-facing) y trasera
- Preview y confirmación post-captura
- Conversión a JPEG calidad 0.9
- Reutilización del pipeline `useFotoUpload` (validación, upload, preview)
- Manejo de errores de permisos y compatibilidad
- Limpieza automática del stream (stop tracks al cerrar)
- Foto de integrante y foto de mascota en ambos modales

**Excluido:**
- Grabación de video
- Filtros o edición de la imagen capturada
- Cámara en HistoriaClinicaDetalleModal (solo lectura, no upload)
- Cambios en la validación o el pipeline de upload existente
- Soporte para múltiples cámaras simultáneas
