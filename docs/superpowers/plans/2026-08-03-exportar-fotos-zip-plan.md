# Plan: Exportar Fotos de Integrantes (ZIP)

## 1. Idea principal del reporte

Nueva tarjeta en el módulo **Reportes** llamada **"Exportar Fotos de Integrantes"**. Al hacer clic, descarga un archivo `.zip` que contiene:

```
{CAMPAMENTO}/
   {Nombres Apellidos del Integrante}/
      {nombre original del archivo en storage}.jpg
```

- **Carpeta principal:** nombre del campamento seleccionado al exportar.
- **Subcarpetas:** una por cada integrante del campamento que tenga foto asociada en Supabase Storage. El nombre de la carpeta es el nombre completo del integrante.
- **Contenido:** una copia de la foto almacenada, conservando su **nombre original** en el storage.

## 2. Fuente de datos

- Las fotos viven en el bucket de Supabase Storage **`fotos-integrantes`**.
- Ruta interna por archivo: `{campamentoId}/{refugiadoId}/{timestamp}.jpg` (las de mascota usan el subfolder `mascota/`; este reporte solo exporta fotos de **persona**).
- La columna `foto_url` de la tabla `refugiados` guarda la **URL pública** de la foto actual de cada integrante.
- Criterio de inclusión: `refugiadosDelCampamento` con `foto_url` definido (filtrado por el campamento seleccionado en el Header).

## 3. Descarga de las fotos

Estrategia robusta en `Reportes.tsx`:

1. Extraer el **path de storage** desde la URL con el patrón `/fotos-integrantes/([^?#]+)/`.
2. Descargar el blob vía `supabase.storage.from('fotos-integrantes').download(path)` (devuelve el **blob original**, sin CORS ni re-codificación).
3. **Fallback:** si no hay match de path o la descarga falla, usar `fetch(url)` → `blob`.
4. Si una foto puntual no puede descargarse, **se omite ese integrante** sin abortar el proceso completo.

**Nombre original:** último segmento del path de storage (ej. `1723456789.jpg`). En el fallback por URL, se extrae el último segmento de la URL antes de `?`/`#`, con fallback final `foto.jpg`.

## 4. Generación del ZIP

- Dependencia: **`jszip`** (ya presente en `node_modules` como dependencia transitiva de `pptxgenjs`; declarar como dependencia directa con `npm install jszip`).
- Compresión `STORE` (las imágenes JPG ya vienen comprimidas; más rápido y menor uso de CPU).

Estructura del árbol:

```ts
const zip = new JSZip();
const carpetaCamp = zip.folder(sanitizar(campamento.nombre))!;
// por cada integrante con foto:
carpetaCamp.folder(sanitizar(nombreCompleto))!.file(nombreOriginal, blob);
```

- **Sanitización de nombres:** eliminar caracteres inválidos para sistemas de archivos: `\ / : * ? " < > |`.
- **De-dupe de carpetas:** si dos integrantes comparten el mismo nombre completo → sufijos ` (2)`, ` (3)`, etc.
- **Descarga final:** `zip.generateAsync({ type: 'blob' })` → `<a download="{campamento}.zip">` + `URL.createObjectURL` / `revokeObjectURL`.
- Reutilizar el estado `isGenerating` (spinner "Generando reporte...").
- Si **ningún** integrante tiene foto → `alert` y abortar sin generar ZIP vacío.

## 5. Interfaz (tarjeta en el grid de Reportes)

- Título: **"Exportar Fotos de Integrantes"**.
- Descripción breve (padrón fotográfico del campamento en un ZIP).
- Botón único **"Exportar ZIP"** con ícono `FolderArchive` (estilo emerald, consistente con las tarjetas XLSX).
- Deshabilitado sin campamento seleccionado o mientras `isGenerating`.

## 6. Permisos

**PENDIENTE — NO implementar aún.**

El gating granular de esta tarjeta (y de "Data Única con Ubicación") debe definirse sobre el sistema de permisos por reporte **tal como funciona actualmente en producción**. Requiere:

1. Pull de los cambios que están en producción (módulo Usuarios / modal de permisos).
2. Análisis de la estructura real (catálogo de `acciones`, `permisos`, `tienePermisoPorCampamento`).
3. Recién ahí definir el gating de las tarjetas (probablemente agregando acciones al módulo `Reportes` y ocultando las tarjetas sin permiso con el patrón existente).

## 7. Archivos a tocar (cuando se implemente)

- `src/pages/Reportes.tsx` — helper `descargarFoto`, handler `handleExportFotosIntegrantesZip`, tarjeta nueva en el grid.
- `package.json` — dependencia directa `jszip`.
- (Opcional, pendiente de permisos) migración SQL de acciones + gating de tarjetas.
