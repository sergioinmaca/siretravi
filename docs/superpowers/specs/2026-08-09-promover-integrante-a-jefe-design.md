# Promover integrante a Jefe de Familia — creación de núcleo familiar propio

**Fecha:** 2026-08-09
**Ámbito:** `src/components/refugiados/RegistroModal.tsx`

---

## 1. Contexto

Cuando un integrante pertenece a una familia existente y se edita su jerarquía a "Jefe de Familia", el sistema actualmente reutiliza su `familia_id` anterior. Esto provoca que nunca se cree una familia nueva para esa persona, impidiendo que:

- Aparezca su propia **ficha familiar** (no hay familia nueva que listar en el módulo de Familias).
- Se le puedan **asignar integrantes** a su núcleo familiar (no hay familia nueva en el dropdown de selección).

Además, el radio button de jerarquía no limpia los campos `familiaId` ni `parentesco` al alternar opciones, dejando el estado del formulario inconsistente.

---

## 2. Comportamiento deseado

Al editar un refugiado que **no es jefe** y cambiar su jerarquía a "Jefe de Familia":

1. El sistema **crea una familia nueva** con el nombre `"FAMILIA {Nombres} {Apellidos}"` (misma nomenclatura que un alta nueva).
2. El refugiado **abandona** su familia anterior (su `familia_id` apunta a la nueva).
3. Su `parentesco` se limpia automáticamente (un jefe no tiene parentesco).
4. La nueva familia aparece en el módulo Familias con su ficha familiar correspondiente.
5. La nueva familia aparece en el dropdown de selección para que otros integrantes puedan ser asignados a ella.

### 2.1 Reglas

| Regla | Descripción |
|---|---|
| Solo si cambia de miembro a jefe | Si la persona **ya era jefe** antes de la edición, se reutiliza su `familia_id` existente (comportamiento actual correcto, sin cambios). |
| Nombre de familia único por campamento | Si ya existe una familia con el mismo nombre `"FAMILIA {Nombres} {Apellidos}"` en el campamento, se reutiliza en vez de duplicar (comportamiento actual, sin cambios). |
| Familia huérfana se deja | Si la familia anterior queda sin miembros, permanece en la BD. Se elimina manualmente desde el módulo de Familias. |
| Parentesco se limpia | Al guardar con `es_jefe_familia = true`, el `parentesco` se fuerza a `undefined`. |

### 2.2 Escenario: Jefe existente se reedita como jefe

Si un jefe se edita (cambia nombre, cama, etc.) pero sigue siendo jefe, el sistema **reutiliza su `familia_id` actual** sin crear una nueva familia. Este comportamiento ya funciona correctamente y no se modifica.

### 2.3 Escenario: Jefe existente se degrada a integrante

Este escenario está fuera del alcance de este spec. Actualmente el sistema permite degradar un jefe a integrante seleccionando otra familia, pero la familia que lideraba queda sin jefe. Se abordará en un spec futuro si se requiere.

---

## 3. Implementación

### 3.1 Modificación: `src/components/refugiados/RegistroModal.tsx`

#### 3.1.1 Condición de reutilización de familia (línea ~307)

**Actualmente:**

```typescript
if (isEditing && refugiadoToEdit?.familia_id) {
  finalFamiliaId = refugiadoToEdit.familia_id;
}
```

**Cambio:** Agregar `&& refugiadoToEdit?.es_jefe_familia`:

```typescript
if (isEditing && refugiadoToEdit?.familia_id && refugiadoToEdit?.es_jefe_familia) {
  finalFamiliaId = refugiadoToEdit.familia_id;
}
```

Esto asegura que solo los que **ya eran jefes** conservan su familia. Un integrante promovido a jefe cae en el `else` y pasa por la creación de nueva familia.

#### 3.1.2 Limpiar `familiaId` y `parentesco` al seleccionar "Es Jefe de Familia" (línea ~845)

**Actualmente:**

```tsx
onChange={() => setFormData(prev => ({...prev, esJefeFamilia: true}))}
```

**Cambio:**

```tsx
onChange={() => setFormData(prev => ({...prev, esJefeFamilia: true, familiaId: '', parentesco: ''}))}
```

Esto mantiene el estado del formulario consistente: cuando alguien es jefe, no debería tener `familiaId` de otra familia ni `parentesco`.

#### 3.1.3 Limpiar `parentesco` al seleccionar "Pertenece a una familia" (línea ~849)

**Actualmente:**

```tsx
onChange={() => setFormData(prev => ({...prev, esJefeFamilia: false}))}
```

**Cambio:**

```tsx
onChange={() => setFormData(prev => ({...prev, esJefeFamilia: false, parentesco: ''}))}
```

Al cambiar a "miembro", el `parentesco` anterior (si venía de una edición donde era jefe) se limpia para que el usuario lo reingrese.

#### 3.1.4 Forzar `parentesco = undefined` en el payload si es jefe (línea ~382)

En la construcción del payload, donde se asigna `parentesco: formData.parentesco`, envolver con una condición:

```typescript
parentesco: formData.esJefeFamilia ? undefined : (formData.parentesco || undefined),
```

Esto actúa como red de seguridad: incluso si el estado del formulario quedara inconsistente, el payload siempre envía `parentesco` como `undefined` cuando el refugiado es jefe.

### 3.2 Archivos NO modificados

- `CampamentoContext.tsx`
- `src/types/index.ts`
- Base de datos (sin migraciones)
- `Familias.tsx`
- `DetalleFamiliaModal.tsx`
- Ningún otro archivo del módulo de familias o refugiados

---

## 4. Casos de prueba

| # | Caso | Esperado |
|---|---|---|
| 1 | Integrante (miembro de Fam. A) se edita a Jefe de Familia → guardar | Se crea "FAMILIA {Nombre}" nueva. El refugiado aparece como jefe de su propia familia. Su ficha familiar es visible en Familias. Otros pueden asignarse a su familia. |
| 2 | Jefe existente se reedita (cambia cama, mantiene jerarquía) → guardar | Conserva su `familia_id`. No se crea familia nueva. No se duplica. |
| 3 | Integrante se edita a jefe, pero ya existe "FAMILIA {Nombre}" en el campamento | Reutiliza la familia existente en vez de duplicar (comportamiento actual). |
| 4 | Integrante se edita a jefe → verificar parentesco | El `parentesco` del registro queda `null`/vacío en la BD. |
| 5 | Alternar radio "Jefe" → "Integrante" → "Jefe" | `familiaId` y `parentesco` se limpian en cada alternancia al modo jefe. |
| 6 | La familia anterior del integrante promovido queda sin él | La familia anterior sigue existiendo (con o sin otros miembros). No se elimina automáticamente. |

---

## 5. Archivos afectados

| Archivo | Tipo | Cambio |
|---|---|---|
| `src/components/refugiados/RegistroModal.tsx` | Modificado | Cuatro cambios puntuales (secciones 3.1.1 a 3.1.4) |
