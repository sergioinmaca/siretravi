# Auto-detección de cámara con fallback multi-dispositivo

**Fecha:** 2026-07-22
**Estado:** Diseño aprobado

---

## 1. Resumen

`getUserMedia({ video: true })` selecciona la cámara por defecto del navegador. Si la cámara default es un dispositivo virtual sin frames (OBS Virtual Camera, Nvidia Broadcast) o un hardware desconectado que Windows aún reporta, el stream nunca inicia y el navegador timeoutea (~10s). Este spec reemplaza la selección por defecto por una iteración secuencial sobre todos los dispositivos `videoinput` disponibles, con timeout de 5s por dispositivo, usando `exact: deviceId` para cada uno.

---

## 2. Nuevo método: `autoStartCamera()`

Archivo: `src/hooks/useCamera.ts`

### API

```
autoStartCamera(): Promise<void>
```

### Funcionamiento

1. `enumerateDevices()` → filtra `videoinput` → guarda en `devices[]`
2. Si `devices.length === 0` → `setError('No se detectó ninguna cámara...')`, `status='error'`, return
3. Itera `devices` con un `for...of`:
   - `AbortController` + `setTimeout(5000, abort)`
   - `getUserMedia({ video: { deviceId: { exact: device.deviceId } } })`
   - Si éxito → `clearTimeout`, setea `stream`, `selectedDeviceId`, `status='active'`, return
   - Si falla → `clearTimeout`, `continue` al siguiente dispositivo
   - Entre iteraciones, verifica `callRef.current !== myCall` (cancelado por `stopCamera`)
4. Si todos fallan → `stopCamera()`, `setError('No se pudo acceder a ninguna cámara...')`, `status='error'`

### Respeto del patrón `callRef`

Usa el mismo `callRef.current` para detección de invalidez por `stopCamera` o por otra llamada concurrente. Si se cancela entre iteraciones, se detiene inmediatamente.

---

## 3. Cambios en `startCamera(deviceId)`

Se simplifica: solo acepta `deviceId: string` (explícito, requerido), ya no soporta llamado sin deviceId. Usa `AbortController` con timeout de 8s.

El dropdown del `CameraCapture` lo invoca al seleccionar un dispositivo.

---

## 4. Cambios en `CameraCapture.tsx`

### Efecto inicial

```tsx
useEffect(() => {
    if (isOpen) {
        autoStartCamera();
    } else {
        setCapturedFile(null);
        setCapturedPreview(null);
    }
}, [isOpen, autoStartCamera]);
```

### Botón Reintentar

También llama `autoStartCamera()` en vez de `startCamera()`.

### Dropdown

Sigue usando `selectDevice(deviceId)` → `stopCamera()` → `startCamera(deviceId)`.

---

## 5. Scope

**Incluido:**
- `autoStartCamera()` en `useCamera.ts`
- Timeout 5s por dispositivo con `AbortController`
- Simplificación de `startCamera` para aceptar solo deviceId explícito
- `CameraCapture` usa `autoStartCamera` en inicio y Reintentar

**Excluido:**
- Cambios en RegistroModal, FichaRefugiadoModal
- Cambios en overlay de recorte o captura de foto
- Persistencia del dispositivo seleccionado entre sesiones
