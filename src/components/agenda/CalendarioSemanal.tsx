import { useState } from 'react';
import dayjs from '../../lib/dayjs';
import type { EventoOcurrencia, CategoriaEvento } from '../../types';
import { formatTime12h, formatHourLabel, addOneHour } from '../../lib/formatTime';

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
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

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

  const timeToHours = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h + m / 60;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 h-full relative">
      <div className="flex flex-1 min-h-0 overflow-auto" style={{ minWidth: '700px' }}>
        <div className="w-20 shrink-0 border-r border-gray-300">
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

                <div className="relative">
                  {HORAS.map((hora) => (
                    <div key={hora} className="h-12 border-b border-gray-100" />
                  ))}
                  {eventos.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none">
                      {(() => {
                        const sorted = [...eventos].sort((a, b) => {
                          const c = a.hora_inicio.localeCompare(b.hora_inicio);
                          if (c !== 0) return c;
                          return (b.hora_fin || addOneHour(b.hora_inicio)).localeCompare(a.hora_fin || addOneHour(a.hora_inicio));
                        });
                        const stack: number[] = [];
                        return sorted.map((evento, idx) => {
                          while (stack.length > 0 && stack[0] <= timeToHours(evento.hora_inicio)) {
                            stack.shift();
                          }
                          const level = stack.length;
                          stack.push(timeToHours(evento.hora_fin || addOneHour(evento.hora_inicio)));
                          stack.sort((a, b) => a - b);
                          const startH = timeToHours(evento.hora_inicio);
                          const endH = Math.min(timeToHours(evento.hora_fin || addOneHour(evento.hora_inicio)), 22);
                          const top = Math.max(0, startH - 6) * 3;
                          const h = Math.max(1.5, (endH - startH) * 3);
                          const offset = level * 1.5;
                          const baseKey = `${evento.id}-${idx}`;
                          return (
                            <div
                              key={baseKey}
                              className="text-[13px] px-1 py-0.5 rounded text-white absolute overflow-hidden pointer-events-auto"
                              style={{
                                backgroundColor: getCategoriaColor(evento),
                                top: `${top}rem`,
                                left: `${offset}rem`,
                                width: `calc(100% - ${offset}rem)`,
                                minHeight: `${h}rem`,
                                zIndex: hoveredKey === baseKey ? 50 : level,
                              }}
                              onMouseEnter={(e) => {
                                setHoveredKey(baseKey);
                                if (evento.descripcion) {
                                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                                  setHoveredEvent({
                                    descripcion: evento.descripcion,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top,
                                  });
                                }
                              }}
                              onMouseLeave={() => {
                                setHoveredKey(null);
                                setHoveredEvent(null);
                              }}
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
                        });
                      })()}
                    </div>
                  )}
                </div>
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
