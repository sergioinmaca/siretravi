# Spec: Rediseño del Módulo de Usuarios

**Fecha:** 2026-08-03
**Estado:** Diseño aprobado

---

## 1. Resumen

Rediseñar el módulo de Usuarios con tres cambios principales:

1. **Organización por acordeones colapsables**: una pestaña "Usuarios Master" fija más una pestaña por cada campamento.
2. **Buscador global**: filtra por nickname, nombre y apellido a través de todas las pestañas.
3. **Flujo completo de modificación**: permite editar nickname, nombre, apellido, contraseña y campamento hogar desde el mismo modal.

**Enfoque elegido:** Enfoque A — agregar columna `campamento_hogar` a la tabla `usuarios`.

---

## 2. Cambios en Base de Datos

### 2.1 Migración

```sql
ALTER TABLE public.usuarios 
ADD COLUMN campamento_hogar UUID REFERENCES public.campamentos(id) ON DELETE SET NULL;
```

- **Nullable**: los usuarios master no tienen campamento hogar (`null`).
- **ON DELETE SET NULL**: si se elimina un campamento, los usuarios asociados no se borran, solo pierden la referencia.

### 2.2 Tipo TypeScript actualizado

```ts
// src/types/index.ts
export interface Usuario {
  id: string;
  nickname: string;
  nombres: string;
  apellidos: string;
  clave: string;
  es_master: boolean;
  activo: boolean;
  campamento_hogar?: string | null; // NUEVO
}
```

### 2.3 Agrupación lógica

| Grupo | Criterio |
|-------|----------|
| Usuarios Master | `es_master === true` |
| Campamento X | `campamento_hogar === X.id && !es_master` |

---

## 3. Layout General

```
┌──────────────────────────────────────────────┐
│  Gestión de Usuarios                         │
│  Administra los operadores del sistema...    │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ 🔍 Buscar por nickname, nombre...    │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  ▼ Usuarios Master (3)                       │
│  │ ┌──────────────────────────────────┐      │
│  │ │ Tabla de usuarios master...      │      │
│  │ │ [+ Nuevo Usuario Master]         │      │
│  │ └──────────────────────────────────┘      │
│                                              │
│  ▼ Campamento Ávila (5)                      │
│  │ ┌──────────────────────────────────┐      │
│  │ │ Tabla de usuarios del camp...    │      │
│  │ │ [+ Nuevo Usuario]                │      │
│  │ └──────────────────────────────────┘      │
│                                              │
│  ▶ Campamento La Guaira (2)                  │
│  ▶ Campamento Mariperez (0)                  │
└──────────────────────────────────────────────┘
```

### 3.1 Comportamiento de acordeones

- **Múltiples pueden estar abiertos simultáneamente.** Cada uno se expande/colapsa de forma independiente.
- `(N)` indica cantidad de usuarios en ese grupo.
- Flecha/chevron rota al expandir/colapsar.
- Si un campamento tiene 0 usuarios, se muestra "(0)" y la tabla vacía con el mensaje: "Sin usuarios en este campamento".

### 3.2 Buscador global

- Input con ícono de lupa en la parte superior del módulo, arriba de los acordeones.
- Debounce de 300ms.
- Filtra en memoria (todos los usuarios ya están cargados en el estado) por `nickname`, `nombres`, `apellidos` (case-insensitive).
- Al escribir:
  1. Muestra solo las filas que coinciden con la búsqueda dentro de cada tabla.
  2. Si un acordeón no tiene coincidencias, muestra "Sin resultados para '[término]' en [nombre]".
- Al borrar el texto, vuelve al estado anterior (sin filtro aplicado).
- Resultados resaltados visualmente con CSS (negrita en el texto coincidente).

### 3.3 Pestaña "Usuarios Master"

- Siempre visible, primera en la lista, colapsada por defecto.
- Mismo flujo de creación y edición que cualquier otro usuario, incluyendo selección de permisos.
- Al crear desde esta pestaña, el toggle "Usuario Master" del modal viene marcado por defecto.

---

## 4. Modal de Creación/Edición

### 4.1 Estructura del modal

Orden de las secciones (de arriba hacia abajo):

1. **Datos del Usuario**
   - Nickname (obligatorio, min 3 caracteres, lowercase automático)
   - Contraseña: obligatoria al crear (min 6 caracteres), opcional al editar (placeholder: "Dejar vacío para mantener la actual")
   - Nombres (obligatorio)
   - Apellidos (obligatorio)
   - Toggle "Usuario Master"

2. **Campamento Hogar** (dropdown con lista de campamentos activos)
   - Visible solo si el toggle "Usuario Master" está desmarcado.
   - Obligatorio cuando está visible.
   - Al crear desde un acordeón de campamento, viene pre-seleccionado con ese campamento.

3. **Permisos por Módulo** (sin cambios respecto al modal actual)

4. **Footer**: Cancelar / Guardar

### 4.2 Reglas del toggle "Usuario Master"

- Aparece siempre, tanto al crear como al editar.
- Si se marca:
  - `es_master = true`
  - `campamento_hogar = null` (forzado, se oculta el dropdown de campamento).
  - Los permisos configurados se guardan igual en DB, pero en runtime el sistema ya los ignora para usuarios master (comportamiento existente en `AuthContext`).
- Si se desmarca:
  - `es_master = false`
  - Aparece el dropdown de campamento hogar (obligatorio).

### 4.3 Edición de usuario existente

- Todos los campos son editables (nickname, nombres, apellidos, toggle master, campamento hogar).
- **Cambio de contraseña**: campo opcional. Si se deja vacío, no se modifica. Si se ingresa un valor, se actualiza en Supabase Auth (`supabase.auth.admin.updateUserById`).
- Se puede cambiar el campamento hogar de un usuario (moverlo a otro campamento).
- Se puede promover/demover un usuario a/de master (toggle).

---

## 5. Arquitectura de Componentes

```
src/
├── pages/
│   └── Usuarios.tsx          ← refactorizado (acordeones + buscador)
├── components/usuarios/
│   ├── UsuarioModal.tsx      ← refactorizado (nuevos campos al inicio)
│   ├── BuscadorUsuarios.tsx  ← NUEVO (input de búsqueda global)
│   └── AcordeonUsuarios.tsx  ← NUEVO (un acordeón colapsable con tabla)
```

### 5.1 `BuscadorUsuarios`

| Prop | Tipo | Descripción |
|------|------|-------------|
| `onChange` | `(termino: string) => void` | Callback con debounce de 300ms |
| `placeholder` | `string` | "Buscar por nickname, nombre o apellido..." |

### 5.2 `AcordeonUsuarios`

| Prop | Tipo | Descripción |
|------|------|-------------|
| `titulo` | `string` | "Usuarios Master" o "Campamento Ávila" |
| `usuarios` | `Usuario[]` | Usuarios de este grupo (ya agrupados por el padre) |
| `esMaster` | `boolean` | Si es la pestaña master |
| `campamentoId` | `string \| null` | ID del campamento (null para master) |
| `onNuevoUsuario` | `(campamentoId: string \| null) => void` | Abre modal con campamento pre-seleccionado |
| `onModificar` | `(usuario: Usuario) => void` | Abre modal en modo edición |
| `onEliminar` | `(id: string) => void` | Eliminar usuario |
| `terminoBusqueda` | `string` | Término actual del buscador |
| `expandido` | `boolean` | Estado de expansión (controlado por el padre) |
| `onToggle` | `() => void` | Alternar expandir/colapsar |

### 5.3 Flujo de datos

```
Usuarios.tsx (estado central)
├── carga usuarios + campamentos + permisos al montar
├── agrupa usuarios:
│   ├── grupoMaster = usuarios.filter(u => u.es_master)
│   └── gruposPorCamp = campamentos.map(camp => ({
│         camp,
│         usuarios: usuarios.filter(u =>
│           u.campamento_hogar === camp.id && !u.es_master
│         )
│       }))
├── BuscadorUsuarios → terminoBusqueda
├── AcordeonUsuarios × (1 master + N campamentos)
│   └── cada uno recibe su subconjunto + terminoBusqueda
└── UsuarioModal (compartido, único)
```

- La búsqueda es **en memoria**, sin llamadas adicionales a Supabase.
- Cada `AcordeonUsuarios` aplica el filtro localmente sobre su array.
- Resultados resaltados con negrita en el texto coincidente (manejo CSS, sin manipular DOM real).

---

## 6. Estados y Manejo de Errores

### 6.1 Estado de carga inicial

- Skeleton loader: 3-4 acordeones colapsados con pulso animado gris.
- Sin texto visible.

### 6.2 Estado de error

- Mensaje con ícono de error y botón "Reintentar".
- No se oculta el layout ni la barra de búsqueda.

### 6.3 Estado vacío total (0 usuarios)

- Acordeones colapsados por defecto.
- Mensaje central: "No hay usuarios registrados. Expande un campamento y crea el primero."

### 6.4 Validaciones del modal

| Campo | Reglas |
|-------|--------|
| Nickname | Obligatorio, min 3 caracteres. Lowercase automático. No duplicado (validación contra BD). |
| Contraseña (crear) | Obligatoria, min 6 caracteres. |
| Contraseña (editar) | Opcional. Si se ingresa, min 6 caracteres. Si vacío, no se modifica. |
| Nombres | Obligatorio. Uppercase automático. |
| Apellidos | Obligatorio. Uppercase automático. |
| Campamento hogar | Obligatorio si no es master. |

### 6.5 Errores de Supabase

- Error al crear/editar usuario → mensaje de error en el modal (no se cierra).
- Error al cambiar contraseña en Supabase Auth → mensaje específico junto al campo de contraseña.
- Nickname duplicado → error inline: "Este nickname ya está en uso".
- Éxito → toast verde breve (1s), se cierra el modal, se refrescan datos.

### 6.6 Eliminación

- No se puede eliminar al usuario actual (el que está logueado). Alerta: "No puedes eliminar tu propio usuario".
- Usuarios master sí se pueden eliminar (a diferencia del comportamiento anterior que lo bloqueaba).
- Confirmación antes de eliminar: "¿Estás seguro de que deseas eliminar este usuario?".
- Al eliminar el último usuario de un campamento, la tabla queda vacía con mensaje "Sin usuarios en este campamento". El acordeón permanece abierto.

---

## 7. Testing (Pruebas Manuales)

1. **Migración DB**: Verificar que `campamento_hogar` acepta UUID y null.
2. **Acordeones**: Expandir/colapsar múltiples; contador `(N)` correcto; "Usuarios Master" siempre visible al inicio.
3. **Crear usuario desde campamento**: `campamento_hogar` pre-llenado; toggle master desmarcado por defecto.
4. **Crear usuario desde Master**: toggle master marcado; dropdown de campamento oculto.
5. **Editar usuario**: Todos los campos editables; contraseña vacía = no cambia, nueva = se actualiza; toggle master/campamento intercambiable.
6. **Buscador global**: Coincidencias parciales por nickname, nombre, apellido (case-insensitive); "Sin resultados" cuando no hay coincidencias; borrar término restaura vista.
7. **Eliminar**: El usuario logueado no se puede eliminar; confirmación requerida; contador se actualiza.
8. **Permisos**: El modal de permisos funciona igual que antes (sin regresiones).

---

## 8. Riesgos y Consideraciones

- **Migración de usuarios existentes**: los usuarios actuales quedarán con `campamento_hogar = null`. Deberán editarse manualmente para asignarles campamento hogar (o ejecutarse un script de migración si se desea asignación masiva).
- **Cambio de contraseña en Supabase Auth**: requiere usar `supabase.auth.admin.updateUserById`, lo cual necesita la `service_role key`. Evaluar si se usa un endpoint edge function o se maneja desde el frontend con un cliente secundario. De no ser viable, implementar un endpoint en Supabase Edge Functions.
- **Regresión en permisos**: la sección de permisos del modal no debe romperse. Revisar que las funciones `toggleModulo`, `toggleAccion`, `setCampamentosMode` y `toggleCampamento` sigan funcionando al reorganizar el orden de los campos en el modal.
