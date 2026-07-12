# Plan de Implementación — Agenda Mejoras

## Orden de implementación

Cada paso depende del anterior. Seguir estrictamente este orden.

---

## Paso 1: Dependencias nuevas

```bash
npm install html2canvas jspdf
```

---

## Paso 2: Migración Supabase

Archivo: `supabase_migration_categorias_evento.sql`

```sql
CREATE TABLE categorias_evento (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  color      text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_categorias_evento_nombre ON categorias_evento(LOWER(nombre));

-- Seed 6 categorías por defecto
INSERT INTO categorias_evento (nombre, color) VALUES
  ('ROJO', '#EF4444'),
  ('NARANJA', '#F97316'),
  ('AMARILLO', '#EAB308'),
  ('AZUL', '#3B82F6'),
  ('VERDE', '#22C55E'),
  ('VIOLETA', '#A855F7');

ALTER TABLE eventos
  ADD COLUMN categoria_id uuid REFERENCES categorias_evento(id),
  ALTER COLUMN hora_fin DROP NOT NULL;

CREATE INDEX idx_eventos_categoria ON eventos(categoria_id);

-- RLS: SELECT para todos, INSERT/DELETE solo con permiso
ALTER TABLE categorias_evento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_select" ON categorias_evento
  FOR SELECT USING (true);

CREATE POLICY "categorias_insert" ON categorias_evento
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      JOIN permisos p ON p.usuario_id = u.id
      JOIN modulos m ON m.id = p.modulo_id
      WHERE u.id = auth.uid()
        AND m.nombre = 'Agenda'
        AND p.acciones @> ARRAY['Crear']
    )
  );

CREATE POLICY "categorias_delete" ON categorias_evento
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      JOIN permisos p ON p.usuario_id = u.id
      JOIN modulos m ON m.id = p.modulo_id
      WHERE u.id = auth.uid()
        AND m.nombre = 'Agenda'
        AND p.acciones @> ARRAY['Crear']
    )
  );
```

---

## Paso 3: Types

Archivo: `src/types/index.ts`

- `Evento.hora_fin?: string` (cambiar de `string` a `string | undefined`)
- Agregar `categoria_id?: string`
- Agregar interfaz:

```ts
export interface CategoriaEvento {
  id: string;
  nombre: string;
  color: string;
  created_at?: string;
}
```

---

## Paso 4: Funciones en eventos.ts

Archivo: `src/lib/eventos.ts`

Agregar:

- `actualizarEvento(id, data)` → `supabase.from('eventos').update(data).eq('id', id).select().single()`
- `eliminarEvento(id)` → `supabase.from('eventos').delete().eq('id', id)`
- `fetchCategorias()` → `supabase.from('categorias_evento').select('*').order('nombre')`
- `crearCategoria(data)` → `supabase.from('categorias_evento').insert(data).select().single()`
- `eliminarCategoria(id)` → `supabase.from('categorias_evento').delete().eq('id', id)`

Reutilizar el patrón de manejo de errores de `crearEvento`.

---

## Paso 5: hora_fin opcional en CrearEventoModal

Archivo: `src/components/agenda/CrearEventoModal.tsx`

- `horaFin` state inicial: `''` en vez de `'09:00'`
- Input `hora_fin`: value vinculado, puede quedar vacío
- Validación: si `horaFin` tiene valor, debe ser > `horaInicio`. Si está vacío, ok.
- Al guardar: si `horaFin` está vacío, enviar `hora_fin: undefined` (se guarda como null)
- Agregar al formulario: selector de categoría (dropdown + botón "+ Nueva")
- Agregar lógica de creación inline de categoría

---

## Paso 6: EditorEventosModal (nuevo componente)

Archivo: `src/components/agenda/EditorEventosModal.tsx`

### Props
```ts
interface EditorEventosModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: dayjs.Dayjs;
  vista: 'mes' | 'semana';
  campamentoId: string;
  campamentoNombre?: string;
}
```

### Estado interno
- `eventos` — lista de `EventoOcurrencia` del rango actual
- `selectedEvento` — evento seleccionado en la lista (null si ninguno)
- `formData` — datos del formulario de edición
- `categorias` — lista de `CategoriaEvento[]`
- `showNuevaCategoria` — bool para inline de creación

### Panel izquierdo
- Calcular rango según `currentDate` y `vista`
- Llamar `fetchEventos` + `expandirPermanentes` + `agruparPorDia`
- Renderizar lista agrupada por día
- Cada ítem: círculo de color (categoría o default) + título + hora_inicio
- Al hacer clic → `setSelectedEvento(evento)`

### Panel derecho
- Si `selectedEvento` es null → mensaje "Selecciona un evento de la lista"
- Si hay seleccionado → formulario precargado:
  - Título (input)
  - Tipo (switch Único/Permanente) — deshabilitar cambio si es permanente?
  - Fecha (date input)
  - Hora inicio (time input)
  - Hora fin (time input, opcional)
  - Categoría (dropdown + "+ Nueva")
  - Descripción (textarea)
  - Botón Guardar → `actualizarEvento(id, formData)` → refetch
  - Botón Eliminar → confirm → `eliminarEvento(id)` → refetch

### Comportamiento al guardar/eliminar
- El modal NO se cierra (se mantiene abierto)
- Refetch de eventos del rango actual
- Si se elimina el seleccionado → limpiar `selectedEvento`

---

## Paso 7: Botones en Agenda.tsx

Archivo: `src/pages/Agenda.tsx`

### Layout cambios

Fila 1 (título):
```tsx
<div className="flex items-center justify-between">
  <h1>Agenda</h1>
  <div className="flex items-center gap-2">
    {tienePermisoCrear && (
      <button onClick={abrirEditor}>
        <Edit size={18} /> Editar
      </button>
    )}
    {tienePermisoCrear && (
      <button onClick={abrirCrear}>
        <Plus size={18} /> Crear Evento
      </button>
    )}
  </div>
</div>
```

Fila 2 (navegación):
```tsx
<div className="flex items-center justify-between gap-4">
  <div className="flex items-center gap-2">
    <button onClick={exportarPDF} title="Exportar PDF">
      <FileDown size={20} />
    </button>
    <button onClick={navegarAtras}><ChevronLeft /></button>
    <h2>{tituloPeriodo()}</h2>
    <button onClick={navegarAdelante}><ChevronRight /></button>
    <button onClick={irHoy}>Hoy</button>
  </div>
  <select value={vista} onChange={...}>...</select>
</div>
```

### Estado
```ts
const [isEditorOpen, setIsEditorOpen] = useState(false);
```

### Manejador PDF
```ts
const handleExportPDF = async () => {
  const calendarioEl = document.getElementById('calendario-container');
  if (!calendarioEl) return;

  const canvas = await html2canvas(calendarioEl, {
    scale: window.devicePixelRatio * 2,
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('landscape', 'mm', 'letter');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 5; // 0.5cm = 5mm

  // Header: título + leyenda
  pdf.setFontSize(11);
  pdf.text(`AGENDA - ${campamentoSeleccionado?.nombre} - ${tituloPeriodo()}`, margin + 2, margin + 5);
  pdf.setFontSize(8);
  pdf.text(`Generado: ${dayjs().format('DD/MM/YYYY')}`, margin + 2, margin + 9);

  // Leyenda (categorías del rango)
  const categoriasEnRango = obtenerCategoriasEnRango(eventos, fechaDesde, fechaHasta);
  let leyendaX = pageWidth / 2;
  categoriasEnRango.forEach((cat, i) => {
    pdf.setFillColor(cat.color);
    pdf.circle(leyendaX, margin + 5, 1.5, 'F');
    pdf.text(cat.nombre, leyendaX + 3, margin + 5.5);
    leyendaX += 25;
  });

  // Imagen del calendario
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', margin, margin + 15, imgWidth, imgHeight);

  // Lista de actividades
  const actividadesY = margin + 15 + imgHeight + 5;
  // ... recorrer eventos agrupados por día, dibujar en columnas

  pdf.save(`agenda-${dayjs().format('YYYY-MM-DD')}.pdf`);
};
```

---

## Paso 8: CalendarioMensual — Color + Hover

Archivo: `src/components/agenda/CalendarioMensual.tsx`

### Color por categoría
- Cada evento ahora tiene `categoria_id` (o el color legacy por tipo)
- Calcular color: `evento.color || (evento.tipo === 'permanente' ? '#A855F7' : '#3B82F6')`
- Pasar `categorias` como prop o mapear colores desde el padre

### Hover tooltip
- Estado: `hoveredEvent: { x, y, descripcion } | null`
- `onMouseEnter` en cada evento: setear posición + descripción
- `onMouseLeave`: limpiar
- Tooltip renderizado como div absoluto con z-50

---

## Paso 9: CalendarioSemanal — Color + Hover

Archivo: `src/components/agenda/CalendarioSemanal.tsx`

- Mismo patrón que Mensual para color y hover
- Tooltip posicionado relativo al slot del evento

---

## Paso 10: Selector de categoría + creación inline (componente reutilizable)

Crear: `src/components/agenda/SelectorCategoria.tsx`

- Dropdown con lista de `CategoriaEvento[]`
- Cada ítem: círculo de color + nombre
- Botón "+ Nueva" (condicional por permiso)
- Inline expandible: input nombre + selector de 6 colores + botones guardar/cancelar
- Props:
  ```ts
  interface SelectorCategoriaProps {
    categorias: CategoriaEvento[];
    selectedId?: string;
    onSelect: (id: string) => void;
    onCreateCategoria: (nombre: string, color: string) => Promise<void>;
    puedeCrear: boolean;
  }
  ```

Reutilizar en `CrearEventoModal` y `EditorEventosModal`.

---

## Resumen de archivos

| Archivo | Acción |
|---|---|
| `package.json` | Agregar `html2canvas`, `jspdf` |
| `supabase_migration_categorias_evento.sql` | Crear |
| `src/types/index.ts` | Modificar |
| `src/lib/eventos.ts` | Agregar funciones |
| `src/pages/Agenda.tsx` | Modificar |
| `src/components/agenda/CrearEventoModal.tsx` | Modificar |
| `src/components/agenda/EditorEventosModal.tsx` | Crear |
| `src/components/agenda/SelectorCategoria.tsx` | Crear |
| `src/components/agenda/CalendarioMensual.tsx` | Modificar |
| `src/components/agenda/CalendarioSemanal.tsx` | Modificar |
