# Mejoras al Registro de Integrante: Cédula V/E/P, Mascotas para Todos, Teléfono con 0

**Fecha:** 2026-07-29
**Ámbito:** `src/components/refugiados/RegistroModal.tsx`, `src/types/index.ts`, `src/lib/formatCedula.ts`, `src/context/CampamentoContext.tsx`, `src/components/refugiados/FichaRefugiadoModal.tsx`, `src/pages/Refugiados.tsx`, `src/pages/Reportes.tsx`, `src/pages/Familias.tsx`, `src/pages/Actas.tsx`

---

## 1. Cambios en Base de Datos (Supabase)

### 1.1 Nueva columna `nacionalidad`

```sql
ALTER TABLE refugiados ADD COLUMN nacionalidad text;
```

Valores: `'V'`, `'E'`, `'P'`, o `NULL`. Registros existentes quedan con `NULL`.

### 1.2 Migrar `telefono` a texto

```sql
ALTER TABLE refugiados ALTER COLUMN telefono TYPE text USING telefono::text;
```

Conversión automática de int8 a text, sin pérdida de datos.

---

## 2. Cambios en Tipos y Utilidades

### 2.1 `src/types/index.ts` — Interfaz `Refugiado`

Agregar `nacionalidad?: string`. Cambiar `telefono` de `number` a `string`:

```ts
nacionalidad?: string;
telefono?: string;
```

### 2.2 `src/lib/formatCedula.ts`

Agregar segundo parámetro opcional `nacionalidad`. Si viene, anteponer `V-`/`E-`/`P-` al número formateado:

```ts
export function formatCedula(cedula: number | undefined | null, nacionalidad?: string | null): string | null {
  if (cedula == null) return null;
  const prefijo = nacionalidad ? `${nacionalidad}-` : '';
  return prefijo + cedula.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
```

---

## 3. RegistroModal.tsx — Cambios

### 3.1 Cédula con dropdown V/E/P

- Agregar `nacionalidad: ''` al `formData` inicial.
- Reemplazar el `<input type="number" name="cedula">` por un `select` (V/E/P) + `input type="text"` en línea.
- En `handleSubmit`, cambiar `cedula: parseInt(formData.cedula)` → mantener `parseInt` (sigue number en BD), y agregar `nacionalidad: formData.nacionalidad || undefined`.
- En precarga de edición (línea 110): mapear `nacionalidad` desde `refugiadoToEdit.nacionalidad || ''`.
- En `handleSubmit` payload: agregar `nacionalidad: formData.nacionalidad || undefined`.

### 3.2 Mascotas para todos

Línea 1055: eliminar `{formData.esJefeFamilia && (` y su cierre `)}`. La sección de mascotas queda disponible para jefes y miembros.

### 3.3 Teléfono como texto

- Input: cambiar `type="number"` → `type="text"` con `inputMode="numeric"`.
- Guardado: `parseInt(formData.telefono)` → `formData.telefono` (sin conversión).
- Precarga edición: mapear desde `refugiadoToEdit.telefono || ''` (ya string).

### 3.4 isDirty

Agregar chequeo de `nacionalidad` y `telefono` (como string) en la función `isDirty`.

---

## 4. CampamentoContext.tsx — Cambios

### 4.1 Mapeos de Supabase → Refugiado

En los tres lugares donde se mapea (carga inicial, realtime, paginación):
- Agregar: `nacionalidad: (r.nacionalidad as string) || undefined`
- Cambiar: `telefono: r.telefono as string | undefined` (ya no `as number`)

### 4.2 Insert/Update

En `agregarRefugiado` y `actualizarRefugiado`:
- Agregar `nacionalidad: nuevo.nacionalidad || null`
- `telefono: nuevo.telefono || null` (sin cambios, solo cambia el tipo)

---

## 5. FichaRefugiadoModal.tsx — Cambios

### 5.1 Vista UI

- Cédula: `formatCedula(refugiado.cedula, refugiado.nacionalidad) ?? 'S/N'`
- Teléfono: `refugiado.telefono || '—'` (quitar `.toString()`)

### 5.2 PDF de ficha

- Línea 349: `formatCedula(refugiado.cedula, refugiado.nacionalidad) ?? 'S/N'`
- Línea 379: `refugiado.telefono || '—'`

---

## 6. Refugiados.tsx — Cambios

### 6.1 Tabla desktop y cards móvil

Línea 118: `formatCedula(r.cedula, r.nacionalidad) ?? 'S/N'`

### 6.2 Listado PDF

Línea 182: `formatCedula(r.cedula, r.nacionalidad) ?? 'S/N'`

### 6.3 XLSX export

- Cédula: `formatCedula(r.cedula, r.nacionalidad) ?? 'S/N'`
- Teléfono: `r.telefono || '—'` (quitar `.toString()`)

---

## 7. Reportes.tsx — Cambios

### 7.1 Reporte de Discapacitados

Línea 1696: `formatCedula(r.cedula, r.nacionalidad) ?? '—'`

### 7.2 Reporte de Mascotas

- `mascotasReporte` (líneas 243-258): eliminar búsqueda del jefe. `dueno` pasa a ser directamente `r.nombres + ' ' + r.apellidos`.
- Encabezado de tabla: `DUEÑO (JEFE DE FAMILIA)` → `PROPIETARIO`.

### 7.3 Data Única XLSX

- cedula: `formatCedula(r.cedula, r.nacionalidad) ?? 'S/N'`
- telefono: `r.telefono || ''` (quitar `.toString()`)

### 7.4 Export Integrantes XLSX

- telefono ya es `r.telefono || null`. Confirmar que el tipo sea string.

---

## 8. Familias.tsx y Actas.tsx — Cambios

### 8.1 Familias.tsx

Líneas 140 y 245: `formatCedula(r.cedula, r.nacionalidad) ?? 'S/N'`

### 8.2 Actas.tsx

Línea 324: `formatCedula(refugiado?.cedula, refugiado?.nacionalidad) ?? 'S/C'`

---

## 9. Verificación del Esquema DB

Antes de desplegar, ejecutar en el SQL Editor de Supabase:

```sql
ALTER TABLE refugiados ADD COLUMN IF NOT EXISTS nacionalidad text;
ALTER TABLE refugiados ALTER COLUMN telefono TYPE text USING telefono::text;
```

---

## Resumen de Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/types/index.ts` | Agregar `nacionalidad`, cambiar `telefono` a string |
| `src/lib/formatCedula.ts` | Aceptar `nacionalidad` como 2do param |
| `src/components/refugiados/RegistroModal.tsx` | Dropdown V/E/P, remover bloqueo mascotas, telefono string |
| `src/context/CampamentoContext.tsx` | Mapear `nacionalidad`, `telefono` como string |
| `src/components/refugiados/FichaRefugiadoModal.tsx` | formatCedula con nacionalidad, telefono string |
| `src/pages/Refugiados.tsx` | formatCedula con nacionalidad, telefono string |
| `src/pages/Reportes.tsx` | formatCedula con nacionalidad, telefono string, dueño mascota |
| `src/pages/Familias.tsx` | formatCedula con nacionalidad |
| `src/pages/Actas.tsx` | formatCedula con nacionalidad |
