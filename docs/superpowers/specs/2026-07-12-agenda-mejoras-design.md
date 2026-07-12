# Módulo Agenda — Mejoras: Edición, PDF, Categorías de Color y Hover

## 1. Resumen

Extensión del módulo Agenda existente. Se agregan:

- **Edición y eliminación de eventos** vía modal split (lista + formulario)
- **Exportación a PDF** del calendario actual con html2canvas + jsPDF
- **Categorías de color** (6 colores fijos, 3 cálidos + 3 fríos) asignables a eventos, con creación inline desde el modal
- **Hover tooltip** en eventos del calendario mostrando la descripción (si existe)
- **`hora_fin` opcional** tanto en creación como en edición

## 2. Modelo de Datos

### Nueva tabla: `categorias_evento`

```sql
CREATE TABLE categorias_evento (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  color      text NOT NULL,  -- hex #RRGGBB
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_categorias_evento_nombre ON categorias_evento(LOWER(nombre));
```

- **Global:** sin `id_campamento` — compartida entre todos los campamentos
- **RLS:** `SELECT` para cualquier usuario autenticado; `INSERT`/`DELETE` requiere permiso "Crear" en Agenda
- **6 filas seed** (insertadas en migración):

| nombre | color |
|---|---|
| ROJO | `#EF4444` |
| NARANJA | `#F97316` |
| AMARILLO | `#EAB308` |
| AZUL | `#3B82F6` |
| VERDE | `#22C55E` |
| VIOLETA | `#A855F7` |

### Modificación en tabla `eventos`

```sql
ALTER TABLE eventos
  ADD COLUMN categoria_id uuid REFERENCES categorias_evento(id),
  ALTER COLUMN hora_fin DROP NOT NULL;
```

- `categoria_id` nullable — si es NULL, se usa el color por defecto según tipo (azul único / morado permanente como hoy)
- `hora_fin` pasa a ser nullable — si NULL, en la vista se muestra solo `hora_inicio`

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
  hora_fin?: string;        // nullable
  tipo: 'permanente' | 'unico';
  categoria_id?: string;    // nuevo
  created_at?: string;
}
```

## 3. Permisos

- **Ver categorías:** cualquier usuario con acceso "Ver" a Agenda
- **Crear categorías:** solo usuarios con permiso "Crear" en Agenda (misma validación que `tienePermisoCrear`)
- No se crean módulos/acciones nuevos — se reutiliza el permiso Agenda.Crear

## 4. Layout de Botones en Agenda.tsx

### Reorganización de la fila de navegación (fila 2)

```
Estado actual:
  [←] [→] [Hoy] [periodo]                         [Mes/Semana ▼]

Estado nuevo:
  [Exportar PDF] [←] [→] [Hoy] [periodo]           [Mes/Semana ▼]
```

### Reorganización de la fila de título (fila 1)

```
Estado actual:
  Título "Agenda"                                   [Crear Evento]

Estado nuevo:
  Título "Agenda"                                   [Editar] [Crear Evento]
```

### Botón Editar
- Icono: `lucide-react` `Edit`
- Condición: `tienePermisoCrear`
- Acción: abre `EditorEventosModal`
- Estilo: consistente con Crear Evento (mismo padding, redondeo, hover)

### Botón Exportar PDF
- Icono: `lucide-react` `FileDown`
- Condición: visible siempre (sin restricción)
- Acción: captura calendario actual y genera PDF
- Estilo: `p-2 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors` (igual que flechas de navegación)

## 5. Modal Split de Edición (`EditorEventosModal`)

### Estructura

```
┌───────────────────────────────────────────────────────────┐
│  ✏️ Editar Eventos                              [✕] cerrar │
├──────────────────────────┬────────────────────────────────┤
│  Eventos del período     │  Formulario de edición         │
│                          │                                │
│  ── LUN 14 ──            │  Título: [________________]   │
│  🔵 Reunión  8:00 AM     │  Tipo:  ○ Único ○ Permanente  │
│  🟠 Taller   10:00 AM    │  Fecha: [___________]         │
│                          │  Hora inicio: [___]           │
│  ── MAR 15 ──            │  Hora fin:  [___] (opcional)  │
│  🔵 Curso    9:00 AM     │                                │
│  🟣 Yoga     2:00 PM     │  Categoría: [▼]  [+ Nueva]    │
│                          │                                │
│                          │  Descripción:                  │
│                          │  [_______________________]    │
│                          │                                │
│                          │  [💾 Guardar]  [🗑 Eliminar]   │
└──────────────────────────┴────────────────────────────────┘
```

### Panel izquierdo (lista)
- Muestra eventos agrupados por día dentro del rango actual
- Cada ítem: círculo de color de categoría + título + hora_inicio
- Al hacer clic en un evento → se selecciona (highlight) y se carga en panel derecho
- Si no hay eventos: mensaje "No hay eventos en este período"

### Panel derecho (formulario)
- Mismos campos que `CrearEventoModal` + selector de categoría + botón eliminar
- `hora_fin` pasa a opcional (puede quedar vacío → se envía como `null`)
- Al guardar: update en Supabase, refetch de eventos, modal se mantiene abierto con datos actualizados
- Al eliminar: confirmación → delete en Supabase → refetch → quita de la lista izquierda → limpia panel derecho
- Botón "+ Nueva" en categoría solo visible si `tienePermisoCrear`

## 6. Selector de Categoría + Creación Inline

### Dropdown de categorías
- Lista todas las categorías existentes
- Cada ítem: círculo (color) + nombre
- Al seleccionar, se guarda `categoria_id` en el evento

### Creación inline ("+ Nueva")
- Solo visible si usuario tiene permiso "Crear" en Agenda
- Al hacer clic se expande dentro del modal:
  ```
  Nombre: [________________]  (en mayúsculas)
  Color:  🔴 🟠 🟡 🔵 🟢 🟣
  [Guardar Categoría] [Cancelar]
  ```
- Validaciones: nombre no vacío, no duplicado
- Al guardar: POST a `categorias_evento` → dropdown se refresca → nueva categoría queda seleccionada
- Al cancelar: se colapsa el inline, no se persiste nada

## 7. Exportar PDF

### Tecnología
- `html2canvas` para capturar el DOM del calendario actual
- `jsPDF` para generar el PDF

### Captura
- Seleccionar el contenedor del calendario (`CalendarioMensual` o `CalendarioSemanal`)
- `html2canvas` con `scale: window.devicePixelRatio * 2` (~300dpi)
- Opción `useCORS: true` para imágenes

### Layout del PDF (carta horizontal)

```
┌───────────────────────────────────────────────────────────────┐
│  AGENDA - [Campamento] - [periodo]    │ 🔴 ROJO 🟠 NARANJA  │
│  Generado: 12/07/2026                 │ 🟡 AMARILLO 🔵 AZUL │
│                                       │ 🟢 VERDE 🟣 VIOLETA │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│          [Imagen del calendario — ancho completo]              │
│                                                               │
├──────────────────────────────────┬────────────────────────────┤
│  LUN 14                          │  MAR 15                    │
│  8:00 AM · Reunión · ROJO        │  9:00 AM · Curso · AZUL   │
│  10:00 AM · Taller · NARANJA     │  2:00 PM · Yoga · VIOLETA │
├──────────────────────────────────┴────────────────────────────┤
└───────────────────────────────────────────────────────────────┘
```

- **Formato:** carta horizontal (279.4 × 215.9 mm), landscape
- **Márgenes:** 0.5 cm en los 4 lados
- **Modo color:** CMYK
- **Header:** título + leyenda de categorías (en la misma fila). La fila puede expandirse en altura si hay muchas categorías
- **Cuerpo:** imagen del calendario capturada, ancho completo
- **Actividades:** listado agrupado por día, cada item con hora, título y categoría. Distribuido en tantas columnas como quepan horizontalmente
- **Pie:** fecha de generación (dentro del header, abajo del título)
- Compresión habilitada

## 8. Hover Tooltip con Descripción

### Comportamiento
- En `CalendarioMensual` y `CalendarioSemanal`: cada evento tiene `onMouseEnter`/`onMouseLeave`
- Si el evento tiene `descripcion` no vacía → se muestra tooltip con el texto
- Si no tiene descripción → no hay tooltip

### Estética (idéntica a CroquisViewer)
```tsx
<div
  className="absolute z-50 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap max-w-[250px] break-words"
  style={{
    left: x,
    top: y,
    transform: 'translateX(-50%) translateY(calc(-100% - 8px))',
  }}
>
  {descripcion}
</div>
```

- `pointer-events-none` para no interferir con clics
- Posicionado sobre el evento, centrado horizontalmente
- `max-w-[250px]` con `break-words` para descripciones largas

## 9. `hora_fin` Opcional

### En creación y edición
- Campo `hora_fin` pasa de `time` input requerido a opcional
- Si se deja vacío → se envía como `null` a Supabase
- Validación: si `hora_fin` tiene valor, debe ser > `hora_inicio`. Si está vacío, no se valida.

### En vista de calendario
- Si `hora_fin` es null → se muestra solo `hora_inicio` (ej: "8:00 AM")
- Si tiene valor → se muestra rango completo (ej: "8:00 AM - 9:00 AM")

### En la BD
- La columna `hora_fin` en Supabase ya acepta NULL (se altera con `DROP NOT NULL`)

## 10. Edge Cases y Validaciones

| Caso | Comportamiento |
|---|---|
| Categoría con nombre duplicado | Error inline: "Ya existe una categoría con ese nombre" |
| Categoría sin nombre | No permitir guardar, mostrar validación |
| Evento sin categoría asignada | Usar color legacy según tipo (azul único / morado permanente) |
| `hora_fin` vacío en evento | Mostrar solo `hora_inicio` en la UI |
| `hora_fin` con valor < `hora_inicio` | Error: "Hora fin debe ser posterior a inicio" |
| Eliminar categoría con eventos asignados | Los eventos quedan con `categoria_id = NULL` (color legacy) |
| Captura PDF con muchos eventos | html2canvas escalado a 300dpi, el layout del PDF se auto-expande |
| Rango de calendario muy grande (mes con 6 semanas) | La imagen se captura completa, el PDF ajusta altura |
| Sin eventos en el rango | PDF muestra calendario vacío + listado "Sin actividades" |

## 11. Dependencias Nuevas

```json
{
  "html2canvas": "^1.4.1",
  "jspdf": "^2.5.2"
}
```

Ambas se agregan a `package.json` con `npm install`.

## 12. Archivos a Crear/Modificar

| Archivo | Cambio |
|---|---|
| `src/types/index.ts` | `Evento.hora_fin` nullable, agregar `categoria_id` |
| `src/lib/eventos.ts` | Agregar `eliminarEvento`, `actualizarEvento`, `fetchCategorias`, `crearCategoria`, `eliminarCategoria` |
| `src/pages/Agenda.tsx` | Agregar botones Editar y Exportar PDF, reorganizar layout |
| `src/components/agenda/CrearEventoModal.tsx` | `hora_fin` opcional, agregar selector de categoría + creación inline |
| `src/components/agenda/EditorEventosModal.tsx` | Nuevo — modal split con lista + formulario de edición |
| `src/components/agenda/CalendarioMensual.tsx` | Color por categoría, tooltip hover descripción |
| `src/components/agenda/CalendarioSemanal.tsx` | Color por categoría, tooltip hover descripción |
| `supabase_migration_categorias_evento.sql` | Nueva migración: tabla + seed data + alter eventos |
