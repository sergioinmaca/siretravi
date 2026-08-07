# Spec: Reestructuración del módulo Salud — Historial, Registro y Paginación

**Fecha:** 2026-08-06
**Módulo:** Salud

## 1. Propósito

Reorganizar la experiencia del módulo Salud:
- Mover el registro de atenciones del dashboard a un botón en la tabla de atenciones.
- Reemplazar el historial inline por un modal con paginación interna y navegación a detalle.
- Unificar la paginación de tablas con el estilo del módulo Refugiados.

## 2. Cambios en Salud/Index.tsx

### 2.1 Card eliminada

Se elimina la card "Registrar atención, Beneficio o donación" (líneas 56-74). Ya no se abre `AtencionMedicaModal` desde el dashboard.

### 2.2 Reordenamiento

La card "Atenciones, Beneficios y Donaciones" se mueve al final. Orden final:

1. Historias Clínicas (submodulos[0])
2. Régimen Diario (submodulos[1])
3. Atenciones, Beneficios y Donaciones (card naranja, al final)

### 2.3 Limpieza

- Eliminar `useState` `atencionModalOpen` y su import.
- Eliminar import de `AtencionMedicaModal`.
- Eliminar `ClipboardList` del import de lucide-react (si no se usa en otro lado).
- Eliminar el `<AtencionMedicaModal ... />` del JSX (líneas 123-126).

## 3. Extracción de PaginationControls

**Archivo nuevo:** `src/components/ui/PaginationControls.tsx`

Se extrae la función `PaginationControls` de `src/pages/Refugiados.tsx` (líneas 761-813) como componente exportable. Props:

```ts
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  loading: boolean;
  onChange: (page: number) => void;
  isMobile: boolean;
}
```

**Refugiados.tsx:** se reemplaza la función local por un import de `../components/ui/PaginationControls`.

**Atenciones.tsx:** se importa y usa el mismo componente.

## 4. Cambios en Salud/Atenciones.tsx

### 4.1 Botón "Registrar"

Se agrega en la barra de herramientas (junto al buscador), alineado a la derecha:

```tsx
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
  <div className="relative ...">
    <Search ... />
    <input ... />
  </div>
  <button onClick={() => setAtencionModalOpen(true)}
    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl ...">
    <Plus size={18} />
    Registrar
  </button>
</div>
```

Abre `AtencionMedicaModal` sin paciente pre-seleccionado (el usuario busca dentro del modal).

### 4.2 Paginación

- Se reemplaza la paginación actual (Anterior / números / Siguiente) por `<PaginationControls>`.
- Se agrega label `"Mostrando {total} registros"` arriba de la tabla (estilo Refugiados).
- `perPage` se mantiene en 15.
- Se oculta si `totalPages <= 1`.

### 4.3 "Ver historial" → Modal

El botón "Ver historial" (Eye) en cada fila, en vez de mostrar el historial inline debajo de la tabla, ahora abre `HistorialAtencionesModal`. Se pasa `refugiadoId`, `refugiadoNombre`, `campamentoId` y los permisos.

### 4.4 Eliminaciones

- Se elimina la sección de historial inline completa (líneas 229-286 del archivo actual).
- Se eliminan los estados `selectedRefId`, `atenciones`, `loadingAtenciones`.
- Se elimina `DetalleAtencionModal` (reemplazado por la vista interna del nuevo modal).

### 4.5 Imports nuevos

```ts
import { Plus } from 'lucide-react';
import { PaginationControls } from '../components/ui/PaginationControls';
import { HistorialAtencionesModal } from '../components/salud/HistorialAtencionesModal';
```

## 5. Nuevo componente: HistorialAtencionesModal

**Archivo nuevo:** `src/components/salud/HistorialAtencionesModal.tsx`

### 5.1 Props

```ts
interface HistorialAtencionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  refugiadoId: string;
  refugiadoNombre: string;
  campamentoId: string;
  tienePermisoModificar: boolean;
  tienePermisoEliminar: boolean;
}
```

### 5.2 Tamaño y estructura

- `max-w-2xl`, altura fija sin overflow-y. Espacio para ~5 ítems de atención.
- Sin scroll vertical — exceso de atenciones se maneja con paginación.
- Dos vistas internas controladas por state `vista: 'lista' | 'detalle'`.

### 5.3 Vista Lista

**Header:** "Historial — {apellidos}, {nombres}" + botón X cerrar.

**Body:** 5 atenciones por página. Cada ítem mantiene el diseño actual:
- Ícono de tipo (Activity rojo / Gift verde / HeartHandshake púrpura)
- Label del tipo (Atención Médica / Beneficio / Donación)
- Fecha (`toDisplayDate`)
- Resumen (primera especialidad o tipo)
- 3 botones de acción: Eye, Pencil, Trash

**Footer:** `<PaginationControls>` (solo si `totalPages > 1`, `isMobile={false}`).

**Carga:** `obtenerAtencionesPorRefugiado(refugiadoId)` al montar y al volver de editar/eliminar.

**Acciones:**
- **Eye:** `setVista('detalle')` + `setAtencionSeleccionada(a)`. Preserva la página actual.
- **Pencil:** abre `AtencionMedicaModal` con `atencionToEdit={a}`. Al cerrar, recarga la lista. Solo visible si `tienePermisoModificar`.
- **Trash:** confirma eliminación con `window.confirm`. Al eliminar, recarga y ajusta página si quedó vacía. Solo visible si `tienePermisoEliminar`.

### 5.4 Vista Detalle

**Header:** botón "← Volver" (retorna a `'lista'`) + "Detalle del Registro" + tipo label + X cerrar.

**Body:** mismo contenido que el actual `DetalleAtencionModal`:
- Fecha
- Signos vitales (solo si tipo === 'medica'): presión arterial, temperatura, frecuencia cardíaca, peso, talla, saturación O₂
- Observaciones (si existen)
- Especialidades (medica): `especialidad_N`, `diagnostico_N`, `tratamiento_N`, `responsable_N`
- Detalle de beneficio/donación: `{prefix}_tipo_N`, `{prefix}_descripcion_N`, `{prefix}_entregado_por_N`

**Sin footer.** Solo el header con Volver y X.

### 5.5 Permisos en el modal

El modal recibe `tienePermisoModificar` y `tienePermisoEliminar` calculados en Atenciones.tsx con `tienePermisoPorCampamento('Salud', campId, 'Modificar'/'Eliminar')`.

### 5.6 Limpieza al cerrar

Al cerrar el modal (`onClose`), se resetea `vista` a `'lista'` y `atencionSeleccionada` a `null`.

## 6. Edge cases

| Caso | Comportamiento |
|---|---|
| Sin atenciones registradas | Vista lista muestra mensaje "No hay registros de atención para este integrante." |
| Paginación con 1 página | No se muestra el `PaginationControls` en el footer. |
| Eliminar último ítem de una página | Se recalcula `totalPages`. Si la página actual > nuevo total, se retrocede a la última página. |
| Navegar a detalle y volver | Se preserva la página actual de la lista. |
| Modal cerrado desde detalle | Al reabrir, inicia en vista lista. |
| Registrar desde el botón de la tabla | Abre `AtencionMedicaModal` sin `historiaClinicaId` — requiere búsqueda de paciente. |
