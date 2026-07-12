import { useState } from 'react';
import dayjs from 'dayjs';
import type { EventoOcurrencia, CategoriaEvento } from '../../types';
import { formatTime12h, formatHourLabel } from '../../lib/formatTime';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const HORAS = Array.from({ length: 16 }, (_, i) => i + 6);

interface CalendarioSemanalProps {
  currentDate: dayjs.Dayjs;
  eventosPorDia: Map<string, EventoOcurrencia[]>;
  onDayClick: (date: dayjs.Dayjs) => void;
  categorias: CategoriaEvento[];
}

export default function CalendarioSemanal({ currentDate, eventosPorDia, onDayClick, categorias }: CalendarioSemanalProps) {
  const hoy = dayjs().format('YYYY-MM-DD');
  const inicioSemana = currentDate.startOf('week');

  const [hoveredEvent, setHoveredEvent] = useState<{
    descripcion: string;
    x: number;
    y: number;
  } | null>(null);

  const diasSemana = DIAS.map((_, i) => inicioSemana.add(i, 'day'));

  const getCategoriaColor = (evento: EventoOcurrencia): string => {
    if (evento.categoria_id) {
      const cat = categorias.find(c => c.id === evento.categoria_id);
      if (cat) return cat.color;
    }
    return evento.tipo === 'permanente' ? '#A855F7' : '#3B82F6';
  };

  const formatHoraRange = (evento: EventoOcurrencia): string => {
    if (evento.hora_fin) {
      return `${formatTime12h(evento.hora_inicio)}-${formatTime12h(evento.hora_fin)}`;
    }
    return formatTime12h(evento.hora_inicio);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 h-full relative">
      <div className="flex flex-1 min-h-0 overflow-auto" style={{ minWidth: '700px' }}>
        <div className="w-16 shrink-0 border-r border-gray-300">
          <div className="h-14 border-b border-gray-300" />
          {HORAS.map((hora) => (
            <div key={hora} className="h-12 border-b border-gray-100 text-sm text-gray-400 text-right pr-2 pt-0.5">
              {formatHourLabel(hora)}
            </div>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-7">
          {diasSemana.map((dia) => {
            const dateStr = dia.format('YYYY-MM-DD');
            const esHoy = dateStr === hoy;
            const eventos = eventosPorDia.get(dateStr) || [];

            return (
              <div
                key={dateStr}
                className={`border-r border-gray-300 ${esHoy ? 'bg-blue-50/30' : ''}`}
              >
                <div
                  onClick={() => onDayClick(dia)}
                  className="h-14 border-b border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base font-medium text-gray-600">{DIAS[dia.day()]}</span>
                  <span
                    className={`text-sm font-semibold mt-0.5 ${
                      esHoy ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center' : 'text-gray-800'
                    }`}
                  >
                    {dia.format('D')}
                  </span>
                </div>

                {HORAS.map((hora) => {
                  const eventosEnHora = eventos.filter((e) => {
                    const horaInicio = parseInt(e.hora_inicio.split(':')[0]);
                    return horaInicio === hora;
                  });

                  return (
                    <div
                      key={hora}
                      className="h-12 border-b border-gray-100 p-0.5 relative"
                    >
                      {eventosEnHora.map((evento, idx) => {
                        const duracionMin = (() => {
                          const [hi, mi] = evento.hora_inicio.split(':').map(Number);
                          if (!evento.hora_fin) return 60;
                          const [hf, mf] = evento.hora_fin.split(':').map(Number);
                          return (hf - hi) * 60 + (mf - mi);
                        })();
                        const alturaSlots = Math.max(1, Math.ceil(duracionMin / 60));

                        return (
                          <div
                            key={`${evento.id}-${idx}`}
                            className="text-[13px] px-1 py-0.5 rounded text-white relative z-10"
                            style={{
                              backgroundColor: getCategoriaColor(evento),
                              minHeight: `${alturaSlots * 3}rem`,
                            }}
                            onMouseEnter={(e) => {
                              if (evento.descripcion) {
                                const rect = (e.target as HTMLElement).getBoundingClientRect();
                                setHoveredEvent({
                                  descripcion: evento.descripcion,
                                  x: rect.left + rect.width / 2,
                                  y: rect.top,
                                });
                              }
                            }}
                            onMouseLeave={() => setHoveredEvent(null)}
                          >
                            <div className="flex items-center gap-1">
                              {evento.tipo === 'permanente' && (
                                <span className="text-xs font-bold opacity-80">P</span>
                              )}
                              <span className="truncate font-medium">{evento.titulo}</span>
                            </div>
                            <span className="opacity-80 text-xs block leading-tight">
                              {formatHoraRange(evento)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {hoveredEvent && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg pointer-events-none whitespace-pre-wrap max-w-[250px] break-words"
          style={{
            left: hoveredEvent.x,
            top: hoveredEvent.y,
            transform: 'translateX(-50%) translateY(calc(-100% - 8px))',
          }}
        >
          {hoveredEvent.descripcion}
        </div>
      )}
    </div>
  );
}
