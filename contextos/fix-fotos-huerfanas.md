# Contexto: Fix de Guardado de Fotos y Limpieza de Huérfanas

**Fecha:** Julio 2026
**Conversación:** Corrección del flujo de guardado de fotos en el registro de integrantes + herramienta de limpieza de fotos huérfanas.

---

## 1. Problema Original

El usuario reportó que al registrar integrantes con foto (vía cámara), la foto no se guardaba. Al revisar la ficha del integrante, aparecía sin foto. Se sospechaban 3 causas: concurrencia, caída de internet, o timeout de carga a Supabase.

---

## 2. Diagnóstico

### Flujo original (roto)
```
1. INSERT refugiado (foto_url = null)
2. upload foto a Storage
3. UPDATE refugiados SET foto_url = ...
```

**Problema:** Si el paso 2 o 3 fallaba, el integrante existía en DB pero `foto_url = null` para siempre. Además:

- `handleCameraCapture` no validaba tamaño ni MIME type de las fotos de cámara. Si > 1 MB, Supabase las rechazaba.
- `deleteStorageFile` no verificaba errores del `.remove()` → fotos viejas se acumulaban en Storage.
- `eliminarRefugiado` solo borraba `foto_url` y `mascota_foto_url` → archivos sobrantes quedaban huérfanos.
- `canvas.toDataURL` sin try/catch → si el canvas estaba tainted, crasheaba silenciosamente.
- Gap en protección de doble submit → posible crear refugiados duplicados.

### Fotos múltiples en Storage

Un mismo refugiado acumulaba múltiples fotos porque al reemplazar una foto, la vieja no se eliminaba correctamente (falta de verificación en `deleteStorageFile`).

---

## 3. Solución Implementada — 6 Fases

### Fase 0 — Validación inmediata de foto de cámara
**Archivos:** `RegistroModal.tsx`, `FichaRefugiadoModal.tsx`

```typescript
const handleCameraCapture = async (file: File) => {
    const jpeg = await convertirAJPEG(file);
    const error = validarArchivo(jpeg);   // valida ≤ 1 MB y MIME type
    if (error) { setFotoUploadError(error); return; }
    setFotoFile(jpeg);
    // ...
};
```

### Fase 1 — INSERT atómico (upload antes del INSERT)
**Archivos:** `RegistroModal.tsx`, `CampamentoContext.tsx`

Nuevo flujo para creación con foto:
```
1. Generar refugiadoId = crypto.randomUUID()
2. Upload foto a Storage → URL
3. INSERT refugiado (id = refugiadoId, foto_url = URL)
   └─ Si falla → borrar foto de Storage (rollback)
```

- `agregarRefugiado` ahora acepta `id` explícito y `mascota_foto_url`.
- Para creación sin foto → sin cambios.
- Para edición → flujo existente (upload post-UPDATE, `actualizarFotoRefugiado`).

### Fase 2 — `deleteStorageFile` con verificación
**Archivo:** `useFotoUpload.ts`

```typescript
const deleteStorageFile = async (url): Promise<boolean> => {
    const { error } = await supabase.storage.from('fotos-integrantes').remove([match[1]]);
    if (error) { console.error(...); return false; }
    return true;
};
```

### Fase 3 — Protección contra doble submit
**Archivo:** `RegistroModal.tsx`

`submittingRef.current = true` se mueve al inicio de `handleSubmit`, antes del primer `await`. Se usa `submittingRef` en vez de `isSubmitting` para el check de entrada (ref sincrónico vs state asíncrono).

### Fase 4 — try/catch en capturePhoto
**Archivo:** `useCamera.ts`

`canvas.toDataURL('image/jpeg')` envuelto en try/catch para prevenir crashes por canvas tainted.

### Fase 5 — Botón de limpieza de fotos huérfanas en Constructor
**Archivos:** `Constructor.tsx`, `useFotoUpload.ts`, `supabase_migration_fotos_huerfanas.sql`

**Ubicación:** Card "Mantenimiento del Sistema" en el módulo Constructor, visible solo para MASTER.

**Funcionalidad:**
- Botón "Buscar fotos huérfanas" → escanea Storage vía RPC
- Tabla con columns: checkbox, thumbnail, tipo, nombres/apellidos, motivo, campamento
- Motivos: "Foto sobrante" (reemplazo anterior) o "Integrante eliminado"
- Checkbox maestro + individuales
- Botón "Eliminar seleccionadas (N)" con confirm dialog

**RPC SQL:** `listar_fotos_huerfanas()` — compara `storage.objects` contra `refugiados.foto_url` y `mascota_foto_url`.

### Fase 6 — `vaciarCarpetaRefugiado` al eliminar
**Archivos:** `useFotoUpload.ts`, `CampamentoContext.tsx`

`eliminarRefugiado` ahora llama a `vaciarCarpetaRefugiado(campamentoId, id)` que lista y borra TODOS los archivos en la carpeta del refugiado (incluyendo subcarpeta `mascota/`), no solo los 2 referenciados.

---

## 4. Fix de Falsos Positivos en el RPC

**Problema:** La regex `substring(foto_url FROM '/fotos-integrantes/(.+)$')` fallaba si el URL tenía query params (`?download`) o encoding distinto → marcaba fotos referenciadas como huérfanas.

**Solución (3 cambios):**

1. **RPC regex:** `(.+)$` → `([^?#]+)` — corta en `?` o `#`
2. **Doble verificación cliente en `buscarFotosHuerfanas`:** Tras el RPC, cruza contra TODOS los `foto_url` y `mascota_foto_url` de la DB con la misma regex `[^?#]+`. Descarta falsos positivos y loguea warning.
3. **`deleteStorageFile` regex:** mismo fix `[^?#]+`

---

## 5. Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/components/refugiados/RegistroModal.tsx` | Fases 0, 1, 3 — validación cámara, INSERT atómico, doble submit |
| `src/components/refugiados/FichaRefugiadoModal.tsx` | Fase 0 — validación cámara |
| `src/hooks/useFotoUpload.ts` | Fases 2, 5, 6, fix regex — deleteStorageFile con verificación, buscarFotosHuerfanas con doble check, eliminarFotosHuerfanas, vaciarCarpetaRefugiado |
| `src/hooks/useCamera.ts` | Fase 4 — try/catch en capturePhoto |
| `src/context/CampamentoContext.tsx` | Fases 1, 6 — id explícito en agregarRefugiado, vaciarCarpetaRefugiado en eliminarRefugiado |
| `src/pages/Constructor.tsx` | Fase 5 — card de mantenimiento con tabla de huérfanas, checkboxes, eliminación selectiva |
| `supabase_migration_fotos_huerfanas.sql` | **NUEVO** — función RPC `listar_fotos_huerfanas()` + regex fix |
| `contextos/fix-fotos-huerfanas.md` | **NUEVO** — este archivo de contexto |

---

## 6. Pendiente

Ejecutar `supabase_migration_fotos_huerfanas.sql` en el SQL Editor de Supabase para aplicar la función RPC. Sin esto, el botón de limpieza no funcionará.

---

## 7. Lo que NO cambió

- `actualizarFotoRefugiado` — se mantiene para edición y ficha
- `FichaRefugiadoModal.handleGuardar` — flujo existente (salvo validación de cámara)
- Schema de DB, bucket `fotos-integrantes`, RLS
- Realtime subscription, sidebar, rutas
