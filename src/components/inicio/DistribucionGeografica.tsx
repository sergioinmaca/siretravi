import { useMemo, useState } from 'react';
import type { Refugiado } from '../../types';

const DONA_RADIUS = 70;
const DONA_CIRCUMFERENCE = 2 * Math.PI * DONA_RADIUS;

const COLORES_FIJOS: Record<string, string> = {
  'DISTRITO CAPITAL': '#FF5F48',
  'LA GUAIRA': '#73BAFF',
  'MIRANDA': '#FFC44F',
};

const COLORES_ESTADO_CLAROS: Record<string, string> = {
  'DISTRITO CAPITAL': '#FF8F7F',
  'LA GUAIRA': '#9DCFFF',
  'MIRANDA': '#FFD684',
};

const COLORES_MUNICIPIO_POR_ESTADO: Record<string, string> = {
  'DISTRITO CAPITAL': '#ffbfb6',
  'LA GUAIRA': '#c7e3ff',
  'MIRANDA': '#ffe7b9',
};

const COLORES_EXTRA = ['#bc2f4a', '#6366f1', '#ec4899', '#f59e0b', '#14b8a6', '#a855f7', '#ef4444'];
const COLOR_SIN_ESPECIFICAR = '#9CA3AF';
const SIN_ESPECIFICAR_ESTADO = 'SIN ESPECIFICAR';
const SIN_ESPECIFICAR_FILA = 'Sin especificar';

interface ConteoNombre {
  nombre: string;
  cantidad: number;
}

interface FilaTabla {
  nombre: string;
  familias: number;
  personas: number;
  datosPersonas: Refugiado[];
  datosJefes: Refugiado[];
}

interface GrupoAgrupado {
  titulo: string;
  items: FilaTabla[];
  subtotalFamilias: number;
  subtotalPersonas: number;
  datosPersonas: Refugiado[];
  datosJefes: Refugiado[];
}

type TipoApertura = 'grupo' | 'familias' | 'personas';

interface DistribucionGeograficaProps {
  refugiadosActivos: Refugiado[];
  onAbrirLista: (titulo: string, datos: Refugiado[]) => void;
}

function ordenAlfabeticoConUltimo(a: string, b: string, ultimo: string): number {
  const esA = a === ultimo;
  const esB = b === ultimo;
  if (esA && esB) return 0;
  if (esA) return 1;
  if (esB) return -1;
  return a.localeCompare(b);
}

function donutSlicePath(pct: number, offsetIn: number): string {
  const dashLen = pct * DONA_CIRCUMFERENCE;
  const angleStart = (offsetIn / DONA_CIRCUMFERENCE) * 2 * Math.PI;
  const angleEnd = ((offsetIn + dashLen) / DONA_CIRCUMFERENCE) * 2 * Math.PI;
  const cx = 100, cy = 100;
  const rOuter = DONA_RADIUS + 14;
  const rInner = DONA_RADIUS - 14;
  const x1o = cx + rOuter * Math.cos(angleStart);
  const y1o = cy + rOuter * Math.sin(angleStart);
  const x2o = cx + rOuter * Math.cos(angleEnd);
  const y2o = cy + rOuter * Math.sin(angleEnd);
  const x2i = cx + rInner * Math.cos(angleEnd);
  const y2i = cy + rInner * Math.sin(angleEnd);
  const x1i = cx + rInner * Math.cos(angleStart);
  const y1i = cy + rInner * Math.sin(angleStart);
  const largeArc = pct > 0.5 ? 1 : 0;
  return `M ${x1o} ${y1o} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x1i} ${y1i} Z`;
}

function buildSectores(datos: ConteoNombre[], total: number) {
  let offset = 0;
  return datos.map(c => {
    const pct = total > 0 ? c.cantidad / total : 0;
    const dash = pct * DONA_CIRCUMFERENCE;
    const sector = { ...c, pct, dash, offset };
    offset += dash;
    return sector;
  });
}

function DonutChart({
  datos,
  total,
  colores,
  centroLabel,
  onSectorClick,
}: {
  datos: ConteoNombre[];
  total: number;
  colores: Record<string, string>;
  centroLabel: string;
  onSectorClick?: (nombre: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const sectores = buildSectores(datos, total);
  const clickeable = !!onSectorClick;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90" onMouseLeave={() => setHovered(null)}>
          <circle cx="100" cy="100" r={DONA_RADIUS + 14} fill="none" stroke="#F3F4F6" strokeWidth="28" />
          <circle cx="100" cy="100" r={DONA_RADIUS - 14} fill="#fff" />
          {sectores.map(s => (
            <path
              key={s.nombre}
              d={donutSlicePath(s.pct, s.offset)}
              fill={colores[s.nombre] || COLOR_SIN_ESPECIFICAR}
              opacity={!clickeable || hovered === null || hovered === s.nombre ? 1 : 0.4}
              style={{ cursor: clickeable ? 'pointer' : 'default', transition: 'opacity 0.2s ease' }}
              onMouseEnter={clickeable ? () => setHovered(s.nombre) : undefined}
              onClick={clickeable ? () => onSectorClick(s.nombre) : undefined}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: 'none' }}>
          <span className="text-2xl font-bold text-gray-800">{total}</span>
          <span className="text-xs text-black text-center leading-tight -mt-1">{centroLabel}</span>
        </div>
      </div>
      {/* Leyenda debajo del donut */}
      <div className="w-full space-y-2">
        {datos.map(c => (
          <div
            key={c.nombre}
            onClick={clickeable ? () => onSectorClick(c.nombre) : undefined}
            className={`flex items-center gap-2 text-sm ${clickeable ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
          >
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colores[c.nombre] || COLOR_SIN_ESPECIFICAR }} />
            <span className="text-gray-600 flex-1 truncate" title={c.nombre}>{c.nombre}</span>
            <span className="font-semibold text-gray-800 tabular-nums shrink-0">{c.cantidad}</span>
            <span className="text-gray-400 tabular-nums shrink-0">({total > 0 ? ((c.cantidad / total) * 100).toFixed(1) : '0.0'}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Columna de tabla: título + encabezados #F / #P + grupos anidados */
function ColumnaTabla({ titulo, grupos, colorIndicador, onAbrir, coloresGrupos }: {
  titulo: string;
  grupos: GrupoAgrupado[];
  colorIndicador: string;
  onAbrir?: (grupo: GrupoAgrupado, item: FilaTabla | null, tipo: TipoApertura) => void;
  coloresGrupos?: Record<string, string>;
}) {
  const clickeable = !!onAbrir;
  return (
    <div className="flex flex-col min-w-0">
      {/* Título de la columna */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 rounded-full" style={{ backgroundColor: colorIndicador }} />
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">{titulo}</h3>
      </div>

      {/* Encabezado de la tabla */}
      <div className="grid grid-cols-[minmax(0,1fr)_72px_72px] gap-x-3 pb-1.5 border-b border-gray-200 mb-1">
        <span />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Familias</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Personas</span>
      </div>

      {/* Grupos */}
      <div className="space-y-2">
        {grupos.map(g => (
          <div key={g.titulo}>
            {/* Fila cabecera del grupo */}
            <div
              className="grid grid-cols-[minmax(0,1fr)_72px_72px] gap-x-3 items-center px-1.5 py-2 rounded border border-gray-100"
              style={{ backgroundColor: coloresGrupos?.[g.titulo] ?? '#F9FAFB' }}
            >
              <span
                className={`text-xs font-bold text-gray-700 uppercase truncate ${clickeable ? 'cursor-pointer hover:text-caracas-red transition-colors' : ''}`}
                title={g.titulo}
                onClick={clickeable ? () => onAbrir(g, null, 'grupo') : undefined}
              >
                {g.titulo}
              </span>
              <span
                className={`text-xs font-semibold text-gray-800 text-right tabular-nums ${clickeable ? 'cursor-pointer hover:text-caracas-red transition-colors' : ''}`}
                title={clickeable ? 'Ver familias' : undefined}
                onClick={clickeable ? () => onAbrir(g, null, 'familias') : undefined}
              >
                {g.subtotalFamilias}
              </span>
              <span
                className={`text-xs font-semibold text-gray-800 text-right tabular-nums ${clickeable ? 'cursor-pointer hover:text-caracas-red transition-colors' : ''}`}
                title={clickeable ? 'Ver personas' : undefined}
                onClick={clickeable ? () => onAbrir(g, null, 'personas') : undefined}
              >
                {g.subtotalPersonas}
              </span>
            </div>
            {/* Filas hijas */}
            {g.items.map(item => (
              <div key={item.nombre} className="grid grid-cols-[minmax(0,1fr)_72px_72px] gap-x-3 items-center px-1.5 py-1.5 border-b border-gray-50">
                <span
                  className={`flex items-center gap-1.5 text-sm text-gray-700 min-w-0 ${clickeable ? 'cursor-pointer hover:text-gray-800 transition-colors' : ''}`}
                  onClick={clickeable ? () => onAbrir(g, item, 'personas') : undefined}
                >
                  <span className="text-gray-600 shrink-0">•</span>
                  <span className="truncate" title={item.nombre}>{item.nombre}</span>
                </span>
                <span
                  className={`text-sm text-gray-700 text-right tabular-nums ${clickeable ? 'cursor-pointer hover:text-caracas-red transition-colors' : ''}`}
                  title={clickeable ? 'Ver familias' : undefined}
                  onClick={clickeable ? () => onAbrir(g, item, 'familias') : undefined}
                >
                  {item.familias}
                </span>
                <span
                  className={`text-sm text-gray-700 text-right tabular-nums ${clickeable ? 'cursor-pointer hover:text-caracas-red transition-colors' : ''}`}
                  title={clickeable ? 'Ver personas' : undefined}
                  onClick={clickeable ? () => onAbrir(g, item, 'personas') : undefined}
                >
                  {item.personas}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DistribucionGeografica({ refugiadosActivos, onAbrirLista }: DistribucionGeograficaProps) {
  const jefesActivos = useMemo(
    () => refugiadosActivos.filter(r => r.es_jefe_familia === true),
    [refugiadosActivos]
  );

  const personasPorEstado = useMemo(() => {
    const map = new Map<string, Refugiado[]>();
    refugiadosActivos.forEach(r => {
      const key = r.estado?.trim() || SIN_ESPECIFICAR_ESTADO;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [refugiadosActivos]);

  const jefesPorEstado = useMemo(() => {
    const map = new Map<string, Refugiado[]>();
    jefesActivos.forEach(j => {
      const key = j.estado?.trim() || SIN_ESPECIFICAR_ESTADO;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(j);
    });
    return map;
  }, [jefesActivos]);

  const personasEstado = useMemo(() => {
    const map = new Map<string, number>();
    refugiadosActivos.forEach(r => {
      const key = r.estado?.trim() || SIN_ESPECIFICAR_ESTADO;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => ordenAlfabeticoConUltimo(a.nombre, b.nombre, SIN_ESPECIFICAR_ESTADO));
  }, [refugiadosActivos]);

  const familiasEstado = useMemo(() => {
    const map = new Map<string, number>();
    jefesActivos.forEach(j => {
      const key = j.estado?.trim() || SIN_ESPECIFICAR_ESTADO;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => ordenAlfabeticoConUltimo(a.nombre, b.nombre, SIN_ESPECIFICAR_ESTADO));
  }, [jefesActivos]);

  const totalPersonas = refugiadosActivos.length;
  const totalFamilias = jefesActivos.length;

  const coloresEstado = useMemo(() => {
    const map: Record<string, string> = {};
    const nombres = Array.from(new Set([...personasEstado, ...familiasEstado].map(e => e.nombre)))
      .sort((a, b) => ordenAlfabeticoConUltimo(a, b, SIN_ESPECIFICAR_ESTADO));
    let extra = 0;
    nombres.forEach(nombre => {
      if (nombre === SIN_ESPECIFICAR_ESTADO) {
        map[nombre] = COLOR_SIN_ESPECIFICAR;
        return;
      }
      map[nombre] = COLORES_FIJOS[nombre] || COLORES_EXTRA[extra++ % COLORES_EXTRA.length];
    });
    return map;
  }, [personasEstado, familiasEstado]);

  const gruposMunicipios = useMemo(() => {
    const estados = new Map<string, Map<string, { familias: number; personas: number; datosPersonas: Refugiado[]; datosJefes: Refugiado[] }>>();
    refugiadosActivos.forEach(r => {
      const estado = r.estado?.trim();
      if (!estado) return;
      const municipio = r.municipio?.trim() || SIN_ESPECIFICAR_FILA;
      if (!estados.has(estado)) estados.set(estado, new Map());
      const m = estados.get(estado)!;
      if (!m.has(municipio)) m.set(municipio, { familias: 0, personas: 0, datosPersonas: [], datosJefes: [] });
      const entry = m.get(municipio)!;
      entry.personas++;
      entry.datosPersonas.push(r);
    });
    jefesActivos.forEach(j => {
      const estado = j.estado?.trim();
      if (!estado) return;
      const municipio = j.municipio?.trim() || SIN_ESPECIFICAR_FILA;
      const m = estados.get(estado);
      if (m && m.has(municipio)) {
        const entry = m.get(municipio)!;
        entry.familias++;
        entry.datosJefes.push(j);
      }
    });
    return Array.from(estados.entries())
      .map(([estado, mapa]) => {
        const items = Array.from(mapa.entries())
          .map(([nombre, c]) => ({
            nombre,
            familias: c.familias,
            personas: c.personas,
            datosPersonas: c.datosPersonas,
            datosJefes: c.datosJefes,
          }))
          .sort((a, b) => ordenAlfabeticoConUltimo(a.nombre, b.nombre, SIN_ESPECIFICAR_FILA));
        return {
          titulo: estado,
          items,
          subtotalFamilias: items.reduce((s, i) => s + i.familias, 0),
          subtotalPersonas: items.reduce((s, i) => s + i.personas, 0),
          datosPersonas: items.flatMap(i => i.datosPersonas),
          datosJefes: items.flatMap(i => i.datosJefes),
        };
      })
      .sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [refugiadosActivos, jefesActivos]);

  const gruposParroquias = useMemo(() => {
    const municipios = new Map<string, Map<string, { familias: number; personas: number; datosPersonas: Refugiado[]; datosJefes: Refugiado[] }>>();
    const estadoPorMunicipio = new Map<string, string>();
    refugiadosActivos.forEach(r => {
      const municipio = r.municipio?.trim();
      if (!municipio) return;
      const estado = r.estado?.trim();
      if (estado && !estadoPorMunicipio.has(municipio)) estadoPorMunicipio.set(municipio, estado);
      const parroquia = r.parroquia?.trim() || SIN_ESPECIFICAR_FILA;
      if (!municipios.has(municipio)) municipios.set(municipio, new Map());
      const m = municipios.get(municipio)!;
      if (!m.has(parroquia)) m.set(parroquia, { familias: 0, personas: 0, datosPersonas: [], datosJefes: [] });
      const entry = m.get(parroquia)!;
      entry.personas++;
      entry.datosPersonas.push(r);
    });
    jefesActivos.forEach(j => {
      const municipio = j.municipio?.trim();
      if (!municipio) return;
      const parroquia = j.parroquia?.trim() || SIN_ESPECIFICAR_FILA;
      const m = municipios.get(municipio);
      if (m && m.has(parroquia)) {
        const entry = m.get(parroquia)!;
        entry.familias++;
        entry.datosJefes.push(j);
      }
    });
    const ordenEstados = new Map<string, number>();
    gruposMunicipios.forEach((g, i) => ordenEstados.set(g.titulo, i));
    return Array.from(municipios.entries())
      .map(([municipio, mapa]) => {
        const items = Array.from(mapa.entries())
          .map(([nombre, c]) => ({
            nombre,
            familias: c.familias,
            personas: c.personas,
            datosPersonas: c.datosPersonas,
            datosJefes: c.datosJefes,
          }))
          .sort((a, b) => ordenAlfabeticoConUltimo(a.nombre, b.nombre, SIN_ESPECIFICAR_FILA));
        return {
          titulo: municipio,
          items,
          subtotalFamilias: items.reduce((s, i) => s + i.familias, 0),
          subtotalPersonas: items.reduce((s, i) => s + i.personas, 0),
          datosPersonas: items.flatMap(i => i.datosPersonas),
          datosJefes: items.flatMap(i => i.datosJefes),
        };
      })
      .sort((a, b) => {
        const iA = ordenEstados.get(estadoPorMunicipio.get(a.titulo) ?? '') ?? Number.MAX_SAFE_INTEGER;
        const iB = ordenEstados.get(estadoPorMunicipio.get(b.titulo) ?? '') ?? Number.MAX_SAFE_INTEGER;
        if (iA !== iB) return iA - iB;
        return a.titulo.localeCompare(b.titulo);
      });
  }, [refugiadosActivos, jefesActivos, gruposMunicipios]);

  const coloresEstadoClaro = useMemo(() => {
    const map: Record<string, string> = {};
    refugiadosActivos.forEach(r => {
      const estado = r.estado?.trim();
      if (!estado) return;
      const color = COLORES_ESTADO_CLAROS[estado.toUpperCase()];
      if (color && !(estado in map)) map[estado] = color;
    });
    return map;
  }, [refugiadosActivos]);

  const coloresMunicipio = useMemo(() => {
    const map: Record<string, string> = {};
    refugiadosActivos.forEach(r => {
      const estado = r.estado?.trim().toUpperCase();
      const municipio = r.municipio?.trim();
      if (!estado || !municipio) return;
      const color = COLORES_MUNICIPIO_POR_ESTADO[estado];
      if (color && !(municipio in map)) map[municipio] = color;
    });
    return map;
  }, [refugiadosActivos]);

  const abrirEstado = (tipo: 'familias' | 'personas', nombre: string) => {
    if (tipo === 'familias') {
      onAbrirLista(`Estado: ${nombre} (Familias)`, jefesPorEstado.get(nombre) || []);
    } else {
      onAbrirLista(`Estado: ${nombre}`, personasPorEstado.get(nombre) || []);
    }
  };

  const abrirMunicipioColumna = (grupo: GrupoAgrupado, item: FilaTabla | null, tipo: TipoApertura) => {
    if (tipo === 'grupo') {
      onAbrirLista(`Estado: ${grupo.titulo}`, grupo.datosPersonas);
    } else if (item) {
      if (tipo === 'familias') onAbrirLista(`Familias — Municipio: ${item.nombre}`, item.datosJefes);
      else onAbrirLista(`Municipio: ${item.nombre}`, item.datosPersonas);
    }
  };

  const abrirParroquiaColumna = (grupo: GrupoAgrupado, item: FilaTabla | null, tipo: TipoApertura) => {
    if (tipo === 'grupo') {
      onAbrirLista(`Municipio: ${grupo.titulo}`, grupo.datosPersonas);
    } else if (item) {
      if (tipo === 'familias') onAbrirLista(`Familias — Parroquia: ${item.nombre}`, item.datosJefes);
      else onAbrirLista(`Parroquia: ${item.nombre}`, item.datosPersonas);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-md:bg-transparent max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:-mx-4">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-6 bg-caracas-blue rounded-full" />
        <h2 className="text-sm font-bold text-black uppercase tracking-wider">Distribución Geográfica</h2>
      </div>

      {refugiadosActivos.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="font-medium">No hay integrantes activos para mostrar la distribución geográfica.</p>
        </div>
      ) : (
        /* Layout de 3 columnas: Estado | Municipio | Parroquia */
        <div className="grid grid-cols-[auto_1px_1fr_1px_1fr] gap-x-6 items-start max-lg:grid-cols-1 max-lg:gap-y-8">

          {/* ── Columna 1: Estado (donuts) ── */}
          <div className="w-[300px] max-lg:w-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-caracas-red rounded-full" />
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Estado</h3>
            </div>
            <div className="space-y-10">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Familias</p>
                {familiasEstado.length > 0 ? (
                  <DonutChart
                    datos={familiasEstado}
                    total={totalFamilias}
                    colores={coloresEstado}
                    centroLabel="Familias"
                    onSectorClick={(nombre) => abrirEstado('familias', nombre)}
                  />
                ) : (
                  <p className="text-xs text-gray-400">Sin datos</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personas</p>
                {personasEstado.length > 0 ? (
                  <DonutChart
                    datos={personasEstado}
                    total={totalPersonas}
                    colores={coloresEstado}
                    centroLabel="Personas"
                    onSectorClick={(nombre) => abrirEstado('personas', nombre)}
                  />
                ) : (
                  <p className="text-xs text-gray-400">Sin datos</p>
                )}
              </div>
            </div>
          </div>

          {/* Divisor vertical 1 */}
          <div className="self-stretch bg-gray-200 max-lg:hidden" />

          {/* ── Columna 2: Municipios ── */}
          <div className="min-w-0">
            {gruposMunicipios.length > 0 ? (
              <ColumnaTabla titulo="Municipio" grupos={gruposMunicipios} colorIndicador="#0033A0" onAbrir={abrirMunicipioColumna} coloresGrupos={coloresEstadoClaro} />
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full bg-caracas-blue" />
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Municipio</h3>
                </div>
                <p className="text-xs text-gray-400">No hay municipios con integrantes activos.</p>
              </>
            )}
          </div>

          {/* Divisor vertical 2 */}
          <div className="self-stretch bg-gray-200 max-lg:hidden" />

          {/* ── Columna 3: Parroquias ── */}
          <div className="min-w-0">
            {gruposParroquias.length > 0 ? (
              <ColumnaTabla titulo="Parroquia" grupos={gruposParroquias} colorIndicador="#d97706" onAbrir={abrirParroquiaColumna} coloresGrupos={coloresMunicipio} />
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Parroquia</h3>
                </div>
                <p className="text-xs text-gray-400">No hay parroquias con integrantes activos.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
