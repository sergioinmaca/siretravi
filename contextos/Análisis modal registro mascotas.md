# Análisis: Implementación de Múltiples Mascotas por Jefe de Familia

## Fecha
20/07/2026

## Problema
Un integrante (Jefe de Familia) puede tener 1 o más mascotas. El sistema actual solo permite 1 mascota por jefe de familia, almacenando los datos como columnas inline en la tabla `refugiados` (`tipo_mascota`, `mascota_sexo`, `mascota_raza`, `mascota_nombre`, `mascota_edad`, `mascota_foto_url`).

## Solución Implementada

Se creó una **tabla independiente `mascotas`** con relación 1:N hacia `refugiados`, con un máximo de 3 mascotas por jefe de familia controlado desde la UI mediante checkboxes en cascada.

### Decisión de Diseño
- **Límite:** Máximo 3 mascotas por jefe de familia
- **Flujo UI:** Checkboxes en cascada (Checkbox 1 → Mascota #1, Checkbox 2 → Mascota #2, Checkbox 3 → Mascota #3)
- **Backward Compatibility:** Los campos inline viejos en `refugiados` se mantienen en el tipo `Refugiado` para no romper consultas/reportes existentes. Los datos nuevos se escriben en la tabla `mascotas`.

### Archivos Creados
1. **`supabase_migration_mascotas_table.sql`** — Migración SQL

### Archivos Modificados
1. **`src/types/index.ts`** — Nueva interfaz `Mascota`
2. **`src/context/CampamentoContext.tsx`** — Estado, CRUD, fetch, realtime de mascotas
3. **`src/components/refugiados/RegistroModal.tsx`** — Checkboxes cascada + multi-formulario + submit con limpieza de fotos
4. **`src/components/refugiados/FichaRefugiadoModal.tsx`** — UI + PDF multi-mascota
5. **`src/components/familias/DetalleFamiliaModal.tsx`** — PDF multi-mascota
6. **`src/pages/Reportes.tsx`** — Reporte desde tabla mascotas
7. **`src/pages/Refugiados.tsx`** — Eliminado prop `onActualizarMascotaFoto`

### Puntos Clave de la Implementación

#### Base de Datos
```sql
CREATE TABLE mascotas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refugiado_id  UUID NOT NULL REFERENCES refugiados(id) ON DELETE CASCADE,
  tipo          TEXT,
  sexo          BOOLEAN,           -- true = Macho, false = Hembra
  raza          TEXT,
  nombre        TEXT,
  edad          INTEGER,
  foto_url      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### Orden de Submit (anti-fotos-huérfanas)
1. Guardar/crear refugiado → obtener `refugiadoId`
2. Subir foto de la persona (si cambió)
3. **Limpiar fotos de mascotas eliminadas** (comparar entries actuales vs. existentes cargadas al abrir el modal)
4. Subir fotos de mascotas nuevas/modificadas
5. Guardar/Crear registros de mascotas

#### Manejo de Fotos por Mascota
- Storage path: `fotos-integrantes/{campamentoId}/{refugiadoId}/mascota/{mascotaId}/{timestamp}.{ext}`
- Cada mascota tiene su propia subida/eliminación de foto independiente
- Al eliminar una mascota (desmarcar checkbox), se borra su foto del Storage antes de eliminar el registro

### Estado Actual
- ✅ Build exitoso (0 errores de TypeScript, 0 errores de Vite)
- Pendiente: Ejecutar migración SQL en Supabase
- Pendiente: Probar el flujo completo en entorno de desarrollo
