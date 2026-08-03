# Spec: Permisos Granulares por Reporte

**Fecha:** 2026-08-03
**Estado:** Diseño aprobado

---

## 1. Resumen

Agregar control granular de permisos por reporte individual dentro del módulo "Reportes". Actualmente el permiso `'Ver'` da acceso a los 9 reportes. Con este cambio, se podrá seleccionar qué reportes específicos puede ver cada usuario.

**Enfoque:** Complementar el sistema actual — mantener acciones `'Ver'`/`'Exportar'` y agregar columna `reportes TEXT[]` a la tabla `permisos`.

---

## 2. Cambios en Base de Datos

### 2.1 Migración

```sql
ALTER TABLE public.permisos
ADD COLUMN IF NOT EXISTS reportes TEXT[];
```

- `NULL` = acceso a todos los reportes (default, no rompe permisos existentes)
- Array con claves = acceso solo a esos reportes

### 2.2 Tipo TypeScript

```ts
// src/types/index.ts
export interface Permiso {
  id: string;
  usuario_id: string;
  modulo_id: string;
  acciones: string[];
  campamentos: string[] | null;
  reportes: string[] | null;  // NUEVO
}
```

### 2.3 Claves de reportes (fijas)

| Clave | Reporte |
|-------|---------|
| `demografico` | Reporte General Demográfico |
| `nna` | Niños, Niñas y Adolescentes |
| `discapacitados` | Discapacitados |
| `mascotas` | Mascotas |
| `historias_clinicas` | Historias Clínicas |
| `integrantes` | Exportar Integrantes |
| `tenencia` | Tenencia de Vivienda |
| `estatus` | Situación de Estatus |
| `data_unica` | Data Única de Campamento |

---

## 3. UI en UsuarioModal

Cuando el módulo "Reportes" está marcado, debajo de las acciones aparece la lista de reportes:

```
☑ Reportes
  Acciones: ☑ Ver ☑ Exportar

  📊 Reportes permitidos:
  ┌─────────────────────────────────┐
  │ ☑ Seleccionar todos             │
  │ ─────────────────────────────── │
  │ ☑ Reporte General Demográfico   │
  │ ☑ Niños, Niñas y Adolescentes   │
  │ ☑ Discapacitados                │
  │ ☑ Mascotas                      │
  │ ☑ Historias Clínicas            │
  │ ☑ Exportar Integrantes          │
  │ ☑ Tenencia de Vivienda          │
  │ ☐ Situación de Estatus          │
  │ ☐ Data Única de Campamento      │
  └─────────────────────────────────┘

  ○ Todos los campamentos
  ○ Campamentos específicos
```

**Reglas del "Seleccionar todos":**
- Al marcar → marca todos los individuales
- Al desmarcar → desmarca todos
- Al desmarcar uno individual → "Seleccionar todos" se desmarca solo
- Al marcar todos uno por uno → "Seleccionar todos" se marca solo

**Lógica de guardado:**
- Si todos marcados → `reportes: null`
- Si algunos marcados → `reportes: ['clave1', 'clave2', ...]`

---

## 4. Cambios en AuthContext

Nueva función:

```ts
tienePermisoReporte(reporteClave: string, campamentoId: string): boolean
```

Lógica:
1. Si `usuario.es_master` → `true`
2. Busca permiso del módulo "Reportes" para el usuario
3. Si no hay permiso → `false`
4. Si `permiso.reportes === null` → `true`
5. Si `reporteClave` está en `permiso.reportes` → `true`
6. Caso contrario → `false`

---

## 5. Cambios en Reportes.tsx

Cada una de las 9 cards se envuelve en una condición:

| Card | Clave | Condición |
|------|-------|-----------|
| 1. General Demográfico | `demografico` | `tieneAcceso && tienePermisoReporte('demografico', campId)` |
| 2. Niños, Niñas y Adolescentes | `nna` | `tieneAcceso && tienePermisoReporte('nna', campId)` |
| 3. Discapacitados | `discapacitados` | `tieneAcceso && tienePermisoReporte('discapacitados', campId)` |
| 4. Mascotas | `mascotas` | `tieneAcceso && tienePermisoReporte('mascotas', campId)` |
| 5. Historias Clínicas | `historias_clinicas` | `tieneAcceso && tienePermisoReporte('historias_clinicas', campId)` |
| 6. Exportar Integrantes | `integrantes` | `puedeExportar && tienePermisoReporte('integrantes', campId)` |
| 7. Tenencia de Vivienda | `tenencia` | `tieneAcceso && tienePermisoReporte('tenencia', campId)` |
| 8. Situación de Estatus | `estatus` | `tieneAcceso && tienePermisoReporte('estatus', campId)` |
| 9. Data Única | `data_unica` | `tieneAcceso && tienePermisoReporte('data_unica', campId)` |

Si ninguna card es visible → mensaje: "No tienes acceso a ningún reporte en este campamento".

---

## 6. Estados y Errores

| Estado | Comportamiento |
|--------|---------------|
| Módulo "Reportes" desmarcado en modal | Checkboxes de reportes no visibles. Al guardar se elimina el permiso de Reportes si existía. |
| Módulo marcado, sin reportes | `reportes: null` (todos). Checkboxes todos marcados por defecto. |
| Migración pendiente | Permisos existentes tienen `reportes: null` → sin regresión. |
| Usuario sin 'Ver' en Reportes | Ya existe: mensaje "Acceso Denegado" |
| Usuario con 'Ver' pero 0 reportes | Mensaje: "No tienes acceso a ningún reporte en este campamento" |
| Error al guardar | Error inline en el modal, mismo manejo actual |

---

## 7. Plan de Implementación

1. Crear migración `00007_reportes_permisos.sql`
2. Actualizar tipo `Permiso` en `src/types/index.ts`
3. Agregar array de claves de reportes (`REPORTES_DISPONIBLES`) como constante
4. Modificar `UsuarioModal.tsx` — nueva sub-sección de reportes dentro del módulo "Reportes"
5. Agregar `tienePermisoReporte` en `AuthContext.tsx`
6. Envolver cada card de `Reportes.tsx` con la condición de permiso granular

---

## 8. Testing

1. Migración DB: columna `reportes` acepta `TEXT[]` y `NULL`.
2. Crear usuario con 3 reportes → verificar en DB que `permisos.reportes` tiene 3 claves.
3. Editar usuario → checkboxes reflejan lo guardado.
4. "Seleccionar todos" → sincronización con individuales.
5. Login con usuario limitado → solo aparecen sus reportes asignados.
6. Usuarios existentes sin `reportes` → siguen viendo los 9 reportes.
