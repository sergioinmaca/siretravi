# Especificación: Mutación del flujo "Registrar Atención Médica"

**Fecha:** 2026-07-21
**Proyecto:** SIRETRAVI

## Objetivo

Transformar el modal `AtencionMedicaModal` en un modal multi-tipo que permita registrar
atenciones médicas (con especialidades), beneficios y donaciones, utilizando la misma tabla
`atenciones_medicas` con un campo `tipo` para diferenciarlos.

## Modelo de Datos

### Cambios en la tabla `atenciones_medicas`

Se agregan las siguientes columnas a la tabla existente en Supabase:

```sql
ALTER TABLE atenciones_medicas ADD COLUMN tipo TEXT;

-- tipo = 'medica' (especialidades)
ALTER TABLE atenciones_medicas ADD COLUMN especialidad_1 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN diagnostico_1 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN tratamiento_1 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN especialidad_2 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN diagnostico_2 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN tratamiento_2 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN especialidad_3 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN diagnostico_3 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN tratamiento_3 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN especialidad_4 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN diagnostico_4 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN tratamiento_4 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN especialidad_5 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN diagnostico_5 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN tratamiento_5 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN especialidad_6 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN diagnostico_6 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN tratamiento_6 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN especialidad_7 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN diagnostico_7 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN tratamiento_7 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN especialidad_8 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN diagnostico_8 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN tratamiento_8 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN especialidad_9 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN diagnostico_9 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN tratamiento_9 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN especialidad_10 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN diagnostico_10 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN tratamiento_10 TEXT;

-- tipo = 'beneficio'
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_tipo_1 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_descripcion_1 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_entregado_por_1 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_fecha_1 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_tipo_2 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_descripcion_2 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_entregado_por_2 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_fecha_2 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_tipo_3 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_descripcion_3 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_entregado_por_3 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_fecha_3 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_tipo_4 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_descripcion_4 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_entregado_por_4 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_fecha_4 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_tipo_5 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_descripcion_5 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_entregado_por_5 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_fecha_5 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_tipo_6 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_descripcion_6 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_entregado_por_6 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_fecha_6 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_tipo_7 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_descripcion_7 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_entregado_por_7 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_fecha_7 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_tipo_8 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_descripcion_8 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_entregado_por_8 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_fecha_8 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_tipo_9 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_descripcion_9 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_entregado_por_9 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_fecha_9 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_tipo_10 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_descripcion_10 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_entregado_por_10 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN beneficio_fecha_10 DATE;

-- tipo = 'donacion'
ALTER TABLE atenciones_medicas ADD COLUMN donacion_tipo_1 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_descripcion_1 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_entregado_por_1 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_fecha_1 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_tipo_2 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_descripcion_2 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_entregado_por_2 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_fecha_2 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_tipo_3 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_descripcion_3 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_entregado_por_3 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_fecha_3 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_tipo_4 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_descripcion_4 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_entregado_por_4 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_fecha_4 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_tipo_5 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_descripcion_5 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_entregado_por_5 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_fecha_5 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_tipo_6 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_descripcion_6 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_entregado_por_6 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_fecha_6 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_tipo_7 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_descripcion_7 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_entregado_por_7 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_fecha_7 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_tipo_8 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_descripcion_8 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_entregado_por_8 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_fecha_8 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_tipo_9 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_descripcion_9 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_entregado_por_9 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_fecha_9 DATE;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_tipo_10 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_descripcion_10 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_entregado_por_10 TEXT;
ALTER TABLE atenciones_medicas ADD COLUMN donacion_fecha_10 DATE;
```

### TypeScript

Se actualiza la interfaz `AtencionMedica` en `src/types/index.ts` con los nuevos campos.

## UI del Modal

### Layout general
```
┌─────────────────────────────────────────────────────┐
│  Registrar Atención                        [X]      │
│  Paciente: Pérez, Juan                              │
│                                                     │
│  [Atención Médica] [Beneficio] [Donación]           │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  (Campos según el tipo seleccionado)                │
│                                                     │
│  ❮ Cancelar              [💾 Registrar]            │
└─────────────────────────────────────────────────────┘
```

### Tipo: Atención Médica
- Signos vitales (campos actuales: fecha, presión arterial, temperatura, frecuencia cardiaca, peso, talla, saturación de oxígeno, observaciones)
- Checkbox: "¿Requiere atención de especialidad?"
- Al activarse: selector Cantidad (1-10) + filas dinámicas (especialidad, diagnóstico, tratamiento)

### Tipo: Beneficio y Donación
- Sin signos vitales
- Checkbox + Cantidad + filas dinámicas (tipo, descripción, entregado por, fecha)

## Acceso al Modal

### 1. Desde HistoriasClínicas
El botón "Atención Médica" por fila se actualiza para abrir el nuevo modal con `historiaClinicaId` y `refugiadoNombre` preasignados. El tipo por defecto es 'medica'.

### 2. Desde Salud Index (nuevo card)
```
┌─────────────────────────────────────┐
│  🩺 Registrar Atención              │
│  Registre atención médica,          │
│  beneficios o donaciones            │
│  recibidas.                         │
└─────────────────────────────────────┘
```
Flujo: card → buscar refugiado → seleccionar tipo → registrar

El modal se abre sin `historiaClinicaId`. Muestra un buscador de refugiado (como en HistoriaClinicaModal). Al seleccionar un refugiado, se muestra el selector de tipo y los campos correspondientes.

## Data Access

Función `agregarRegistroAtencion()` en `src/lib/salud.ts` que acepta el tipo y todos los campos dinámicos. Reemplaza a `agregarAtencionMedica()`.

## Archivos a modificar / crear

1. **`src/types/index.ts`** — extender interfaz `AtencionMedica`
2. **`src/lib/salud.ts`** — mappers + insert + fetch
3. **`src/components/salud/AtencionMedicaModal.tsx`** — reescribir completo
4. **`src/pages/Salud/HistoriasClinicas.tsx`** — actualizar props del modal
5. **`src/pages/Salud/Index.tsx`** — agregar card "Registrar Atención"
6. **`supabase_migration_atenciones_multi_tipo.sql`** — script SQL (lo ejecuta el usuario)
