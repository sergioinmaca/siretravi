# Plan de Implementación — Módulo Agenda

Basado en: `docs/superpowers/specs/2026-07-12-agenda-design.md`

## Orden de Implementación

### Fase 1: Infraestructura

- [ ] **1.1 Instalar dayjs**
  - `npm install dayjs`
- [ ] **1.2 Migración de Supabase**
  - Crear tabla `eventos` con columnas: id, id_campamento, titulo, descripcion, fecha_inicio, fecha_fin, hora_inicio, hora_fin, tipo, created_at
  - Crear índices y RLS policies por campamento
- [ ] **1.3 Tipo TypeScript**
  - Agregar `Evento` type en `src/types/index.ts`
- [ ] **1.4 Módulo de permisos**
  - Insertar "Agenda" en tabla `modulos` con acciones Ver y Crear
- [ ] **1.5 Sidebar y ruta**
  - Agregar item `{ path: '/agenda', icon: Calendar, label: 'Agenda' }` en `MainLayout.tsx`
  - Agregar `<Route path="agenda" element={<Agenda />} />` en `App.tsx`

### Fase 2: Página Principal y Componentes Base

- [ ] **2.1 Servicio Supabase**
  - Crear `src/lib/eventos.ts` con funciones: `fetchEventos(campamentoId, fechaInicio, fechaFin)`, `crearEvento(data)`
- [ ] **2.2 Página Agenda**
  - Crear `src/pages/Agenda.tsx` — estructura base con permisos, estado de campamento, fetch de datos
- [ ] **2.3 Selector de vista**
  - Crear `src/components/agenda/SelectorVista.tsx` — dropdown Semana/Mes
- [ ] **2.4 Barra de navegación**
  - Crear `src/components/agenda/BarraNavegacion.tsx` — flechas ← → y label de período actual

### Fase 3: Vistas del Calendario

- [ ] **3.1 Lógica de expansión de permanentes**
  - Función `expandirPermanentes(eventos, rangoVisible)` en `src/lib/eventos.ts`
- [ ] **3.2 Vista Mensual**
  - Crear `src/components/agenda/CalendarioMensual.tsx`
  - Crear `src/components/agenda/CeldaDia.tsx`
- [ ] **3.3 Vista Semanal**
  - Crear `src/components/agenda/CalendarioSemanal.tsx`
  - Crear `src/components/agenda/EventoSemanal.tsx`

### Fase 4: Creación de Eventos

- [ ] **4.1 Modal Crear Evento**
  - Crear `src/components/agenda/CrearEventoModal.tsx`
  - Formulario: título, fecha, hora inicio, hora fin, descripción, switch Único/Permanente
  - Validaciones: título requerido, hora fin > hora inicio

### Fase 5: Integración y Pulido

- [ ] **5.1 Manejo de estados** — loading, empty, error, sin campamento
- [ ] **5.2 Refetch al cambiar campamento**
- [ ] **5.3 Estilos finales** — paleta institucional, responsive básico
- [ ] **5.4 Verificación final** — probar creación de eventos único y permanente, navegación entre meses/semanas, cambio de campamento
