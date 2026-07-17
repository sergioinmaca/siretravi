import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { FileText, Search, Plus, MoreVertical, Trash2, ShieldOff, Loader2, Tent } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import { contarActasPorRefugiado, obtenerActas, eliminarActa, obtenerTiposActa } from '../lib/actas';
import { toDisplayDate } from '../lib/formatDate';
import { formatCedula } from '../lib/formatCedula';
import CroquisViewer, { countElements, contarTiposDesdeCroquis } from '../components/constructor/CroquisViewer';
import LevantarActaModal from '../components/actas/LevantarActaModal';
import type { Acta, TipoActa } from '../types';

export default function Actas() {
  const { campamentoSeleccionado, refugiados = [] } = useCampamento();
  const { tienePermisoPorCampamento, tienePermiso } = useAuth();

  const [actas, setActas] = useState<Acta[]>([]);
  const [tiposActa, setTiposActa] = useState<TipoActa[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const perPage = 15;

  const campId = campamentoSeleccionado?.id || '';
  const tieneAcceso = campamentoSeleccionado
    ? tienePermisoPorCampamento('Actas', campId, 'Ver')
    : true;
  const puedeCrear = campamentoSeleccionado
    ? tienePermisoPorCampamento('Actas', campId, 'Crear')
    : false;
  const puedeEliminar = tienePermiso('Actas', 'Eliminar');

  const cargarDatos = useCallback(async () => {
    if (!campId) return;
    setLoading(true);
    const [actasData, tiposData] = await Promise.all([
      obtenerActas(campId),
      obtenerTiposActa(),
    ]);
    setActas(actasData);
    setTiposActa(tiposData);
    setLoading(false);
  }, [campId]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const refugiadosDelCampamento = campamentoSeleccionado
    ? refugiados.filter(r => r.campamento_id === campamentoSeleccionado.id)
    : [];

  // ── Mapa de colores para el croquis basado en conteo de actas ──
  const [conteoActasPorRefugiado, setConteoActasPorRefugiado] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!campId) return;
    contarActasPorRefugiado(campId).then(setConteoActasPorRefugiado);
  }, [campId, actas]);

  const bedColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    refugiadosDelCampamento.forEach(r => {
      if (!r.nro_cama) return;
      const count = conteoActasPorRefugiado[r.id] || 0;
      if (count === 0) {
        map[r.nro_cama] = '#22C55E';
      } else if (count <= 2) {
        map[r.nro_cama] = '#F97316';
      } else {
        map[r.nro_cama] = '#EF4444';
      }
    });
    return map;
  }, [refugiadosDelCampamento, conteoActasPorRefugiado]);

  // ── Indicadores ──
  const totalActas = actas.length;
  const conteoActasPorTipo = useMemo(() => {
    const conteo: Record<string, number> = {};
    actas.forEach(a => {
      conteo[a.tipo_acta_id] = (conteo[a.tipo_acta_id] || 0) + 1;
    });
    return conteo;
  }, [actas]);

  // ── Tabla dinámica ──
  const actasConInfo = useMemo(() => {
    return actas.map(a => {
      const ref = refugiadosDelCampamento.find(r => r.id === a.refugiado_id);
      const tipo = tiposActa.find(t => t.id === a.tipo_acta_id);
      return { acta: a, refugiado: ref, tipo: tipo };
    });
  }, [actas, refugiadosDelCampamento, tiposActa]);

  const filtered = useMemo(() => {
    if (!search.trim()) return actasConInfo;
    const q = search.toUpperCase();
    return actasConInfo.filter(({ acta, refugiado }) => {
      return (
        acta.codigo.toUpperCase().includes(q) ||
        refugiado?.nombres?.toUpperCase().includes(q) ||
        refugiado?.apellidos?.toUpperCase().includes(q) ||
        refugiado?.codigo?.toUpperCase().includes(q) ||
        refugiado?.cedula?.toString().includes(q)
      );
    });
  }, [actasConInfo, search]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleEliminar = async (id: string) => {
    setContextMenuId(null);
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta acta?')) return;
    const ok = await eliminarActa(id);
    if (ok) {
      setActas(prev => prev.filter(a => a.id !== id));
    }
  };

  const refCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  if (!tieneAcceso) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldOff size={64} className="mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">Sin acceso a este campamento</p>
        <p className="text-sm text-gray-400 mt-1">No tienes permisos para ver las actas de {campamentoSeleccionado?.nombre}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Módulo de Actas</h2>
        <p className="text-gray-500">
          Mostrando datos para: <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
        </p>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-caracas-red/10 rounded-xl text-caracas-red shrink-0">
            <FileText size={32} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 truncate">Total de Actas</p>
            <p className="text-3xl font-bold text-gray-900">{totalActas}</p>
          </div>
        </div>
        {tiposActa.slice(0, 7).map(tipo => (
          <div key={tipo.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-4 bg-caracas-blue/10 rounded-xl text-caracas-blue shrink-0">
              <FileText size={32} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-500 truncate">{tipo.nombre}</p>
              <p className="text-3xl font-bold text-gray-900">{conteoActasPorTipo[tipo.id] || 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Croquis con colores por actas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Distribución por Actas
        </h3>
        <div className="flex items-center gap-6 text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#22C55E]" />
            Sin actas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#F97316]" />
            1-2 actas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#EF4444]" />
            3+ actas
          </span>
        </div>
        {(campamentoSeleccionado?.carpas?.length || 0) > 0 ? (
          <div className="space-y-8">
            {(campamentoSeleccionado?.carpas || []).map((carpa, index) => {
              let offset = 0;
              for (let i = 0; i < index; i++) {
                offset += countElements(
                  (campamentoSeleccionado?.carpas?.[i]?.croquis_data) || '',
                  campamentoSeleccionado?.tipo_contabilizacion || 'elemento'
                );
              }
              const tiposCarpa = contarTiposDesdeCroquis(carpa.croquis_data || '');
              const totalCamasCarpa = (campamentoSeleccionado?.tipo_contabilizacion || 'elemento') === 'cama'
                ? tiposCarpa.literas * 2 + tiposCarpa.individuales + tiposCarpa.duplex
                : tiposCarpa.literas + tiposCarpa.individuales + tiposCarpa.duplex;
              const elementosCarpa = countElements(
                carpa.croquis_data || '',
                campamentoSeleccionado?.tipo_contabilizacion || 'elemento'
              );
              const minCamaCarpa = offset + 1;
              const maxCamaCarpa = offset + elementosCarpa;
              let ocupadasCarpa = 0;
              refugiadosDelCampamento.forEach(r => {
                const n = parseInt(r.nro_cama || '0', 10);
                if (n >= minCamaCarpa && n <= maxCamaCarpa) ocupadasCarpa++;
              });
              const disponiblesCarpa = Math.max(0, totalCamasCarpa - ocupadasCarpa);

              return (
                <CroquisViewer
                  ref={(el) => { refCanvasRefs.current[index] = el; }}
                  key={carpa.id}
                  croquisData={carpa.croquis_data || '{}'}
                  carpaNombre={carpa.nombre}
                  elementNumberOffset={offset}
                  width={1100}
                  height={700}
                  tipoContabilizacion={campamentoSeleccionado?.tipo_contabilizacion || 'elemento'}
                  occupiedBeds={refugiadosDelCampamento.map(r => r.nro_cama).filter((c): c is string => !!c)}
                  bedOccupants={{}}
                  literasCount={tiposCarpa.literas}
                  individualesCount={tiposCarpa.individuales}
                  duplexCount={tiposCarpa.duplex}
                  disponiblesCarpa={disponiblesCarpa}
                  bedColorMap={bedColorMap}
                />
              );
            })}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl h-72 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <Tent size={48} className="mb-4 opacity-50" />
            <p className="font-medium text-gray-500">No hay carpas configuradas para este campamento.</p>
          </div>
        )}
      </div>

      {/* Buscador y Botón Levantar Acta */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por código, nombre, cédula o código de refugiado..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
          />
        </div>
        {puedeCrear && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md"
          >
            <Plus size={18} />
            Levantar Acta
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-4 font-semibold text-gray-600">Código</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Fecha</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Tipo de Acta</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Código Persona</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Nombre y Apellido</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Cédula</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Nro Cama</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-gray-400">
                    <Loader2 size={40} className="mx-auto mb-3 animate-spin" />
                    <p className="font-medium">Cargando actas...</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-gray-400">
                    <FileText size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">
                      {search ? 'No se encontraron actas con ese criterio de búsqueda' : 'No hay actas registradas'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map(({ acta, refugiado, tipo }) => (
                  <tr key={acta.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-medium text-caracas-blue bg-caracas-blue/5 px-2 py-1 rounded-lg text-xs">
                        {acta.codigo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {acta.fecha ? toDisplayDate(acta.fecha) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-800 font-medium">{tipo?.nombre || 'Tipo desconocido'}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {refugiado?.codigo || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-800">
                        {refugiado?.nombres || 'N/A'} {refugiado?.apellidos || ''}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatCedula(refugiado?.cedula) ?? 'S/C'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {refugiado?.nro_cama || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-center relative">
                      {puedeEliminar && (
                        <button
                          onClick={() => setContextMenuId(contextMenuId === acta.id ? null : acta.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical size={18} className="text-gray-500" />
                        </button>
                      )}
                      {contextMenuId === acta.id && (
                        <div className="absolute right-6 top-12 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
                          <button
                            onClick={() => handleEliminar(acta.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={16} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Mostrando {paginated.length} de {filtered.length} actas
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    page === i + 1
                      ? 'bg-caracas-red text-white'
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <LevantarActaModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={cargarDatos}
      />
    </div>
  );
}
