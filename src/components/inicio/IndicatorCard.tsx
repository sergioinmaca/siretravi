import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Refugiado } from '../../types';
import { esRetirado } from '../../lib/retiredFilter';

interface Zona {
  etiqueta: string;
  valor: number;
  m?: number;
  f?: number;
  onClick?: () => void;
}

interface IndicatorCardProps {
  titulo: string;
  icono: ReactNode;
  color: string;
  grupo?: Refugiado[];
  esFamilia?: boolean;
  camas?: { total: number; ocupadas: number; disponibles: number };
  onAbrirLista?: (titulo: string, datos: Refugiado[]) => void;
}

interface Desglose {
  total: number;
  totalM: number;
  totalF: number;
  presentes: number;
  presentesM: number;
  presentesF: number;
  hogar: number;
  hogarM: number;
  hogarF: number;
  datosTotal: Refugiado[];
  datosPresentes: Refugiado[];
  datosHogar: Refugiado[];
}

function estatusDe(r: Refugiado): string {
  return ((r.hogar_solidario || '').trim().toUpperCase() || 'PRESENTE');
}

function desglosar(grupo: Refugiado[], esFamilia: boolean): Desglose {
  const activos = grupo.filter(r => !esRetirado(r));
  const presentes = activos.filter(r => estatusDe(r) === 'PRESENTE');
  const hogar = activos.filter(r => estatusDe(r) === 'HOGAR SOLIDARIO');

  if (esFamilia) {
    const unicos = (arr: Refugiado[]) =>
      new Set(arr.filter(r => r.familia_id).map(r => r.familia_id)).size;
    return {
      total: unicos(activos), totalM: 0, totalF: 0,
      presentes: unicos(presentes), presentesM: 0, presentesF: 0,
      hogar: unicos(hogar), hogarM: 0, hogarF: 0,
      datosTotal: activos, datosPresentes: presentes, datosHogar: hogar,
    };
  }

  const m = (arr: Refugiado[]) => arr.filter(r => r.genero === true).length;
  const f = (arr: Refugiado[]) => arr.filter(r => r.genero === false).length;
  return {
    total: activos.length, totalM: m(activos), totalF: f(activos),
    presentes: presentes.length, presentesM: m(presentes), presentesF: f(presentes),
    hogar: hogar.length, hogarM: m(hogar), hogarF: f(hogar),
    datosTotal: activos, datosPresentes: presentes, datosHogar: hogar,
  };
}

export default function IndicatorCard({
  titulo,
  icono,
  color,
  grupo = [],
  esFamilia = false,
  camas,
  onAbrirLista,
}: IndicatorCardProps) {
  const [hover, setHover] = useState(false);

  const zonas: { izq: Zona; sup: Zona; inf: Zona } = camas
    ? {
        izq: { etiqueta: 'Total', valor: camas.total },
        sup: { etiqueta: 'Ocupadas', valor: camas.ocupadas },
        inf: { etiqueta: 'Camas Disponibles', valor: camas.disponibles },
      }
    : (() => {
        const d = desglosar(grupo, esFamilia);
        const mostrarMF = !esFamilia;
        const click = (tituloZona: string, datos: Refugiado[]) =>
          datos.length > 0 && onAbrirLista
            ? () => onAbrirLista(tituloZona, datos)
            : undefined;
        return {
          izq: {
            etiqueta: 'Total',
            valor: d.total,
            m: mostrarMF ? d.totalM : undefined,
            f: mostrarMF ? d.totalF : undefined,
            onClick: click(titulo, d.datosTotal),
          },
          sup: {
            etiqueta: 'Presentes',
            valor: d.presentes,
            m: mostrarMF ? d.presentesM : undefined,
            f: mostrarMF ? d.presentesF : undefined,
            onClick: click('Presentes', d.datosPresentes),
          },
          inf: {
            etiqueta: 'Hogar solidario',
            valor: d.hogar,
            m: mostrarMF ? d.hogarM : undefined,
            f: mostrarMF ? d.hogarF : undefined,
            onClick: click('Hogar solidario', d.datosHogar),
          },
        };
      })();

  const baseShadow = `0 1px 2px 0 rgba(0,0,0,0.05), 0 0 0 0 rgba(0,0,0,0), -5px 5px 0 0 ${color}`;
  const hoverShadow = `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1), -5px 5px 0 0 ${color}`;

  const clickClase = (onClick?: () => void) =>
    onClick ? ' cursor-pointer hover:bg-gray-50' : '';

  const desgloseMF = (mVal: number, fVal: number) => (
    <p className="text-xs text-gray-400 mt-1">
      <span className="text-blue-600 font-medium">{mVal}</span> M ·{' '}
      <span className="text-pink-600 font-medium">{fVal}</span> F
    </p>
  );

  const mostrarMF = (z: Zona) => z.m !== undefined && z.f !== undefined;

  return (
    <div
      className="hidden md:flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden transition-shadow"
      style={{ boxShadow: hover ? hoverShadow : baseShadow }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Zona 1: Título */}
      <div className="flex items-center gap-3 px-6 pt-3 pb-2">
        <div
          className="p-3 rounded-xl shrink-0"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          {icono}
        </div>
        <span className="text-xl font-semibold text-gray-800">{titulo}</span>
      </div>

      <div className="border-t border-dashed border-gray-400" />

      {/* Zonas 2, 3 y 4 */}
      <div className="flex flex-1">
        {/* Zona 2 (izquierda) */}
        <div
          className={`w-[45%] px-6 py-3 transition-colors flex flex-col items-center justify-center${clickClase(zonas.izq.onClick)}`}
          onClick={zonas.izq.onClick}
        >
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{zonas.izq.etiqueta}</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{zonas.izq.valor}</p>
          {mostrarMF(zonas.izq) && desgloseMF(zonas.izq.m!, zonas.izq.f!)}
        </div>

        <div className="flex-1 border-l border-dashed border-gray-400 flex flex-col min-w-0">
          {/* Zona 3 (derecha arriba) */}
          <div
            className={`px-6 py-3 transition-colors${clickClase(zonas.sup.onClick)}`}
            onClick={zonas.sup.onClick}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{zonas.sup.valor}</span>
              <span className="text-sm font-medium text-gray-500">{zonas.sup.etiqueta}</span>
            </div>
            {mostrarMF(zonas.sup) && desgloseMF(zonas.sup.m!, zonas.sup.f!)}
          </div>

          <div className="border-t border-dashed border-gray-400" />

          {/* Zona 4 (derecha abajo) */}
          <div
            className={`px-6 py-3 transition-colors${clickClase(zonas.inf.onClick)}`}
            onClick={zonas.inf.onClick}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{zonas.inf.valor}</span>
              <span className="text-sm font-medium text-gray-500">{zonas.inf.etiqueta}</span>
            </div>
            {mostrarMF(zonas.inf) && desgloseMF(zonas.inf.m!, zonas.inf.f!)}
          </div>
        </div>
      </div>
    </div>
  );
}
