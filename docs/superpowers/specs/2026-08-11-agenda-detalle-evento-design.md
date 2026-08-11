# Módulo Agenda — Modal de Detalle de Evento, Edición Inline y Campo Responsable

## 1. Resumen

Ajustes al módulo Agenda existente:

- **Modal de detalle de evento** al hacer clic sobre una actividad en vista mensual y semanal, mostrando la información completa del evento. Actualmente, en vista mensual, el clic sobre el evento abre el modal de crear evento (comportamiento a eliminar); en vista semanal el clic no hace nada.
- El modal de detalle tiene **borde del color de la categoría** del evento.
- El modal permite **modificar el evento** (modo edición con "Eliminar", "Cancelar" y "Guardar Cambios").
- Nuevo campo **"Responsable"** autorellenado con el nombre y apellido del usuario logueado, editable y persistido en la base de datos.
- Reordenamiento de campos en **todos** los formularios de eventos: `Título → Categoría → Responsable → Tipo → Fecha → Horas → Descripción`.

Se conserva el `EditorEventosModal` (botón "Editar") tal como está.

## 2. Modelo de Datos

### Modificación en tabla `eventos` (nueva columna)

```sql
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS responsable TEXT;
```

- `responsable` nullable — texto libre, sin FK a `usuarios` (se guarda el valor capturado al momento, aunque el usuario cambie de nombre después).
- No cambia RLS (se mantiene la política existente).

### Tipo `Evento` actualizado

```ts
export interface Evento {
  id: string;
  id_campamento: string;
  titulo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  hora_inicio: string;
  hora_fin?: string;
  tipo: 'permanente' | 'unico';
  categoria_id?: string;
  responsable?: string;   // nuevo
  created_at?: string;
}
```

## 3. Permisos

- **Ver detalle:** cualquier usuario con acceso "Ver" a Agenda (abre el modal al hacer clic en un evento).
- **Editar/Eliminar desde el detalle:** solo usuarios con permiso "Crear" en Agenda (`tienePermisoCrear`). Sin ese permiso, el modal de detalle es solo lectura (no se muestra el botón "Editar").
- No se crean módulos/acciones nuevos — se reutiliza el permiso Agenda.Crear.

## 4. Nuevo Componente: `DetalleEventoModal.tsx`

Ubicación: `src/components/agenda/DetalleEventoModal.tsx`.

### Props

```ts
interface DetalleEventoModalProps {
  isOpen: boolean;
  onClose: () => void;
  evento: EventoOcurrencia | null;
  categorias: CategoriaEvento[];
  campamentoNombre?: string;
  tienePermisoEditar?: boolean;  // se pasa tienePermisoCrear
  onEventoUpdated: () => void;
}
```

### Estado interno

- `modo: 'ver' | 'editar'`
- Campos del formulario: `titulo`, `categoriaId`, `responsable`, `tipo`, `fecha`, `horaInicio`, `horaFin`, `descripcion`
- `error`, `saving`, `deleting`
- Al abrir: se pueblan los campos desde el `evento` recibido y `modo = 'ver'`.

### Borde del color de categoría

- La tarjeta del modal usa `border-4` con `style={{ borderColor: colorDeCategoria }}`.
- `colorDeCategoria` se obtiene con la misma lógica existente: buscar en `categorias` por `categoria_id`; fallback `#3B82F6` (azul) para únicos y `#A855F7` (violeta) para permanentes sin categoría.
- Al cambiar la categoría en modo edición, el borde se actualiza en vivo.

### Modo ver (lectura)

```
┌────────────────────────────────────────────┐
│  [● Categoría]   Responsable: Nombre Ap.   │  ← chip de categoría + responsable
│                                            │
│  TÍTULO DEL EVENTO                         │
│                                            │
│  Tipo: Único           Fecha: 14/07/2026   │
│  Horario: 8:00 AM - 9:00 AM               │
│                                            │
│  Descripción completa del evento...        │
│                                            │
│                                  [✏ Editar]│  ← solo si tienePermisoEditar
└────────────────────────────────────────────┘
```

- Header: título del modal ("Detalle del Evento") + nombre del campamento + botón cerrar (✕).
- Contenido: chip de categoría (punto de color + nombre), campo Responsable, título destacado, grid de Tipo/Fecha/Horario (formato 12h) y descripción completa.
- Footer: botón "Editar" (icono `Edit`) a la derecha, solo si `tienePermisoEditar`.

### Modo editar

- Formulario con el nuevo orden de campos (sección 6).
- Footer:
  - **"Eliminar"** (izquierda, rojo, icono `Trash2`): `confirm('¿Estás seguro de eliminar este evento?')` → `eliminarEvento(id)` → cierra el modal → `onEventoUpdated()`.
  - **"Cancelar"**: vuelve a modo ver sin guardar (descartando cambios).
  - **"Guardar Cambios"** (derecha, rojo, icono `Save`): valida y guarda → vuelve a modo ver con los datos actualizados → `onEventoUpdated()`.
- Validaciones: título obligatorio; si `hora_fin` tiene valor debe ser posterior a `hora_inicio`.
- Estados `saving`/`deleting` deshabilitan los botones correspondientes.
- Errores en banner rojo inline (mismo patrón que `CrearEventoModal`).

### Edición de eventos permanentes

- Un clic sobre una ocurrencia edita el evento base por su `id` (aplica a toda la serie), igual que el comportamiento actual del `EditorEventosModal`.

## 5. Clic sobre Eventos en Calendarios

### `CalendarioMensual.tsx` y `CalendarioSemanal.tsx`

- Nueva prop: `onEventoClick: (evento: EventoOcurrencia) => void`.
- Cada bloque de evento agrega `onClick={(e) => { e.stopPropagation(); onEventoClick(evento); }}` y `cursor-pointer`.
- Se mantienen el tooltip hover y el color de categoría existentes.
- **Vista mensual:** el `stopPropagation` evita que el clic en el evento burbujee a la celda del día y abra `CrearEventoModal`.
- **Vista semanal:** los eventos ya son `pointer-events-auto`; ahora el clic abre el detalle (antes no hacía nada).
- El clic en una celda vacía / encabezado de día sigue abriendo `CrearEventoModal` como hoy.

### `Agenda.tsx`

- Nuevo estado `eventoSeleccionado: EventoOcurrencia | null`.
- Handler `handleEventoClick(evento)` → `setEventoSeleccionado(evento)`.
- Se pasa `onEventoClick` a ambos calendarios.
- Se renderiza `<DetalleEventoModal>` con:
  - `isOpen={!!eventoSeleccionado}`, `evento={eventoSeleccionado}`
  - `categorias`, `campamentoId`, `campamentoNombre`
  - `tienePermisoEditar={tienePermisoCrear}`
  - `onEventoUpdated={recargarEventos}`
- Al cerrar el modal se limpia `eventoSeleccionado`.

## 6. Orden de Campos en los Formularios

Nuevo orden en **los tres** formularios de eventos:

```
Título → Categoría → Responsable → Tipo → Fecha → Horas → Descripción
```

### `CrearEventoModal.tsx`

- Usa `useAuth()` para obtener `usuarioActual`.
- Al abrir el modal: `setResponsable(usuarioActual ? `${usuarioActual.nombres} ${usuarioActual.apellidos}` : '')`.
- Se mueve el `SelectorCategoria` debajo del título.
- Nuevo input "Responsable" (texto, mayúsculas, editable) debajo de la categoría.
- `responsable` se incluye en el payload de `onSave`.

### `EditorEventosModal.tsx`

- Nuevo estado `formResponsable`, poblado desde `selectedEvento.responsable` al seleccionar un evento.
- Se reordenan los campos al nuevo orden.
- `responsable` se incluye en la llamada a `actualizarEvento`.

### `DetalleEventoModal.tsx` (modo editar)

- Mismo orden y campos que los anteriores.

## 7. Capa de Datos: `src/lib/eventos.ts`

- `crearEvento`: el tipo del parámetro agrega `responsable?: string`; se inserta en el payload de Supabase (`responsable: data.responsable || null`).
- `actualizarEvento`: el tipo del parámetro agrega `responsable?: string`; se agrega al payload dinámico si viene definido.
- `fetchEventos` usa `select('*')`, por lo que devuelve `responsable` automáticamente (sin cambios).

## 8. Edge Cases y Validaciones

| Caso | Comportamiento |
|---|---|
| Evento sin categoría | Borde del modal con color legacy (azul único / violeta permanente) |
| Evento sin responsable | Campo "Responsable" vacío; en modo ver se omite la fila |
| Usuario sin permiso "Crear" | Modal de detalle en solo lectura, sin botón "Editar" |
| Clic en evento en vista mensual | Abre detalle; NO abre crear evento (stopPropagation) |
| Clic en evento en vista semanal | Abre detalle (antes no hacía nada) |
| Clic en celda vacía / día | Abre `CrearEventoModal` (sin cambios) |
| Editar evento permanente | Aplica a toda la serie (mismo `id`) |
| `hora_fin` vacío en edición | Se guarda `addOneHour(hora_inicio)` (patrón actual) |
| Eliminar evento | Confirmación → `eliminarEvento(id)` → cierra modal → refetch |
| Cambiar categoría en edición | Borde del modal se actualiza en vivo |

## 9. Archivos a Crear/Modificar

| Archivo | Cambio |
|---|---|
| `supabase_migration_responsable_eventos.sql` | Nueva migración: `ALTER TABLE eventos ADD COLUMN IF NOT EXISTS responsable TEXT;` |
| `src/types/index.ts` | Agregar `responsable?: string` a `Evento` |
| `src/lib/eventos.ts` | `crearEvento` y `actualizarEvento` aceptan e insertan/actualizan `responsable` |
| `src/components/agenda/DetalleEventoModal.tsx` | Nuevo — modal de detalle con modo ver/editar, borde de color de categoría |
| `src/components/agenda/CalendarioMensual.tsx` | Prop `onEventoClick` + onClick con stopPropagation en eventos |
| `src/components/agenda/CalendarioSemanal.tsx` | Prop `onEventoClick` + onClick con stopPropagation en eventos |
| `src/pages/Agenda.tsx` | Estado `eventoSeleccionado`, handler y render de `DetalleEventoModal` |
| `src/components/agenda/CrearEventoModal.tsx` | Reorden de campos + campo Responsable autorellenado (useAuth) |
| `src/components/agenda/EditorEventosModal.tsx` | Reorden de campos + estado `formResponsable` |

## 10. Verificación

- `npm run build` (tsc + vite) — sin errores de tipos.
- `npm run lint` (oxlint) — sin advertencias.
- Prueba manual en ambas vistas:
  1. Clic en evento → abre detalle con borde del color de categoría.
  2. Clic en día vacío → sigue abriendo crear evento.
  3. Editar desde el detalle → Guardar Cambios persiste y recarga.
  4. Responsable autorellenado en creación con el usuario logueado.
  5. Editar evento permanente → afecta toda la serie.
