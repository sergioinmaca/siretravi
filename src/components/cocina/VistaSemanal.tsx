import { Trash2 } from 'lucide-react';
import dayjs from '../../lib/dayjs';
import { NOMBRE_TIPO_COMIDA } from '../../types';
import type { CocinaSlot, ComidaMenu, TipoComida } from '../../types';
import { formatTime12h } from '../../lib/formatTime';
import { dividirNombreComida } from '../../lib/cocina';

interface VistaSemanalProps {
  dias: dayjs.Dayjs[];
  slots: CocinaSlot[];
  mapa: Map<string, ComidaMenu>;
  hoy: string;
  puedeCrear: boolean;
  puedeModificar: boolean;
  puedeEliminar: boolean;
  onCellClick: (fecha: string, tipo: TipoComida, comida: ComidaMenu | null) => void;
  onDelete: (id: string) => void;
}

export default function VistaSemanal({
  dias,
  slots,
  mapa,
  hoy,
  puedeCrear,
  puedeModificar,
  puedeEliminar,
  onCellClick,
  onDelete,
}: VistaSemanalProps) {
  const puedeAgregar = puedeCrear || puedeModificar;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="min-w-[920px]">
          <div className="grid" style={{ gridTemplateColumns: '7rem repeat(7, 1fr)' }}>
            <div className="h-16 border-b border-gray-200 border-r border-gray-200 px-3 flex items-end pb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Comida</span>
            </div>
            {dias.map((dia) => {
              const dateStr = dia.format('YYYY-MM-DD');
              const esHoy = dateStr === hoy;
              return (
                <div
                  key={dateStr}
                  className={`h-16 border-b border-gray-200 flex flex-col items-center justify-center ${
                    esHoy ? 'bg-caracas-red/5' : ''
                  }`}
                >
                  <span className={`text-xs font-medium ${esHoy ? 'text-caracas-red' : 'text-gray-500'}`}>
                    {dia.format('ddd')}
                  </span>
                  <span
                    className={`text-sm font-semibold mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${
                      esHoy ? 'bg-caracas-red text-white' : 'text-gray-800'
                    }`}
                  >
                    {dia.format('D')}
                  </span>
                </div>
              );
            })}
          </div>

          {slots.map((slot) => {
            const { titulo, subtitulo } = dividirNombreComida(NOMBRE_TIPO_COMIDA[slot.tipo]);
            return (
              <div key={slot.tipo} className="grid" style={{ gridTemplateColumns: '7rem repeat(7, 1fr)' }}>
                <div className="px-3 py-3 border-r border-gray-200 flex flex-col justify-start">
                  <span className="text-sm font-semibold text-gray-700 leading-tight">
                    {titulo}
                  </span>
                  {subtitulo && (
                    <span className="text-xs text-gray-400 leading-tight mt-0.5">
                      {subtitulo}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-gray-700 leading-tight mt-0.5">{formatTime12h(slot.hora_servicio)}</span>
                </div>

                {dias.map((dia) => {
                  const fecha = dia.format('YYYY-MM-DD');
                  const comida = mapa.get(`${fecha}|${slot.tipo}`) || null;

                  if (!comida) {
                    return (
                      <div key={fecha} className="border-t border-gray-100 p-1.5">
                        <button
                          onClick={() => onCellClick(fecha, slot.tipo, null)}
                          disabled={!puedeAgregar}
                          className={`w-full min-h-[120px] rounded-xl border-2 border-dashed text-xs font-medium flex items-center justify-center transition-colors ${
                            puedeAgregar
                              ? 'border-gray-200 text-gray-400 hover:border-caracas-red/40 hover:text-caracas-red hover:bg-caracas-red/5 cursor-pointer'
                              : 'border-gray-100 text-gray-300 cursor-default'
                          }`}
                        >
                          + Agregar
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div key={fecha} className="border-t border-gray-100 p-1.5">
                      <div
                        onClick={() => onCellClick(fecha, slot.tipo, comida)}
                        className={`relative w-full min-h-[120px] rounded-xl bg-caracas-red/5 border border-caracas-red/20 px-2.5 py-2 group transition-all ${
                          puedeModificar || puedeCrear
                            ? 'cursor-pointer hover:shadow-md hover:border-caracas-red/40'
                            : 'cursor-default'
                        }`}
                      >
                        {puedeEliminar && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(comida.id);
                            }}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Eliminar comida"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {comida.hora_servicio.slice(0, 5) !== slot.hora_servicio.slice(0, 5) && (
                          <span className="inline-block text-[11px] font-bold text-caracas-red mb-1 mr-6">
                            {formatTime12h(comida.hora_servicio)}
                          </span>
                        )}
                        <p className="text-[13px] font-semibold text-gray-800 leading-snug uppercase hyphens-auto break-words pr-6">
                          {comida.menu}
                        </p>
                        {comida.bebida && (
                          <p className="text-[13px] font-semibold text-gray-800 leading-snug uppercase hyphens-auto break-words pr-6 mt-1">
                            🥤 {comida.bebida}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{comida.raciones} raciones</p>
                        {comida.responsable && (
                          <p className="text-xs font-medium text-gray-600 truncate mt-0.5">{comida.responsable}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
