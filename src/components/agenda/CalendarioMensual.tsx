import { useState } from 'react';
import dayjs from 'dayjs';
import type { EventoOcurrencia, CategoriaEvento } from '../../types';
import { formatTime12h } from '../../lib/formatTime';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface CalendarioMensualProps {
  currentDate: dayjs.Dayjs;
  eventosPorDia: Map<string, EventoOcurrencia[]>;
  onDayClick: (date: dayjs.Dayjs) => void;
  categorias: CategoriaEvento[];
}

export default function CalendarioMensual({ currentDate, eventosPorDia, onDayClick, categorias }: CalendarioMensualProps) {
  const hoy = dayjs().format('YYYY-MM-DD');
  const inicioMes = currentDate.startOf('month');
  const finMes = currentDate.endOf('month');
  const inicioCalendario = inicioMes.startOf('week');
  const finCalendario = finMes.endOf('week');

  const [hoveredEvent, setHoveredEvent] = useState<{
    descripcion: string;
    x: number;
    y: number;
  } | null>(null);

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

  const semanas: dayjs.Dayjs[][] = [];
  let actual = inicioCalendario;
  while (actual.isBefore(finCalendario) || actual.isSame(finCalendario, 'day')) {
    const semana: dayjs.Dayjs[] = [];
    for (let i = 0; i < 7; i++) {
      semana.push(actual);
      actual = actual.add(1, 'day');
    }
    semanas.push(semana);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
      <div className="grid grid-cols-7 shrink-0">
        {DIAS.map((dia) => (
          <div key={dia} className="text-center py-3 text-base font-semibold text-gray-500 bg-gray-50 border-b border-gray-300">
            {dia}
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col min-h-0 divide-y divide-gray-200 overflow-hidden">
        {semanas.map((semana, semanaIdx) => (
            <div key={semanaIdx} className="flex-1 grid grid-cols-7 min-h-0">
              {semana.map((dia) => {
                const dateStr = dia.format('YYYY-MM-DD');
                const esMesActual = dia.isSame(inicioMes, 'month');
                const esHoy = dateStr === hoy;
                const eventos = eventosPorDia.get(dateStr) || [];

                return (
                  <div
                    key={dateStr}
                    onClick={() => onDayClick(dia)}
                    className={`border-r border-gray-200 p-1.5 cursor-pointer transition-colors hover:bg-gray-50 flex flex-col min-h-0 overflow-hidden ${esHoy ? 'bg-blue-50/50' : ''
                      } ${!esMesActual ? 'bg-gray-50/50' : ''}`}
                  >
                    <span
                      className={`text-[11px] font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${esHoy ? 'bg-blue-600 text-white' : ''
                        } ${!esMesActual && !esHoy ? 'text-gray-400' : 'text-gray-700'}`}
                    >
                      {dia.format('D')}
                    </span>
                    {esHoy && !eventos.some((e) => e.fecha_ocurrencia === dateStr && e.titulo) && (
                      <div className="mt-0.5">
                        <span className="text-sm bg-amber-500 text-white px-2 py-0.5 rounded font-medium">HOY</span>
                      </div>
                    )}
                    <div className="mt-0.5 space-y-0.5 flex-1 min-h-0 overflow-y-auto">
                      {eventos.map((evento, idx) => (
                        <div
                          key={`${evento.id}-${idx}`}
                          className="text-sm px-1.5 py-1 rounded text-white relative overflow-hidden"
                          style={{ backgroundColor: getCategoriaColor(evento) }}
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
                          <div className="flex items-start gap-1">
                            {evento.tipo === 'permanente' && (
                              <span className="text-xs font-bold opacity-80 shrink-0 mt-0.5">P</span>
                            )}
                            <span className="min-w-0 truncate text-[12.5px]">{evento.titulo}</span>
                          </div>
                          <span className="opacity-80 text-xs block leading-tight truncate">
                            {formatHoraRange(evento)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  );
              })}
            </div>
          ))}
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
