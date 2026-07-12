# Contexto — Agenda

## Objetivo
Módulo de Agenda con vistas mensual/semanal (estilo Google Calendar sin sidebar izq.), creación de eventos vía modal, persistencia en Supabase.

## Stack
- dayjs + minMax plugin, Tailwind CSS, lucide-react
- Supabase RLS: roles `anon, authenticated` en `eventos`

## Eventos
- **Permanentes**: se repiten diario desde `fecha_inicio` hasta `fecha_fin` (o fin de mes). Almacenados como 1 fila, expandidos en memoria por `expandirPermanentes()`.
- **Únicos**: 1 sola ocurrencia en `fecha_inicio`.
- Formato hora: 12h AM/PM (6:00 AM – 9:00 PM en vista semanal).
- Todos los inputs de texto → mayúsculas.

## Archivos creados/modificados

| Archivo | Rol |
|---|---|
| `src/types/index.ts` | Interfaces `Evento`, `EventoOcurrencia` |
| `src/lib/eventos.ts` | `fetchEventos`, `crearEvento`, `expandirPermanentes`, `agruparPorDia` |
| `src/lib/formatTime.ts` | `formatTime12h`, `formatHourLabel` |
| `src/pages/Agenda.tsx` | Layout raíz `grid-rows-[auto_auto_1fr]`, navegación, switch Mes/Semana |
| `src/components/agenda/CalendarioMensual.tsx` | Grid mensual: chips con título (wrap) + hora, badge P, scroll por día |
| `src/components/agenda/CalendarioSemanal.tsx` | Grid semanal: 16 slots (6 AM–9 PM), eventos posicionados por hora |
| `src/components/agenda/CrearEventoModal.tsx` | Modal: título → tipo switch → fecha → hora → descripción → guardar |
| `src/layouts/MainLayout.tsx` | `max-w-7xl` condicional (saca el max-width en `/agenda`) |
| `supabase_migration_eventos.sql` | Tabla `eventos` + índices + RLS + módulo/acciones |

## Diseño visual
- Permanentes: fondo `bg-purple-500`
- Únicos: fondo `bg-blue-500`
- Bordes: `gray-200`/`gray-300`
- HOY badge: `bg-amber-500`
- Día activo: `w-6 h-6 text-[11px]`
- Título evento: `text-[12.5px]` con `break-words` (wrap)
- Contenedor de eventos del día: `flex-1 min-h-0 overflow-y-auto`

## Problema activo
El calendario no ocupa todo el alto disponible verticalmente; queda espacio abajo. La cadena de layout:
`Agenda.tsx` → `grid-rows-[auto_auto_1fr]` →
wrapper interno → `flex flex-col flex-1 min-h-0 overflow-hidden` →
`CalendarioMensual`/`CalendarioSemanal` → `flex flex-col flex-1 min-h-0`

Falta diagnosticar con DevTools dónde se rompe la propagación de altura.

## Próximo paso
Inspeccionar alturas computadas en DevTools y agregar `flex-1`/`min-h-0` faltante.
