# Módulo Agenda — Especificación de Diseño

## 1. Resumen

Módulo de calendario tipo Google Calendar (solo la vista central, sin sidebar izquierdo) para gestionar eventos por campamento. Reemplaza el patrón de tabla/CRUD por un calendario visual mensual y semanal.

## 2. Alcance

- Vista Mensual (default) y Vista Semanal con selector tipo dropdown
- Creación de eventos vía modal con título, fecha, hora inicio/fin, descripción (opcional), tipo (Único / Permanente)
- Eventos vinculados a un campamento específico
- Control de permisos: Ver (acceso al módulo), Crear (botón + crear evento)
- Persistencia en Supabase (tabla `eventos`)
- Solamente la vista del calendario — no incluye sidebar tipo Google Calendar

## 3. Stack y Dependencias

- **dayjs** (nueva dependencia) — manejo de fechas, navegación entre meses/semanas, cálculo de rangos
- **Tailwind CSS** — grid y estilos (misma paleta institucional)
- **lucide-react** — íconos (Calendar para sidebar)
- **Supabase** — persistencia (tabla `eventos`)
- Sin librerías de calendario externas (FullCalendar, react-big-calendar, etc.)

## 4. Modelo de Datos

Nueva tabla en Supabase:

```sql
CREATE TABLE eventos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_campamento uuid NOT NULL REFERENCES campamentos(id) ON DELETE CASCADE,
  titulo        text NOT NULL,
  descripcion   text,
  fecha_inicio  date NOT NULL,
  fecha_fin     date,                    -- NULL para único; último día del mes para permanente
  hora_inicio   time NOT NULL,
  hora_fin      time NOT NULL,
  tipo          text NOT NULL CHECK (tipo IN ('permanente', 'unico')),
  created_at    timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_eventos_campamento ON eventos(id_campamento);
CREATE INDEX idx_eventos_fechas ON eventos(id_campamento, fecha_inicio, fecha_fin);
```

**RLS:** Política por campamento — cada usuario solo ve/edita eventos del campamento que tiene seleccionado.

### Lógica de eventos permanentes

- Se guarda **1 sola fila** con `tipo='permanente'`, `fecha_inicio` = día de creación, `fecha_fin` = último día del mes de creación
- En el frontend se expande en memoria: se genera una ocurrencia por cada día dentro del rango `[fecha_inicio, fecha_fin]`
- Se renderiza igual que un evento único pero con badge `P` para indicar recurrencia
- El horario (`hora_inicio` - `hora_fin`) es el mismo para todas las ocurrencias

## 5. Routing y Navegación

- Nueva ruta: `/agenda` → componente `Agenda`
- Nuevo item en sidebar:
  ```ts
  { path: '/agenda', icon: Calendar, label: 'Agenda' }
  ```
- Nuevo módulo en tabla `modulos` para permisos (Ver, Crear)
- Permiso "Ver" → acceso a la página; permiso "Crear" → botón "Crear Evento"

## 6. Componentes

```
src/pages/Agenda.tsx              ← Página principal
├── SelectorVista.tsx             ← Dropdown Semana/Mes
├── BarraNavegacion.tsx           ← ← Mes/Semana actual →
├── CalendarioMensual.tsx         ← Grilla 7 columnas, eventos como chips
│   └── CeldaDia.tsx              ← Día individual con lista de eventos
├── CalendarioSemanal.tsx         ← Grilla con franjas horarias
│   └── EventoSemanal.tsx         ← Chip posicionado por hora
└── CrearEventoModal.tsx          ← Modal de creación
    ├── Input: Título
    ├── Input: Fecha (date picker nativo)
    ├── Input: Hora inicio / Hora fin
    ├── Textarea: Descripción (opcional)
    └── Switch: Único / Permanente
```

## 7. Flujo de Datos

```
[Supabase: eventos]
     ↓ fetchEventos(rangoFechas, id_campamento)
[Eventos crudos]
     ↓ expandirPermanentes(rangoVisible)
[Eventos planos] — 1 por ocurrencia
     ↓ agruparPorDia()
[Map<fecha, eventos[]>]
     ↓
[CalendarioMensual | CalendarioSemanal]
```

**Refetch:** Al cambiar de campamento (vía selector global), al navegar entre meses/semanas, o al crear/eliminar un evento.

## 8. Diseño Visual

- **Paleta de colores:** Misma paleta institucional de la Alcaldía de Caracas (fondos blancos, texto gris oscuro, azul institucional para acentos)
- **Selector de vista:** Dropdown con opciones "Semana" y "Mes"
- **Vista Mensual:** Grilla de 7 columnas (Dom a Sáb), celdas de ~90px de alto, días fuera del mes en gris claro, día actual resaltado con fondo azul claro y badge "HOY"
- **Vista Semanal:** Grilla con columna horaria (6:00 - 13:00 por defecto) + 7 columnas de días, eventos posicionados en la franja horaria correspondiente
- **Cápsulas de evento:** Formato fijo `[nombre] [HH:MM-HH:MM]`. Badge `P` para permanentes (fondo morado). Badge `Ú` o color distintivo para únicos
- **Modal:** Fondo oscuro overlay + tarjeta blanca centrada (mismo patrón que los modals existentes del proyecto)
- **Header:** Título "Agenda" + dropdown selector de vista + botón "Crear Evento"
- **Navegación:** Flechas ← → para cambiar mes/semana, con indicador del período actual

## 9. Manejo de Estados

- **Carga:** Skeleton/spinner mientras se fetchan eventos
- **Vacío:** Mensaje "No hay eventos para este período" en el centro del grid
- **Error:** Toast/notificación si falla la conexión con Supabase
- **Sin permisos:** Componente `ShieldOff` (mismo patrón que los demás módulos)
- **Sin campamento seleccionado:** Mensaje informativo pidiendo seleccionar un campamento

## 10. Edge Cases

| Caso | Comportamiento |
|---|---|
| Evento permanente creado el día 31 del mes | Solo se muestra ese día (fecha_fin = 31) |
| Navegación a mes anterior | Los permanentes del mes actual no se muestran |
| Múltiples eventos en un mismo día/horario | Se apilan verticalmente (orden por hora_inicio) |
| Cambio de campamento | Refetch completo de eventos |
| Evento sin título | Validación: título requerido, no permitir guardar |
| Hora inicio > hora fin | Validación: mostrar error, no permitir guardar |
| Scroll vertical en vista mensual con muchos eventos | Altura fija de celda con overflow; al hacer clic en "ver más" se expande |

## 11. Fuera de Alcance (futuro)

- Edición y eliminación de eventos
- Drag & drop para cambiar fecha/hora
- Vista de día
- Eventos multi-día (no recurrentes)
- Notificaciones/recordatorios
- Repetición semanal/quincenal/personalizada
- Archivos adjuntos en eventos
- Integración con Google Calendar / iCal
