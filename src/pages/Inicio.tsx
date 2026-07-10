import { useState, useMemo } from 'react';
import { Users, BedDouble, Tent, Home, Baby, Heart, Sparkles, ShieldOff } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import CroquisViewer, { countElements } from '../components/constructor/CroquisViewer';

export default function Inicio() {
  const { campamentoSeleccionado, refugiados = [], familias = [] } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();

  const tieneAcceso = campamentoSeleccionado
    ? tienePermisoPorCampamento('Inicio', campamentoSeleccionado.id, 'Ver')
    : true;

  if (!tieneAcceso) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldOff size={64} className="mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">Sin acceso a este campamento</p>
        <p className="text-sm text-gray-400 mt-1">No tienes permisos para ver los datos de {campamentoSeleccionado?.nombre}</p>
      </div>
    );
  }

  const refugiadosDelCampamento = campamentoSeleccionado 
    ? refugiados.filter(r => r.campamento_id === campamentoSeleccionado.id)
    : [];
  
  const totalRefugiados = refugiadosDelCampamento.length;
  const totalHombres = refugiadosDelCampamento.filter(r => r.genero === true).length;
  const totalMujeres = refugiadosDelCampamento.filter(r => r.genero === false).length;
  
  const totalFamilias = campamentoSeleccionado
    ? familias.filter(f => f.campamento_id === campamentoSeleccionado.id).length
    : 0;

  const capacidad = campamentoSeleccionado?.capacidad_maxima || 0;
  const ocupadas = totalRefugiados;
  const disponibles = Math.max(0, capacidad - ocupadas);

  // Optimización: calcular las edades de los refugiados una sola vez usando useMemo
  const refugiadosConEdad = useMemo(() => {
    const hoy = new Date();
    return refugiadosDelCampamento.map(r => {
      const nacimiento = new Date(r.fecha_nacimiento);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
      return { ...r, edad };
    });
  }, [refugiadosDelCampamento]);

  // ── Nuevos indicadores demográficos ─────────────────────────────────────
  const ninos = refugiadosConEdad.filter(r => r.edad <= 12);
  const ninosH = ninos.filter(r => r.genero === true).length;
  const ninosM = ninos.filter(r => r.genero === false).length;

  const adolescentes = refugiadosConEdad.filter(r => r.edad > 12 && r.edad <= 17);
  const adolescentesH = adolescentes.filter(r => r.genero === true).length;
  const adolescentesM = adolescentes.filter(r => r.genero === false).length;

  const adultoMayor = refugiadosConEdad.filter(r => (r.genero === true && r.edad >= 60) || (r.genero === false && r.edad >= 55));
  const adultoMayorH = adultoMayor.filter(r => r.genero === true).length;
  const adultoMayorM = adultoMayor.filter(r => r.genero === false).length;

  // Calcular ranking de procedencias
  const procedenciasMap = new Map<string, number>();
  refugiadosDelCampamento.forEach(r => {
    const proc = r.procedencia?.trim() || 'SIN ESPECIFICAR';
    procedenciasMap.set(proc, (procedenciasMap.get(proc) || 0) + 1);
  });
  const procedenciasRanking = Array.from(procedenciasMap.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
  const maxProcedencia = procedenciasRanking.length > 0 ? procedenciasRanking[0].cantidad : 1;

  // Colores vibrantes para las barras
  const barColors = [
    '#10B981', '#6366F1', '#F59E0B', '#EF4444', '#06B6D4',
    '#8B5CF6', '#EC4899', '#84CC16', '#F97316', '#14B8A6',
    '#A855F7', '#3B82F6', '#E11D48', '#22C55E', '#EAB308'
  ];

  // Estado para tooltip
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Calcular offsets de numeración para encadenar números entre carpas
  const carpas = campamentoSeleccionado?.carpas || [];
  const tipoContabilizacion = campamentoSeleccionado?.tipo_contabilizacion || 'elemento';
  const carpasConOffset = carpas.map((carpa, index) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += countElements(carpas[i].croquis_data || '', tipoContabilizacion);
    }
    return { carpa, offset };
  });

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Visión General</h2>
        <p className="text-gray-500">
          Mostrando indicadores para: <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Refugiados */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-caracas-red/10 rounded-xl text-caracas-red shrink-0">
            <Users size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-gray-500 truncate">Total Refugiados</p>
            <p className="text-3xl font-bold text-gray-900">{totalRefugiados}</p>
            <p className="text-xs text-gray-400 mt-1">
              <span className="text-blue-600 font-medium">{totalHombres}</span> H · <span className="text-pink-600 font-medium">{totalMujeres}</span> M
            </p>
          </div>
        </div>

        {/* Total Familias */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-indigo-500/10 rounded-xl text-indigo-500 shrink-0">
            <Home size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-gray-500 truncate">Familias</p>
            <p className="text-3xl font-bold text-gray-900">{totalFamilias}</p>
            <p className="text-xs text-gray-400 mt-1 truncate">
              Grupos familiares
            </p>
          </div>
        </div>
        
        {/* Capacidad / Camas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-caracas-green/10 rounded-xl text-caracas-green shrink-0">
            <BedDouble size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-gray-500 truncate">Camas Disponibles</p>
            <p className="text-3xl font-bold text-gray-900">{disponibles}</p>
            <p className="text-xs text-gray-400 mt-1">
              <span className="text-caracas-red font-medium">{ocupadas}</span> Ocupadas / {capacidad} Totales
            </p>
          </div>
        </div>

        {/* Carpas Activas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-caracas-blue/10 rounded-xl text-caracas-blue shrink-0">
            <Tent size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-gray-500 truncate">Carpas Activas</p>
            <p className="text-3xl font-bold text-gray-900">{campamentoSeleccionado?.carpas?.length || 0}</p>
            <p className="text-xs text-gray-400 mt-1 truncate">
              Instaladas
            </p>
          </div>
        </div>
      </div>

      {/* Indicadores Demográficos Detallados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Niños (0-12) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-100 rounded-xl text-orange-500">
              <Baby size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Niños</p>
              <p className="text-2xl font-bold text-gray-900">{ninos.length}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            0 a 12 años · <span className="text-blue-600 font-medium">{ninosH} H</span> · <span className="text-pink-600 font-medium">{ninosM} M</span>
          </p>
        </div>

        {/* Adolescentes (13-17) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-yellow-100 rounded-xl text-yellow-600">
              <Sparkles size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Adolescentes</p>
              <p className="text-2xl font-bold text-gray-900">{adolescentes.length}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            13 a 17 años · <span className="text-blue-600 font-medium">{adolescentesH} H</span> · <span className="text-pink-600 font-medium">{adolescentesM} M</span>
          </p>
        </div>

        {/* Adulto Mayor */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-rose-100 rounded-xl text-rose-500">
              <Heart size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Adulto Mayor</p>
              <p className="text-2xl font-bold text-gray-900">{adultoMayor.length}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            H &ge;60 / M &ge;55 · <span className="text-blue-600 font-medium">{adultoMayorH} H</span> · <span className="text-pink-600 font-medium">{adultoMayorM} M</span>
          </p>
        </div>
      </div>
      
      {/* Ranking de Procedencias */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Ranking de Procedencias</h2>
        </div>

        {procedenciasRanking.length > 0 ? (
          <div className="space-y-3">
            {procedenciasRanking.map((proc, index) => {
              const pct = (proc.cantidad / maxProcedencia) * 100;
              const color = barColors[index % barColors.length];
              return (
                <div
                  key={proc.nombre}
                  className={`flex items-center gap-3 group relative ${hoveredBar === index ? 'z-50' : 'z-0'}`}
                  onMouseEnter={() => setHoveredBar(index)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <p className="text-xs font-semibold text-gray-500 text-right w-36 shrink-0 truncate uppercase" title={proc.nombre}>
                    {proc.nombre}
                  </p>
                  <div className="flex-1 h-7 bg-gray-50 rounded-md relative">
                    <div
                      className="h-full rounded-md transition-all duration-500 ease-out"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                        minWidth: '24px',
                        opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.4
                      }}
                    />
                    {/* Tooltip */}
                    {hoveredBar === index && (
                      <div className="absolute left-1/2 -translate-x-1/2 -top-14 bg-white border border-gray-200 shadow-xl rounded-lg px-4 py-2 z-50 whitespace-nowrap pointer-events-none">
                        <p className="text-xs font-bold text-gray-700">{proc.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {proc.nombre}: <span className="font-bold text-gray-800">{proc.cantidad}</span> personas <span className="text-gray-400 font-medium">({((proc.cantidad / totalRefugiados) * 100).toFixed(1)}%)</span>
                        </p>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45 -mt-1"></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400">
            <p className="font-medium">No hay refugiados registrados para mostrar procedencias.</p>
          </div>
        )}
      </div>

      {/* Distribución del Campamento — Croquis por Carpa */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">
          Distribución del Campamento ({campamentoSeleccionado?.nombre || 'Ninguno'})
        </h2>

        {carpasConOffset.length > 0 ? (
          <div className="space-y-8">
            {carpasConOffset.map(({ carpa, offset }) => (
              <CroquisViewer
                key={carpa.id}
                croquisData={carpa.croquis_data || '{}'}
                carpaNombre={carpa.nombre}
                elementNumberOffset={offset}
                width={1100}
                height={500}
                tipoContabilizacion={tipoContabilizacion}
              />
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl h-72 flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors">
            <Tent size={48} className="mb-4 opacity-50" />
            <p className="font-medium text-gray-500">No hay carpas configuradas para este campamento.</p>
            <p className="text-sm text-gray-400 mt-1">Ve al módulo Constructor para crear un refugio con carpas y croquis.</p>
          </div>
        )}
      </div>
    </div>
  );
}
