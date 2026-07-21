import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCampamento } from '../../context/CampamentoContext';
import { ArrowLeft, Search, Eye, Pencil, Trash2, Activity, Gift, HeartHandshake, Stethoscope } from 'lucide-react';
import DetalleAtencionModal from '../../components/salud/DetalleAtencionModal';
import AtencionMedicaModal from '../../components/salud/AtencionMedicaModal';
import { obtenerAtencionesPorRefugiado, eliminarAtencionMedica } from '../../lib/salud';
import type { AtencionMedica } from '../../types';
import { toDisplayDate } from '../../lib/formatDate';
import { formatCedula } from '../../lib/formatCedula';

export default function Atenciones() {
  const navigate = useNavigate();
  const { campamentoSeleccionado, refugiados } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();
  const campId = campamentoSeleccionado?.id || '';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;

  const [selectedRefId, setSelectedRefId] = useState<string | null>(null);
  const [atenciones, setAtenciones] = useState<AtencionMedica[]>([]);
  const [loadingAtenciones, setLoadingAtenciones] = useState(false);

  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [detalleData, setDetalleData] = useState<AtencionMedica | null>(null);

  const [atencionModalOpen, setAtencionModalOpen] = useState(false);
  const [atencionEdit, setAtencionEdit] = useState<AtencionMedica | null>(null);
  const [hcIdEdit, setHcIdEdit] = useState('');

  const campRefugiados = refugiados.filter(r => r.campamento_id === campId);

  const filtered = campRefugiados.filter(r => {
    if (!search) return true;
    const q = search.toUpperCase();
    return (
      r.nombres?.toUpperCase().includes(q) ||
      r.apellidos?.toUpperCase().includes(q) ||
      r.codigo?.toUpperCase().includes(q) ||
      r.cedula?.toString().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const loadAtenciones = async (refId: string) => {
    setLoadingAtenciones(true);
    setSelectedRefId(refId);
    try {
      const atts = await obtenerAtencionesPorRefugiado(refId);
      setAtenciones(atts);
    } catch {
      setAtenciones([]);
    } finally {
      setLoadingAtenciones(false);
    }
  };

  const handleVerDetalle = (a: AtencionMedica) => {
    setDetalleData(a);
    setDetalleModalOpen(true);
  };

  const handleModificar = async (a: AtencionMedica) => {
    setHcIdEdit(a.historia_clinica_id);
    setAtencionEdit(a);
    setAtencionModalOpen(true);
  };

  const handleEliminar = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este registro?')) return;
    try {
      await eliminarAtencionMedica(id);
      if (selectedRefId) loadAtenciones(selectedRefId);
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar');
    }
  };

  const handleCloseEdit = () => {
    setAtencionModalOpen(false);
    setAtencionEdit(null);
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'medica': return <Activity size={16} className="text-caracas-red" />;
      case 'beneficio': return <Gift size={16} className="text-green-600" />;
      case 'donacion': return <HeartHandshake size={16} className="text-purple-600" />;
      default: return null;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'medica': return 'Atención Médica';
      case 'beneficio': return 'Beneficio';
      case 'donacion': return 'Donación';
      default: return tipo;
    }
  };

  const getResumen = (a: AtencionMedica) => {
    if (a.tipo === 'medica') {
      for (let i = 1; i <= 10; i++) {
        const esp = (a as any)[`especialidad_${i}`];
        if (esp) return esp;
      }
      return 'Signos vitales';
    }
    if (a.tipo === 'beneficio' || a.tipo === 'donacion') {
      const prefix = a.tipo === 'beneficio' ? 'beneficio' : 'donacion';
      for (let i = 1; i <= 10; i++) {
        const tipo = (a as any)[`${prefix}_tipo_${i}`];
        if (tipo) return tipo;
      }
      return 'Sin detalle';
    }
    return '';
  };

  if (!tienePermisoPorCampamento('Salud', campId, 'Ver')) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 gap-4">
        <Stethoscope size={64} strokeWidth={1} />
        <p className="text-lg font-medium">No tienes acceso al modulo de Salud</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/salud')} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors shadow-sm">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Atenciones, Beneficios y Donaciones</h1>
          <p className="text-sm text-gray-500">{campamentoSeleccionado?.nombre}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); setSelectedRefId(null); }}
            placeholder="Buscar Integrante..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-4 font-semibold text-gray-600">Código</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Cédula</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Apellidos y Nombres</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Cama</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                    <Search size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No se encontraron integrantes</p>
                  </td>
                </tr>
              )}
              {paginated.map((ref) => (
                <tr key={ref.id} className={`hover:bg-gray-50 transition-colors ${selectedRefId === ref.id ? 'bg-caracas-red/5' : ''}`}>
                  <td className="px-6 py-4 font-medium text-caracas-blue">{ref.codigo || '-'}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{formatCedula(ref.cedula) ?? 'S/C'}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-800">{ref.apellidos}, {ref.nombres}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{ref.nro_cama || 'N/A'}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => loadAtenciones(ref.id)}
                      className="p-2 text-gray-400 hover:text-caracas-red hover:bg-red-50 rounded-lg transition-colors"
                      title="Ver historial"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">Mostrando {paginated.length} de {filtered.length} integrantes</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >Anterior</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${page === i + 1 ? 'bg-caracas-red text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
                >{i + 1}</button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {selectedRefId && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Activity size={18} className="text-teal-600" />
            </div>
            <h3 className="font-semibold text-gray-800">
              Historial — {campRefugiados.find(r => r.id === selectedRefId)?.apellidos}, {campRefugiados.find(r => r.id === selectedRefId)?.nombres}
            </h3>
          </div>
          <div className="p-6">
            {loadingAtenciones ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-caracas-red rounded-full" />
              </div>
            ) : atenciones.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Activity size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-medium">No hay registros para este integrante</p>
              </div>
            ) : (
              <div className="space-y-3">
                {atenciones.map((a) => (
                  <div key={a.id} className="border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">{getTipoIcon(a.tipo)}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-700 uppercase">{getTipoLabel(a.tipo)}</span>
                          <span className="text-xs text-gray-400">
                            {a.fecha_atencion instanceof Date ? toDisplayDate(a.fecha_atencion) : ''}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate max-w-md">{getResumen(a)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleVerDetalle(a)} className="p-2 text-gray-400 hover:text-caracas-blue hover:bg-blue-50 rounded-lg transition-colors" title="Ver detalle">
                        <Eye size={16} />
                      </button>
                      {tienePermisoPorCampamento('Salud', campId, 'Modificar') && (
                        <button onClick={() => handleModificar(a)} className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Modificar">
                          <Pencil size={16} />
                        </button>
                      )}
                      {tienePermisoPorCampamento('Salud', campId, 'Eliminar') && (
                        <button onClick={() => handleEliminar(a.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <DetalleAtencionModal
        isOpen={detalleModalOpen}
        onClose={() => { setDetalleModalOpen(false); setDetalleData(null); }}
        atencion={detalleData}
      />

      <AtencionMedicaModal
        isOpen={atencionModalOpen}
        onClose={handleCloseEdit}
        historiaClinicaId={hcIdEdit}
        refugiadoNombre={selectedRefId ? `${campRefugiados.find(r => r.id === selectedRefId)?.apellidos}, ${campRefugiados.find(r => r.id === selectedRefId)?.nombres}` : ''}
        atencionToEdit={atencionEdit}
      />
    </div>
  );
}
