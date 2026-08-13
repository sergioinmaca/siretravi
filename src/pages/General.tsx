import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Home, Baby, Heart, Sparkles, ShieldOff, Milk, UserCheck, HeartPulse, Accessibility, AlertTriangle, Landmark, MapPin } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import ListaIntegrantesModal from '../components/ui/ListaIntegrantesModal';
import FichaRefugiadoModal from '../components/refugiados/FichaRefugiadoModal';
import DistribucionGeografica from '../components/inicio/DistribucionGeografica';
import IndicatorCard from '../components/inicio/IndicatorCard';

export default function General() {
  const { campamentos = [], refugiados = [], familias = [] } = useCampamento();
  const { tienePermiso } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Modal state para cards/charts clickeables
  const [listaModalOpen, setListaModalOpen] = useState(false);
  const [listaTitulo, setListaTitulo] = useState('');
  const [listaDatos, setListaDatos] = useState<any[]>([]);
  const [listaFamilias, setListaFamilias] = useState<any[]>([]);
  const [fichaDesdeDashboard, setFichaDesdeDashboard] = useState<any>(null);
  const [fichaModalOpen, setFichaModalOpen] = useState(false);

  const tieneAcceso = tienePermiso('General', 'Ver');

  const campamentosIncluidos = useMemo(
    () => campamentos.filter(c => c.incluir_en_general !== false),
    [campamentos]
  );

  const refugiadosDelConjunto = useMemo(() => {
    const ids = new Set(campamentosIncluidos.map(c => c.id));
    return refugiados.filter(r => ids.has(r.campamento_id));
  }, [refugiados, campamentosIncluidos]);

  const familiasIncluidas = useMemo(() => {
    const ids = new Set(campamentosIncluidos.map(c => c.id));
    return familias.filter(f => ids.has(f.campamento_id));
  }, [familias, campamentosIncluidos]);

  const refugiadosActivos = useMemo(
    () => refugiadosDelConjunto.filter(r => (r.hogar_solidario || '').toUpperCase() !== 'RETIRADO'),
    [refugiadosDelConjunto]
  );

  const refugiadosPresentes = useMemo(
    () => refugiadosDelConjunto.filter(r => ((r.hogar_solidario || '').trim().toUpperCase() || 'PRESENTE') === 'PRESENTE'),
    [refugiadosDelConjunto]
  );

  const jefesActivos = useMemo(
    () => refugiadosActivos.filter(r => r.es_jefe_familia === true),
    [refugiadosActivos]
  );

  const totalRefugiados = refugiadosPresentes.length;
  const totalHombres = refugiadosPresentes.filter(r => r.genero === true).length;
  const totalMujeres = refugiadosPresentes.filter(r => r.genero === false).length;

  const totalFamilias = new Set(jefesActivos.filter(r => r.familia_id).map(r => r.familia_id)).size;

  // Optimización: calcular las edades de los refugiados una sola vez usando useMemo
  const refugiadosConEdad = useMemo(() => {
    const hoy = new Date();
    return refugiadosActivos.map(r => {
      const nacimiento = new Date(r.fecha_nacimiento);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
      return { ...r, edad };
    });
  }, [refugiadosActivos]);

  // ── Indicadores demográficos ──────────────────────────────────────────────
  const ninos = refugiadosConEdad.filter(r => r.edad <= 11);
  const ninosH = ninos.filter(r => r.genero === true).length;
  const ninosM = ninos.filter(r => r.genero === false).length;

  const adolescentes = refugiadosConEdad.filter(r => r.edad >= 12 && r.edad <= 17);
  const adolescentesH = adolescentes.filter(r => r.genero === true).length;
  const adolescentesM = adolescentes.filter(r => r.genero === false).length;

  const adultoMayor = refugiadosConEdad.filter(r => (r.genero === true && r.edad >= 60) || (r.genero === false && r.edad >= 55));
  const adultoMayorH = adultoMayor.filter(r => r.genero === true).length;
  const adultoMayorM = adultoMayor.filter(r => r.genero === false).length;

  const lactantes = refugiadosConEdad.filter(r => r.edad >= 0 && r.edad <= 2);
  const lactantesH = lactantes.filter(r => r.genero === true).length;
  const lactantesM = lactantes.filter(r => r.genero === false).length;

  const noLactantes = refugiadosConEdad.filter(r => r.edad >= 3 && r.edad <= 11);
  const noLactantesH = noLactantes.filter(r => r.genero === true).length;
  const noLactantesM = noLactantes.filter(r => r.genero === false).length;

  const embarazadasArray = refugiadosActivos.filter(r => r.genero === false && r.embarazo === true);
  const totalEmbarazadas = embarazadasArray.length;
  const discapacitadosArray = refugiadosActivos.filter(r => r.discapacidad === true);
  const totalDiscapacitados = discapacitadosArray.length;

  const adultos = refugiadosConEdad.filter(r =>
    (r.genero === true && r.edad >= 18 && r.edad < 60) ||
    (r.genero === false && r.edad >= 18 && r.edad < 55)
  );
  const adultosH = adultos.filter(r => r.genero === true).length;
  const adultosM = adultos.filter(r => r.genero === false).length;

  // Filtrar solo jefes de familia para calculos basados en familias
  const totalJefes = jefesActivos.length;

  // Datos para grafico de dona – Tenencia de Vivienda (solo jefes)
  const tenenciaData = useMemo(() => {
    const map = new Map<string, number>();
    jefesActivos.forEach(j => {
      const t = j.tenencia_vivienda?.trim() || 'Sin especificar';
      map.set(t, (map.get(t) || 0) + 1);
    });
    const categorias = ['Propia', 'Alquilada', 'Compartida/Familiar', 'Pensión', 'Sin especificar'];
    return categorias
      .map(nombre => ({
        nombre,
        cantidad: map.get(nombre) || 0,
      }))
      .filter(c => c.cantidad > 0);
  }, [jefesActivos]);

  // Colores para la dona de tenencia
  const tenenciaColores: Record<string, string> = {
    'Propia': '#007229',
    'Alquilada': '#0033A0',
    'Compartida/Familiar': '#FFD100',
    'Pensión': '#bc2f4a',
    'Sin especificar': '#9CA3AF',
  };

  // SVG dona – constantes
  const DONA_RADIUS = 70;
  const DONA_CIRCUMFERENCE = 2 * Math.PI * DONA_RADIUS;

  const donutSlicePath = (pct: number, offsetIn: number): string => {
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
  };

  const donaSectores = useMemo(() => {
    let offset = 0;
    return tenenciaData.map(c => {
      const pct = totalJefes > 0 ? c.cantidad / totalJefes : 0;
      const dash = pct * DONA_CIRCUMFERENCE;
      const sector = { ...c, pct, dash, offset };
      offset += dash;
      return sector;
    });
  }, [tenenciaData, totalJefes, DONA_CIRCUMFERENCE]);

  // Datos para gráfico de dona – Situación de Estatus (todos los integrantes del conjunto)
  const totalIntegrantes = refugiadosDelConjunto.length;
  const estatusData = useMemo(() => {
    const categorias = ['PRESENTE', 'HOGAR SOLIDARIO', 'RETIRADO'];
    const map = new Map<string, number>();
    refugiadosDelConjunto.forEach(r => {
      const s = ((r.hogar_solidario || '').trim().toUpperCase() || 'PRESENTE');
      map.set(s, (map.get(s) || 0) + 1);
    });
    return categorias
      .map(nombre => ({ nombre, cantidad: map.get(nombre) || 0 }))
      .filter(c => c.cantidad > 0);
  }, [refugiadosDelConjunto]);

  const estatusColores: Record<string, string> = {
    'PRESENTE': '#10B981',
    'HOGAR SOLIDARIO': '#F59E0B',
    'RETIRADO': '#EF4444',
  };

  const estatusSectores = useMemo(() => {
    if (totalIntegrantes === 0) return [];
    let offset = 0;
    return estatusData.map(c => {
      const pct = c.cantidad / totalIntegrantes;
      const dash = pct * DONA_CIRCUMFERENCE;
      const sector = { ...c, pct, dash, offset };
      offset += dash;
      return sector;
    });
  }, [estatusData, totalIntegrantes, DONA_CIRCUMFERENCE]);

  // Agrupaciones para charts clickeables
  const jefesPorTenencia = useMemo(() => {
    const map = new Map<string, typeof refugiadosActivos>();
    jefesActivos.forEach(j => {
      const t = j.tenencia_vivienda?.trim() || 'Sin especificar';
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(j);
    });
    return map;
  }, [jefesActivos]);

  const refugiadosPorEstatus = useMemo(() => {
    const map = new Map<string, typeof refugiadosDelConjunto>();
    refugiadosDelConjunto.forEach(r => {
      const s = ((r.hogar_solidario || '').trim().toUpperCase() || 'PRESENTE');
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(r);
    });
    return map;
  }, [refugiadosDelConjunto]);

  const jefesPorParroquia = useMemo(() => {
    const map = new Map<string, typeof jefesActivos>();
    jefesActivos.forEach(j => {
      const proc = j.parroquia?.trim() || 'SIN ESPECIFICAR';
      if (!map.has(proc)) map.set(proc, []);
      map.get(proc)!.push(j);
    });
    return map;
  }, [jefesActivos]);

  // Calcular ranking de parroquias (solo jefes de familia)
  const parroquiasMap = new Map<string, number>();
  jefesActivos.forEach(r => {
    const proc = r.parroquia?.trim() || 'SIN ESPECIFICAR';
    parroquiasMap.set(proc, (parroquiasMap.get(proc) || 0) + 1);
  });
  const parroquiasRanking = Array.from(parroquiasMap.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
  const maxParroquia = parroquiasRanking.length > 0 ? parroquiasRanking[0].cantidad : 1;

  // Colores vibrantes para las barras
  const barColors = [
    '#10B981', '#6366F1', '#F59E0B', '#EF4444', '#06B6D4',
    '#8B5CF6', '#EC4899', '#84CC16', '#F97316', '#14B8A6',
    '#A855F7', '#3B82F6', '#E11D48', '#22C55E', '#EAB308'
  ];

  // Estado para tooltip
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hoveredTenenciaSector, setHoveredTenenciaSector] = useState<string | null>(null);
  const [hoveredEstatusSector, setHoveredEstatusSector] = useState<string | null>(null);

  // ── Helpers para cards/charts clickeables ──────────────────────────────────
  const abrirLista = (titulo: string, datos: any[]) => {
    if (datos.length === 0) return;
    setListaTitulo(titulo);
    setListaDatos(datos);
    setListaFamilias(familiasIncluidas);
    setListaModalOpen(true);
  };

  const abrirFichaDesdeLista = (refugiado: any) => {
    setFichaDesdeDashboard(refugiado);
    setFichaModalOpen(true);
  };

  const navigateToRefugiados = () => {
    setFichaModalOpen(false);
    setFichaDesdeDashboard(null);
    navigate(`/refugiados?buscar=${encodeURIComponent(fichaDesdeDashboard!.apellidos)}&verFicha=${fichaDesdeDashboard!.id}`);
  };

  const campamentosEnColumnas = useMemo(() => {
    const NUM_COLUMNAS = 4;
    const nombres = campamentosIncluidos.map(c => c.nombre);
    const filas = Math.max(1, Math.ceil(nombres.length / NUM_COLUMNAS));
    const columnas: string[][] = Array.from({ length: NUM_COLUMNAS }, () => []);
    for (let f = 0; f < filas; f++) {
      for (let c = 0; c < NUM_COLUMNAS; c++) {
        const nombre = nombres[f * NUM_COLUMNAS + c];
        if (nombre) columnas[c][f] = nombre;
      }
    }
    return { columnas, filas };
  }, [campamentosIncluidos]);

  if (!tieneAcceso) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldOff size={64} className="mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">Sin acceso a este módulo</p>
        <p className="text-sm text-gray-400 mt-1">No tienes permisos para ver el módulo General.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Visión General</h2>
        <p className="text-gray-500 max-md:max-w-[calc(100vw-2rem)] max-md:[overflow-wrap:anywhere]">
          Total consolidado de{' '}
          <span className="font-semibold text-caracas-red">{campamentosIncluidos.length} campamento{campamentosIncluidos.length === 1 ? '' : 's'}</span>
        </p>

        {campamentosIncluidos.length > 0 && (
          <div className="mt-3 max-md:overflow-x-auto">
            <table className="w-full table-fixed border-separate border-spacing-0 bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
              <tbody>
                {Array.from({ length: campamentosEnColumnas.filas }).map((_, fila) => (
                  <tr key={fila}>
                    {campamentosEnColumnas.columnas.map((columna, colIdx) => {
                      const nombre = columna[fila];
                      return (
                        <td
                          key={colIdx}
                          className={`w-1/4 px-3 py-2 align-middle min-w-0 ${colIdx > 0 ? 'border-l border-gray-100' : ''} ${fila < campamentosEnColumnas.filas - 1 ? 'border-b border-gray-100' : ''} ${colIdx % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'}`}
                        >
                          {nombre && (
                            <span className="flex items-start gap-1.5 text-xs leading-snug text-gray-700 hover:text-caracas-red transition-colors">
                              <MapPin size={13} className="text-caracas-red shrink-0 mt-0.5" />
                              <span className="min-w-0 break-words" title={nombre}>{nombre}</span>
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 max-md:-mx-4 max-md:rounded-none">
        <AlertTriangle size={20} className="text-amber-500 shrink-0" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Nota:</span> La información suministrada no contempla
          los integrantes que están retirados del campamento. Solamente en{' '}
          <span className="font-medium underline">Situación de Estatus</span> se ven reflejados.
        </p>
      </div>

      {campamentosIncluidos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="text-center py-10 text-gray-400">
            <Landmark size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium">No hay campamentos incluidos en el módulo General.</p>
            <p className="text-sm text-gray-400 mt-1">Marca los campamentos en el módulo Constructor para ver sus totales consolidados.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 md:gap-6 max-md:-mx-4">
            {/* Total Personas */}
            <div className="bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05),0_0_0_0_rgba(0,0,0,0),-5px_5px_0_0_#bc2f4a] border border-gray-100 flex items-center gap-4 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),-5px_5px_0_0_#bc2f4a] transition-shadow max-md:bg-caracas-red max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:gap-2 md:hidden">
              <Users size={isMobile ? 18 : 32} className="max-md:text-white shrink-0 md:hidden" />
              <div className="max-md:hidden p-4 bg-caracas-red/10 rounded-xl text-caracas-red shrink-0">
                <Users size={32} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-black truncate max-md:text-white">Total de Personas Presentes</p>
                <p className="text-3xl font-bold text-gray-900 max-md:text-white max-md:text-xl">{totalRefugiados}</p>
                <p className="text-xs text-gray-400 mt-1 max-md:text-base max-md:text-yellow-300">
                  <span className="text-blue-600 font-medium max-md:text-blue-300">{totalHombres}</span> H · <span className="text-pink-600 font-medium max-md:text-pink-300">{totalMujeres}</span> M
                </p>
              </div>
            </div>
            <IndicatorCard
              titulo="Total de Personas"
              icono={<Users size={22} />}
              color="#bc2f4a"
              grupo={refugiadosActivos}
              onAbrirLista={abrirLista}
            />

            {/* Total Familias */}
            <div className="bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05),0_0_0_0_rgba(0,0,0,0),-5px_5px_0_0_#6366f1] border border-gray-100 flex items-center gap-4 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),-5px_5px_0_0_#6366f1] transition-shadow max-md:bg-indigo-500 max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:gap-2 md:hidden">
              <Home size={isMobile ? 18 : 32} className="max-md:text-white shrink-0 md:hidden" />
              <div className="max-md:hidden p-4 bg-indigo-500/10 rounded-xl text-indigo-500 shrink-0">
                <Home size={32} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-black truncate max-md:text-white">Total de Familias</p>
                <p className="text-3xl font-bold text-gray-900 max-md:text-white max-md:text-xl">{totalFamilias}</p>
                <p className="text-xs text-gray-400 mt-1 truncate max-md:text-base max-md:text-yellow-300">
                  Grupos familiares
                </p>
              </div>
            </div>
            <IndicatorCard
              titulo="Total de Familias"
              icono={<Home size={22} />}
              color="#6366f1"
              grupo={jefesActivos}
              esFamilia
              onAbrirLista={abrirLista}
            />
          </div>

          {/* Embarazadas y Discapacitados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 md:gap-6 max-md:-mx-4">
            {/* Embarazadas */}
            <div
              onClick={() => abrirLista('Embarazadas', embarazadasArray)}
              className="bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05),0_0_0_0_rgba(0,0,0,0),-5px_5px_0_0_#ec4899] border border-gray-100 flex items-center gap-4 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),-5px_5px_0_0_#ec4899] transition-shadow transition-colors cursor-pointer hover:bg-pink-500/10 max-md:bg-pink-500 max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:gap-2 md:hidden">
              <HeartPulse size={isMobile ? 18 : 32} className="max-md:text-white shrink-0 md:hidden" />
              <div className="max-md:hidden p-4 bg-pink-500/10 rounded-xl text-pink-500 shrink-0">
                <HeartPulse size={32} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-black truncate max-md:text-white">Embarazadas</p>
                <p className="text-3xl font-bold text-gray-900 max-md:text-white max-md:text-xl">{totalEmbarazadas}</p>
                <p className="text-xs text-gray-400 mt-1 truncate max-md:text-base max-md:text-yellow-300">
                  Mujeres en estado de gestación
                </p>
              </div>
            </div>
            <IndicatorCard
              titulo="Embarazadas"
              icono={<HeartPulse size={22} />}
              color="#ec4899"
              grupo={embarazadasArray}
              onAbrirLista={abrirLista}
            />

            {/* Discapacitados */}
            <div
              onClick={() => abrirLista('Discapacitados', discapacitadosArray)}
              className="bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05),0_0_0_0_rgba(0,0,0,0),-5px_5px_0_0_#a855f7] border border-gray-100 flex items-center gap-4 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),-5px_5px_0_0_#a855f7] transition-shadow transition-colors cursor-pointer hover:bg-purple-500/10 max-md:bg-purple-500 max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:gap-2 md:hidden">
              <Accessibility size={isMobile ? 18 : 32} className="max-md:text-white shrink-0 md:hidden" />
              <div className="max-md:hidden p-4 bg-purple-500/10 rounded-xl text-purple-500 shrink-0">
                <Accessibility size={32} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-black truncate max-md:text-white">Discapacitados</p>
                <p className="text-3xl font-bold text-gray-900 max-md:text-white max-md:text-xl">{totalDiscapacitados}</p>
                <p className="text-xs text-gray-400 mt-1 truncate max-md:text-base max-md:text-yellow-300">
                  Personas con condición especial
                </p>
              </div>
            </div>
            <IndicatorCard
              titulo="Discapacitados"
              icono={<Accessibility size={22} />}
              color="#a855f7"
              grupo={discapacitadosArray}
              onAbrirLista={abrirLista}
            />
          </div>

          {/* Indicadores Demográficos Detallados */}
          <div className="space-y-6">
            {/* Cards de Niñez */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 md:gap-6 max-md:-mx-4">
              {/* Niños (0-11) */}
              <div onClick={() => abrirLista('Niños (0-11 años)', ninos)} className="bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05),0_0_0_0_rgba(0,0,0,0),-5px_5px_0_0_#fb923c] border border-gray-100 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),-5px_5px_0_0_#fb923c] transition-shadow transition-colors cursor-pointer hover:bg-orange-400/10 max-md:bg-[#e76e1c] max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 md:hidden">
                <div className="flex items-center gap-3 mb-4 max-md:gap-2 max-md:mb-0">
                  <Baby size={isMobile ? 18 : 28} className="max-md:text-white shrink-0 md:hidden" />
                  <div className="max-md:hidden p-3 bg-orange-100 rounded-xl text-orange-500">
                    <Baby size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black max-md:text-white">Niños</p>
                    <p className="text-2xl font-bold text-gray-900 max-md:text-white max-md:text-lg">{ninos.length}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 max-md:text-base max-md:text-yellow-300">
                  0 a 11 años · <span className="text-blue-600 font-medium max-md:text-blue-200">{ninosH} H</span> · <span className="text-pink-600 font-medium max-md:text-pink-200">{ninosM} M</span>
                </p>
              </div>
              <IndicatorCard
                titulo="Niños"
                icono={<Baby size={22} />}
                color="#fb923c"
                grupo={ninos}
                onAbrirLista={abrirLista}
              />

              {/* Niños Lactantes (0-3) */}
              <div onClick={() => abrirLista('Niños Lactantes (0-2 años)', lactantes)} className="bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05),0_0_0_0_rgba(0,0,0,0),-5px_5px_0_0_#fb923c] border border-gray-100 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),-5px_5px_0_0_#fb923c] transition-shadow transition-colors cursor-pointer hover:bg-orange-400/10 max-md:bg-[#e98b3f] max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 md:hidden">
                <div className="flex items-center gap-3 mb-4 max-md:gap-2 max-md:mb-0">
                  <Milk size={isMobile ? 18 : 28} className="max-md:text-white shrink-0 md:hidden" />
                  <div className="max-md:hidden p-3 bg-sky-100 rounded-xl text-sky-500">
                    <Milk size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black max-md:text-white">Niños Lactantes</p>
                    <p className="text-2xl font-bold text-gray-900 max-md:text-white max-md:text-lg">{lactantes.length}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 max-md:text-base max-md:text-yellow-300">
                  0 a 2 años · <span className="text-blue-600 font-medium max-md:text-blue-200">{lactantesH} H</span> · <span className="text-pink-600 font-medium max-md:text-pink-200">{lactantesM} M</span>
                </p>
              </div>
              <IndicatorCard
                titulo="Niños Lactantes"
                icono={<Milk size={22} />}
                color="#fb923c"
                grupo={lactantes}
                onAbrirLista={abrirLista}
              />

              {/* No Lactantes (4-11) */}
              <div onClick={() => abrirLista('No Lactantes (3-11 años)', noLactantes)} className="bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05),0_0_0_0_rgba(0,0,0,0),-5px_5px_0_0_#f97316] border border-gray-100 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),-5px_5px_0_0_#f97316] transition-shadow transition-colors cursor-pointer hover:bg-orange-500/10 max-md:bg-[#ce8043] max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 md:hidden">
                <div className="flex items-center gap-3 mb-4 max-md:gap-2 max-md:mb-0">
                  <Baby size={isMobile ? 18 : 28} className="max-md:text-white shrink-0 md:hidden" />
                  <div className="max-md:hidden p-3 bg-amber-100 rounded-xl text-amber-600">
                    <Baby size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black max-md:text-white">No Lactantes</p>
                    <p className="text-2xl font-bold text-gray-900 max-md:text-white max-md:text-lg">{noLactantes.length}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 max-md:text-base max-md:text-yellow-300">
                  3 a 11 años · <span className="text-blue-600 font-medium max-md:text-blue-200">{noLactantesH} H</span> · <span className="text-pink-600 font-medium max-md:text-pink-200">{noLactantesM} M</span>
                </p>
              </div>
              <IndicatorCard
                titulo="No Lactantes"
                icono={<Baby size={22} />}
                color="#f97316"
                grupo={noLactantes}
                onAbrirLista={abrirLista}
              />
            </div>

            {/* Adolescentes, Adultos, Adulto Mayor */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 md:gap-6 max-md:-mx-4">
              {/* Adolescentes (12-17) */}
              <div onClick={() => abrirLista('Adolescentes (12-17 años)', adolescentes)} className="bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05),0_0_0_0_rgba(0,0,0,0),-5px_5px_0_0_#f59e0b] border border-gray-100 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),-5px_5px_0_0_#f59e0b] transition-shadow transition-colors cursor-pointer hover:bg-amber-500/10 max-md:bg-amber-500 max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 md:hidden">
                <div className="flex items-center gap-3 mb-4 max-md:gap-2 max-md:mb-0">
                  <Sparkles size={isMobile ? 18 : 28} className="max-md:text-white shrink-0 md:hidden" />
                  <div className="max-md:hidden p-3 bg-yellow-100 rounded-xl text-yellow-600">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black max-md:text-white">Adolescentes</p>
                    <p className="text-2xl font-bold text-gray-900 max-md:text-white max-md:text-lg">{adolescentes.length}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 max-md:text-base max-md:text-yellow-300">
                  12 a 17 años · <span className="text-blue-600 font-medium max-md:text-blue-200">{adolescentesH} H</span> · <span className="text-pink-600 font-medium max-md:text-pink-200">{adolescentesM} M</span>
                </p>
              </div>
              <IndicatorCard
                titulo="Adolescentes"
                icono={<Sparkles size={22} />}
                color="#f59e0b"
                grupo={adolescentes}
                onAbrirLista={abrirLista}
              />

              {/* Adultos (18-59 H / 18-54 M) */}
              <div onClick={() => abrirLista('Adultos (18-59 H / 18-54 M)', adultos)} className="bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05),0_0_0_0_rgba(0,0,0,0),-5px_5px_0_0_#34d399] border border-gray-100 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),-5px_5px_0_0_#34d399] transition-shadow transition-colors cursor-pointer hover:bg-emerald-400/10 max-md:bg-[#48ba8d] max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 md:hidden">
                <div className="flex items-center gap-3 mb-4 max-md:gap-2 max-md:mb-0">
                  <UserCheck size={isMobile ? 18 : 28} className="max-md:text-white shrink-0 md:hidden" />
                  <div className="max-md:hidden p-3 bg-emerald-100 rounded-xl text-emerald-600">
                    <UserCheck size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black max-md:text-white">Adultos</p>
                    <p className="text-2xl font-bold text-gray-900 max-md:text-white max-md:text-lg">{adultos.length}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 max-md:text-base max-md:text-yellow-300">
                  H 18-59 / M 18-54 · <span className="text-blue-600 font-medium max-md:text-blue-200">{adultosH} H</span> · <span className="text-pink-600 font-medium max-md:text-pink-200">{adultosM} M</span>
                </p>
              </div>
              <IndicatorCard
                titulo="Adultos"
                icono={<UserCheck size={22} />}
                color="#34d399"
                grupo={adultos}
                onAbrirLista={abrirLista}
              />

              {/* Adulto Mayor */}
              <div onClick={() => abrirLista('Adulto Mayor (H ≥60 / M ≥55)', adultoMayor)} className="bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05),0_0_0_0_rgba(0,0,0,0),-5px_5px_0_0_#fb7185] border border-gray-100 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),-5px_5px_0_0_#fb7185] transition-shadow transition-colors cursor-pointer hover:bg-rose-400/10 max-md:bg-[#d57177] max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 md:hidden">
                <div className="flex items-center gap-3 mb-4 max-md:gap-2 max-md:mb-0">
                  <Heart size={isMobile ? 18 : 28} className="max-md:text-white shrink-0 md:hidden" />
                  <div className="max-md:hidden p-3 bg-rose-100 rounded-xl text-rose-500">
                    <Heart size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black max-md:text-white">Adulto Mayor</p>
                    <p className="text-2xl font-bold text-gray-900 max-md:text-white max-md:text-lg">{adultoMayor.length}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 max-md:text-base max-md:text-yellow-300">
                  H &ge;60 / M &ge;55 · <span className="text-blue-600 font-medium max-md:text-blue-200">{adultoMayorH} H</span> · <span className="text-pink-600 font-medium max-md:text-pink-200">{adultoMayorM} M</span>
                </p>
              </div>
              <IndicatorCard
                titulo="Adulto Mayor"
                icono={<Heart size={22} />}
                color="#fb7185"
                grupo={adultoMayor}
                onAbrirLista={abrirLista}
              />
            </div>
          </div>

          <DistribucionGeografica refugiadosActivos={refugiadosActivos} onAbrirLista={abrirLista} />

          {/* Dashboard: Tenencia de Vivienda + Estatus | Ranking de Parroquias */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* COLUMNA IZQUIERDA: Tenencia de Vivienda + Situación de Estatus apilados */}
            <div className="flex flex-col gap-y-2 md:gap-6">

              {/* Grafico de Dona – Tenencia de Vivienda */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-md:bg-transparent max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:-mx-4">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 bg-caracas-red rounded-full"></div>
                  <h2 className="text-sm font-bold text-black uppercase tracking-wider">Tenencia de Vivienda</h2>
                </div>

                {tenenciaData.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <div className="relative w-40 h-40 shrink-0">
                      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90" onMouseLeave={() => setHoveredTenenciaSector(null)}>
                        <circle cx="100" cy="100" r={DONA_RADIUS + 14} fill="none" stroke="#F3F4F6" strokeWidth="28" />
                        <circle cx="100" cy="100" r={DONA_RADIUS - 14} fill="#fff" />
                        {donaSectores.map(s => (
                          <path
                            key={s.nombre}
                            d={donutSlicePath(s.pct, s.offset)}
                            fill={tenenciaColores[s.nombre] || '#9CA3AF'}
                            opacity={hoveredTenenciaSector === null || hoveredTenenciaSector === s.nombre ? 1 : 0.4}
                            style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
                            onMouseEnter={() => setHoveredTenenciaSector(s.nombre)}
                            onClick={() => abrirLista(`Tenencia: ${s.nombre}`, jefesPorTenencia.get(s.nombre) || [])}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: 'none' }}>
                        <span className="text-2xl font-bold text-gray-800">{totalJefes}</span>
                        <span className="text-xs text-black">Familias</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2.5 min-w-0">
                      {tenenciaData.map(c => (
                        <div key={c.nombre} className="flex items-center justify-between text-sm">
                          <div
                            className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-70 transition-opacity"
                            onClick={() => abrirLista(`Tenencia: ${c.nombre}`, jefesPorTenencia.get(c.nombre) || [])}
                          >
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tenenciaColores[c.nombre] || '#9CA3AF' }} />
                            <span className="text-gray-600 truncate">{c.nombre}</span>
                          </div>
                          <span className="font-semibold text-gray-800 tabular-nums shrink-0 ml-2">
                            {c.cantidad} <span className="text-gray-400 font-normal">({totalJefes > 0 ? ((c.cantidad / totalJefes) * 100).toFixed(1) : '0.0'}%)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-400">
                    <p className="font-medium">No hay jefes de familia registrados.</p>
                  </div>
                )}
              </div>

              {/* Grafico de Dona – Situación de Estatus (todos los integrantes) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-md:bg-transparent max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:-mx-4">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                  <h2 className="text-sm font-bold text-black uppercase tracking-wider">Situación de Estatus</h2>
                </div>

                {estatusData.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <div className="relative w-40 h-40 shrink-0">
                      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90" onMouseLeave={() => setHoveredEstatusSector(null)}>
                        <circle cx="100" cy="100" r={DONA_RADIUS + 14} fill="none" stroke="#F3F4F6" strokeWidth="28" />
                        <circle cx="100" cy="100" r={DONA_RADIUS - 14} fill="#fff" />
                        {estatusSectores.map(s => {
                          const esClickleable = s.nombre === 'HOGAR SOLIDARIO' || s.nombre === 'RETIRADO';
                          return (
                            <path
                              key={s.nombre}
                              d={donutSlicePath(s.pct, s.offset)}
                              fill={estatusColores[s.nombre] || '#9CA3AF'}
                              opacity={hoveredEstatusSector === null || hoveredEstatusSector === s.nombre ? 1 : 0.4}
                              style={{ cursor: esClickleable ? 'pointer' : 'default', transition: 'opacity 0.2s ease' }}
                              onMouseEnter={esClickleable ? () => setHoveredEstatusSector(s.nombre) : undefined}
                              onClick={esClickleable ? () => abrirLista(`Estatus: ${s.nombre.charAt(0) + s.nombre.slice(1).toLowerCase()}`, refugiadosPorEstatus.get(s.nombre) || []) : undefined}
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: 'none' }}>
                        <span className="text-2xl font-bold text-gray-800">{totalIntegrantes}</span>
                        <span className="text-[11px] text-black text-center leading-tight -mt-1">Integrantes<br />Registrados</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2.5 min-w-0">
                      {estatusData.map(c => {
                        const esClickleable = c.nombre === 'HOGAR SOLIDARIO' || c.nombre === 'RETIRADO';
                        return (
                          <div key={c.nombre} className="flex items-center justify-between text-sm">
                            <div
                              className={`flex items-center gap-2 min-w-0 ${esClickleable ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
                              onClick={esClickleable ? () => abrirLista(`Estatus: ${c.nombre.charAt(0) + c.nombre.slice(1).toLowerCase()}`, refugiadosPorEstatus.get(c.nombre) || []) : undefined}
                            >
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: estatusColores[c.nombre] || '#9CA3AF' }} />
                              <span className="text-gray-600 truncate capitalize">{c.nombre.charAt(0) + c.nombre.slice(1).toLowerCase()}</span>
                            </div>
                            <span className="font-semibold text-gray-800 tabular-nums shrink-0 ml-2">
                              {c.cantidad} <span className="text-gray-400 font-normal">({totalIntegrantes > 0 ? ((c.cantidad / totalIntegrantes) * 100).toFixed(1) : '0.0'}%)</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-400">
                    <p className="font-medium">No hay integrantes registrados.</p>
                  </div>
                )}
              </div>

            </div>

            {/* COLUMNA DERECHA: Ranking de Parroquias */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-md:bg-transparent max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:max-w-[calc(100vw-1rem)] max-md:-ml-4 max-md:mr-0">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Ranking de Parroquias</h2>
              </div>

              {parroquiasRanking.length > 0 ? (
                <div className="space-y-3">
                  {parroquiasRanking.map((proc, index) => {
                    const pct = (proc.cantidad / maxParroquia) * 100;
                    const color = barColors[index % barColors.length];
                    return (
                      <div
                        key={proc.nombre}
                        className={`flex items-center gap-3 group relative max-md:flex-col max-md:items-start max-md:gap-1 max-md:overflow-hidden cursor-pointer ${hoveredBar === index ? 'z-50 max-md:overflow-visible' : 'z-0'}`}
                        onMouseEnter={() => setHoveredBar(index)}
                        onMouseLeave={() => setHoveredBar(null)}
                        onClick={() => abrirLista(`Parroquia: ${proc.nombre}`, jefesPorParroquia.get(proc.nombre) || [])}
                      >
                        <p className="text-xs font-semibold text-gray-500 text-right w-36 shrink-0 truncate uppercase max-md:w-full max-md:text-left max-md:whitespace-normal max-md:overflow-visible" title={proc.nombre}>
                          {proc.nombre}
                        </p>
                        <div className="flex-1 h-7 bg-gray-50 rounded-md relative max-md:w-full max-md:flex-none">
                          <div
                            className="h-full rounded-md transition-all duration-500 ease-out"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: color,
                              minWidth: '24px',
                              opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.4
                            }}
                          />
                          {hoveredBar === index && (
                            <div className="absolute left-1/2 -translate-x-1/2 -top-14 bg-white border border-gray-200 shadow-xl rounded-lg px-4 py-2 z-[999] whitespace-nowrap pointer-events-none">
                              <p className="text-xs font-bold text-gray-700">{proc.nombre}</p>
                              <p className="text-xs text-gray-500">
                                {proc.nombre}: <span className="font-bold text-gray-800">{proc.cantidad}</span> familias <span className="text-gray-400 font-medium">({totalJefes > 0 ? ((proc.cantidad / totalJefes) * 100).toFixed(1) : '0.0'}%)</span>
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
                  <p className="font-medium">No hay jefes de familia registrados para mostrar parroquias.</p>
                </div>
              )}
            </div>

          </div>
        </>
      )}

      <ListaIntegrantesModal
        isOpen={listaModalOpen}
        onClose={() => setListaModalOpen(false)}
        titulo={listaTitulo}
        datos={listaDatos}
        familias={listaFamilias}
        onVerDetalle={abrirFichaDesdeLista}
      />

      <FichaRefugiadoModal
        isOpen={fichaModalOpen}
        onClose={() => { setFichaModalOpen(false); setFichaDesdeDashboard(null); }}
        refugiado={fichaDesdeDashboard}
        onActualizarFoto={() => { }}
        onActualizarMascotaFoto={() => { }}
        showNavButton
        onNavigateToModule={navigateToRefugiados}
      />
    </div>
  );
}
