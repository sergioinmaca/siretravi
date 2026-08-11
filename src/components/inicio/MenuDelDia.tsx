import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from '../../lib/dayjs';
import { fetchMenu, dividirNombreComida } from '../../lib/cocina';
import { NOMBRE_TIPO_COMIDA, TIPOS_COMIDA } from '../../types';
import type { ComidaMenu } from '../../types';
import { formatTime12h } from '../../lib/formatTime';

interface MenuDelDiaProps {
  campamentoId?: string;
}

export default function MenuDelDia({ campamentoId }: MenuDelDiaProps) {
  const navigate = useNavigate();
  const [comidas, setComidas] = useState<ComidaMenu[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campamentoId) {
      setComidas([]);
      return;
    }
    const hoy = dayjs().tz('America/Caracas').format('YYYY-MM-DD');
    setLoading(true);
    fetchMenu(campamentoId, hoy, hoy)
      .then((data) => {
        const orden = new Map(TIPOS_COMIDA.map((t, i) => [t, i]));
        setComidas([...data].sort((a, b) => (orden.get(a.tipo) ?? 99) - (orden.get(b.tipo) ?? 99)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [campamentoId]);

  if (loading || comidas.length === 0) return null;

  const hoyDisplay = dayjs().tz('America/Caracas').format('DD/MM/YYYY');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.05),0_0_0_0_rgba(0,0,0,0),-5px_5px_0_0_#bc2f4a] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),-5px_5px_0_0_#bc2f4a] transition-shadow transition-colors max-md:bg-transparent max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:-mx-4">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-6 bg-caracas-red rounded-full"></div>
        <h2 className="text-sm font-bold text-black uppercase tracking-wider">Menú de Hoy</h2>
        <span className="text-sm font-medium text-gray-500">{hoyDisplay}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {comidas.map((c) => {
          const { titulo, subtitulo } = dividirNombreComida(NOMBRE_TIPO_COMIDA[c.tipo]);
          return (
            <div
              key={c.id}
              onClick={() => navigate('/cocina')}
              className="rounded-xl bg-caracas-red/5 border border-caracas-red/20 p-3 cursor-pointer hover:shadow-md hover:border-caracas-red/40 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-700 leading-tight">{titulo}</p>
                  {subtitulo && (
                    <p className="text-xs text-gray-400 leading-tight mt-0.5">{subtitulo}</p>
                  )}
                </div>
                <span className="text-[11px] font-bold text-caracas-red shrink-0">
                  {formatTime12h(c.hora_servicio)}
                </span>
              </div>

              <p className="text-[13px] font-semibold text-gray-800 leading-snug uppercase hyphens-auto break-words mt-2">
                {c.menu}
              </p>
              {c.bebida && (
                <p className="text-[13px] font-semibold text-gray-800 leading-snug uppercase hyphens-auto break-words mt-1">
                  🥤 {c.bebida}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">{c.raciones} raciones</p>
              {c.responsable && (
                <p className="text-xs font-medium text-gray-600 truncate mt-0.5">{c.responsable}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
