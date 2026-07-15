# Contexto: Análisis de duplicación de familias y plan de corrección

**Fecha:** 2026-07-15
**Proyecto:** SIRETRAVI (React + TypeScript + Supabase)
**Estado:** Plan aprobado, pendiente de implementación

---

## 1. Solicitud original del usuario

Revisar si existe posibilidad de duplicación de familia a través de:
- Edición de integrante (cualquier modificación en el integrante)
- Ediciones en jefe de familia

Posteriormente el usuario pidió desarrollar las correcciones e incluir un bloqueo del botón de guardado de **5 segundos** tras el primer click para evitar el segundo click.

---

## 2. Hallazgos del análisis

**Conclusión: SÍ hay posibilidad real de duplicación de familias.** 3 vías concretas:

### 2.1 Jefe "huérfano" + cualquier edición (el más grave)
- Ubicación: `src/components/refugiados/RegistroModal.tsx:162-173`
- Si se edita un integrante con `es_jefe_familia = true` pero `familia_id = NULL` (p. ej. su familia fue eliminada desde la página Familias → FK `ON DELETE SET NULL`), **cualquier modificación** (teléfono, talla, cama, etc.) entra al `else` y crea una familia nueva `FAMILIA {NOMBRES} {APELLIDOS}`. Cada guardado en ese estado = una familia más.

### 2.2 Fallo silencioso del update → familias fantasma acumuladas
- Secuencia en `handleSubmit`: primero `agregarFamilia` (INSERT en BD, `RegistroModal.tsx:167`), después `actualizarRefugiado` (línea 219).
- Si el update falla, `actualizarRefugiado` solo hace `console.error` y retorna (`src/context/CampamentoContext.tsx:627-630`), pero el modal igual muestra "¡modificado exitosamente!" (línea 225, no verifica errores).
- Resultado: familia creada y huérfana; el refugiado sigue sin `familia_id`, y la próxima edición crea **otra** familia. Se acumulan duplicados.

### 2.3 Doble submit (race condition)
- `handleSubmit` no tiene guard `if (isSubmitting) return;` al inicio. El botón se deshabilita vía estado React (asíncrono), así que doble click rápido o doble Enter en registro de un jefe nuevo puede ejecutar el flujo dos veces → 2 familias + 2 refugiados.

### Agravantes
- No hay constraint `UNIQUE` en BD sobre `familias(campamento_id, nombre)` (`supabase_schema.sql:34-39`) ni lógica get-or-create en `agregarFamilia` (`CampamentoContext.tsx:381-403`).
- Bonus relacionado: al promover un miembro a jefe se reutiliza su familia pero **no se degrada al jefe anterior** → familias con 2 jefes (no duplica familia, pero corrompe datos).

---

## 3. Arquitectura relevante (referencia)

| Archivo | Rol |
|---|---|
| `supabase_schema.sql` (l.34-39, 42-61) | Tabla `familias` (PK UUID, sin UNIQUE en nombre) y `refugiados` (`familia_id` FK ON DELETE SET NULL, `es_jefe_familia` boolean) |
| `src/context/CampamentoContext.tsx` | `agregarFamilia` (l.381-403, INSERT directo sin get-or-create), `eliminarFamilia` (l.406-414), `agregarRefugiado` (l.417-566), `actualizarRefugiado` (l.579-633, falla en silencio), realtime subscriptions (l.194-218) |
| `src/components/refugiados/RegistroModal.tsx` | Modal crear/editar integrante. `handleSubmit` (l.149-230) con lógica crítica de creación de familia (l.160-174). Botón guardar con `disabled={!campamentoSeleccionado \|\| isSubmitting}` (l.709). Modal se cierra a los 1500ms tras éxito (l.226-229) |
| `src/pages/Refugiados.tsx` | Entry point a edición: `handleModificar` (l.110-113), `handleModalClose` con `refetch()` (l.115-119) |
| `src/pages/Familias.tsx` | Las familias solo se crean automáticamente al registrar jefe; `eliminarFamilia` (l.51-56) |

Lógica crítica actual (`RegistroModal.tsx:160-174`):
```typescript
let finalFamiliaId = formData.familiaId;
if (formData.esJefeFamilia) {
  if (isEditing && refugiadoToEdit?.familia_id) {
    finalFamiliaId = refugiadoToEdit.familia_id;   // reutiliza
  } else {
    const nombreFamilia = `FAMILIA ${formData.nombres} ${formData.apellidos}`;
    const familiaCreada = await agregarFamilia({ id: '', campamento_id: campamentoSeleccionado.id, nombre: nombreFamilia });
    finalFamiliaId = familiaCreada?.id || '';       // crea SIEMPRE (sin verificar existencia)
  }
}
```

---

## 4. Plan de corrección aprobado

### Punto 1: Bloqueo del botón por 5s tras el primer click — `RegistroModal.tsx`
- Guard al inicio de `handleSubmit`: `if (isSubmitting) return;`
- Poner `setIsSubmitting(true)` **antes** del `window.confirm` de edición (hoy está después, l.158), reactivándolo si el usuario cancela.
- Tras completar el guardado, mantener bloqueado con `setTimeout` de **5000ms** antes de `setIsSubmitting(false)`. El modal se cierra a los 1500ms; el bloqueo de 5s cubre el ciclo aunque se reabra rápido. Limpiar el timer en el `useEffect` de apertura para no dejar el botón muerto en un uso nuevo legítimo.
- El botón ya usa `disabled={... || isSubmitting}` (l.709), no requiere cambio.

### Punto 2: Get-or-create de familia — `RegistroModal.tsx:165-173`
Antes de `agregarFamilia`, buscar en `familias` (del contexto) una familia del mismo campamento con nombre igual a `FAMILIA {nombres} {apellidos}`; si existe, reutilizar su `id`. Solo crear si no existe.

### Punto 3: Manejo de errores + rollback
- `CampamentoContext.tsx`: cambiar `agregarRefugiado` y `actualizarRefugiado` para retornar `Promise<boolean>` (true = éxito).
- `RegistroModal.tsx`:
  - Si `agregarFamilia` retorna `null` → abortar, mostrar error, no guardar refugiado.
  - Si el guardado del refugiado falla **y** se creó familia nueva en este submit → `eliminarFamilia(familiaCreada.id)` (rollback) y mostrar error.
  - `showSuccess` solo cuando el guardado retorne `true`; añadir banner rojo de error (reutilizando estilo del banner de alerta existente).

### Punto 4: (Defensa BD) Migración SQL nueva
Archivo `supabase_migration_familias_unique.sql`:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_familias_campamento_nombre ON familias(campamento_id, nombre);
```
Nota: si ya existen duplicados en producción el índice fallará; incluir query previa de detección de duplicados para revisión antes de aplicar.

### Punto 5: Un solo jefe por familia
Al guardar un integrante como jefe de una familia existente, degradar (`es_jefe_familia = false`) a cualquier otro jefe de esa familia vía update en Supabase + estado local.

### Verificación
`npm run build` / lint del proyecto tras los cambios.

---

## 5. Estado de la conversación

1. Usuario pidió revisar posibilidad de duplicación → análisis completado (sección 2).
2. Usuario pidió desarrollar correcciones + bloqueo de botón 5s → plan detallado presentado (sección 4).
3. Usuario pidió guardar el contexto en carpeta `contexto/` → este archivo.
4. **Pendiente:** implementar los puntos 1-5 del plan (el usuario aún no confirmó si incluir el punto 4 de migración BD, aunque pidió "desarrolla las correcciones" de forma general).
