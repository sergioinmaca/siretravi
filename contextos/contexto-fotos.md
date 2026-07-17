# Contexto — Subida de Fotos (Integrante y Mascota)

## Estado
**Branch actual** — bugs corregidos. Sistema funcional, pero requiere configuración en Supabase Dashboard.

## Objetivo
Permitir subir fotos de los integrantes (tipo carnet) y de sus mascotas. Guardar en Supabase Storage (`fotos-integrantes`) y persistir la URL en la tabla `refugiados` (columnas `foto_url` y `mascota_foto_url`).

## Archivos involucrados

| Archivo | Rol |
|---|---|
| `src/hooks/useFotoUpload.ts` | Hook compartido: validación (5 MB, JPG/PNG/WEBP), upload a Storage, delete de archivos viejos, lectura de dataURL para previews |
| `src/components/refugiados/RegistroModal.tsx` | Formulario de registro/edición: botón de foto en sección "Datos Personales", botón de foto mascota en sección "Jerarquía Familiar" |
| `src/components/refugiados/FichaRefugiadoModal.tsx` | Ficha del integrante: botones independientes "Subir foto" y "Foto Mascota" con guardado explícito |
| `src/components/salud/HistoriaClinicaDetalleModal.tsx` | Solo lectura de foto existente (no upload) |
| `src/context/CampamentoContext.tsx` | `actualizarFotoRefugiado()` — actualiza `foto_url`/`mascota_foto_url` en BD. Mapeos de datos desde Supabase en 3 lugares. |

## Flujo de subida

1. Usuario selecciona archivo → `validarArchivo()` (tamaño ≤5 MB, extensión JPG/PNG/WEBP)
2. Vista previa con `leerArchivoComoDataURL()` (FileReader)
3. Al guardar → `uploadFoto()` → Supabase Storage → `getPublicUrl()`
4. `actualizarFotoRefugiado()` → UPDATE en `refugiados`
5. Limpieza: `deleteStorageFile()` borra el archivo viejo SOLO si el upload fue exitoso

## Paths en Storage

```
fotos-integrantes/{campamentoId}/{refugiadoId}/{timestamp}.{ext}
fotos-integrantes/{campamentoId}/{refugiadoId}/mascota/{timestamp}.{ext}
```

## Bugs encontrados y corregidos

### 1. Validación MIME type muy estricta (useFotoUpload.ts)
**Problema:** Solo aceptaba `image/jpeg`, `image/png`, `image/webp` por `file.type`. Algunos navegadores reportan `file.type === ""`.
**Fix:** Validación por extensión como fallback. Si el MIME type o la extensión coinciden, el archivo pasa.

### 2. `mascota_foto_url` faltante en mapeos de Supabase (CampamentoContext.tsx)
**Problema:** En 3 lugares donde se mapean datos desde Supabase a objetos `Refugiado`, se incluía `foto_url` pero no `mascota_foto_url`:
- Línea ~133: carga inicial (`cargarDatos`)
- Línea ~197: suscripción Realtime (`mapRefugiadoPayload`)
- Línea ~755: paginado (`obtenerRefugiadosPaginados`)
**Fix:** Agregado `mascota_foto_url: (r.mascota_foto_url as string) || undefined` en los 3 mapeos.

### 3. `deleteStorageFile` antes del upload (FichaRefugiadoModal.tsx)
**Problema:** Se borraba la foto vieja de Storage ANTES de subir la nueva. Si el upload fallaba, la foto vieja se perdía.
**Fix:** Movido el `deleteStorageFile` a DESPUÉS de confirmar que el upload fue exitoso.

### 4. `mascota_foto_url` pisado a NULL en edición (RegistroModal.tsx)
**Problema:** Al editar un integrante con foto de mascota existente, si se seleccionaba una nueva foto, el payload enviaba `mascota_foto_url: undefined` → `actualizarRefugiado` lo convertía a NULL antes de que el upload terminara.
**Fix:** El payload siempre conserva la URL existente (`refugiadoToEdit?.mascota_foto_url`). El `actualizarFotoRefugiado` solo se usa para SETEAR la nueva URL después del upload exitoso.

### 5. Error silencioso en `actualizarFotoRefugiado`
**Problema:** Los callers (`RegistroModal`, `FichaRefugiadoModal`) ignoraban el `boolean` de retorno de `actualizarFotoRefugiado`. Si el UPDATE fallaba, no se mostraba error.
**Fix:** Ambos callers ahora verifican el retorno y muestran error si es `false`.

### 6. `setTimeout` frágil en `isSubmitting` (RegistroModal.tsx)
**Problema:** `isSubmitting` se reseteaba con `setTimeout(..., 3000)` en vez de esperar a que las operaciones asíncronas terminaran.
**Fix:** Eliminado el timer. `setIsSubmitting(false)` se ejecuta al final del flujo.

## Configuración pendiente en Supabase

El bucket `fotos-integrantes` en Supabase Storage debe tener configurados los MIME types permitidos:

→ **Supabase Dashboard → Storage → `fotos-integrantes` → Configuration → Allowed MIME Types:**

```
image/jpeg, image/png, image/webp
```

Si falta `image/png`, las subidas de archivos PNG retornarán `400 (Bad Request): mime type image/png is not supported`.

## Formato de preview (impresión)

Los previews usan `object-contain` para que la imagen se adapte a la altura del contenedor sin recortes, igual que el formato de impresión PDF (25×30mm, proporción 5:6 tipo carnet).

| Modal | Contenedor |
|---|---|
| RegistroModal (integrante) | `w-24 h-[100px]` |
| RegistroModal (mascota) | `w-24 h-[100px]` |
| FichaRefugiadoModal (integrante) | `w-28 h-32` |
| FichaRefugiadoModal (mascota) | `w-24 h-[100px]` |
| HistoriaClinicaDetalleModal | `w-28 h-32` |

Todos con `object-contain rounded-xl border-2 border-gray-200 bg-gray-100`.
