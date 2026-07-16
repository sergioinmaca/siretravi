import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCampamento } from '../../context/CampamentoContext';
import { ArrowLeft, Stethoscope, Search, Plus, Pencil, Eye } from 'lucide-react';
import HistoriaClinicaModal from '../../components/salud/HistoriaClinicaModal';
import AtencionMedicaModal from '../../components/salud/AtencionMedicaModal';
import HistoriaClinicaDetalleModal from '../../components/salud/HistoriaClinicaDetalleModal';
import type { HistoriaClinica } from '../../types';
import { toDisplayDate } from '../../lib/formatDate';
import { obtenerHistoriasClinicas } from '../../lib/salud';

export default function HistoriasClinicas() {
  const navigate = useNavigate();
  const { campamentoSeleccionado, refugiados } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();
  const campId = campamentoSeleccionado?.id || '';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [historiaModalOpen, setHistoriaModalOpen] = useState(false);
  const [atencionModalOpen, setAtencionModalOpen] = useState(false);
  const [historiaToEdit, setHistoriaToEdit] = useState<HistoriaClinica | null>(null);
  const [atencionHCId, setAtencionHCId] = useState('');
  const [atencionNombre, setAtencionNombre] = useState('');
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleData, setDetalleData] = useState<{ historia: HistoriaClinica; refugiado: any } | null>(null);
  const [historias, setHistorias] = useState<HistoriaClinica[]>([]);
  const perPage = 15;

  useEffect(() => {
    if (campId) {
      obtenerHistoriasClinicas(campId).then(setHistorias);
    }
  }, [campId]);

  const campRefugiados = refugiados.filter(r => r.campamento_id === campId);

  const hcConRefugiado = useMemo(() => {
    return historias.map(hc => {
      const ref = campRefugiados.find(r => r.id === hc.refugiado_id);
      return { historia: hc, refugiado: ref };
    });
  }, [historias, campRefugiados]);

  const filtered = hcConRefugiado.filter(item => {
    if (!search) return true;
    const q = search.toUpperCase();
    return (
      item.refugiado?.nombres?.toUpperCase().includes(q) ||
      item.refugiado?.apellidos?.toUpperCase().includes(q) ||
      item.refugiado?.codigo?.toUpperCase().includes(q) ||
      item.refugiado?.cedula?.toString().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  if (!tienePermisoPorCampamento('Salud', campId, 'Ver')) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 gap-4">
        <Stethoscope size={64} strokeWidth={1} />
        <p className="text-lg font-medium">No tienes acceso al modulo de Salud</p>
      </div>
    );
  }

  const openAtencion = (hcId: string, refNombre: string) => {
    setAtencionHCId(hcId);
    setAtencionNombre(refNombre);
    setAtencionModalOpen(true);
    setContextMenuOpen(null);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/salud')} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors shadow-sm">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Historias Clinicas</h1>
          <p className="text-sm text-gray-500">{campamentoSeleccionado?.nombre}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar Integrante..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
          />
        </div>
        {tienePermisoPorCampamento('Salud', campId, 'Crear') && (
          <button
            onClick={() => { setHistoriaToEdit(null); setHistoriaModalOpen(true); }}
            className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md"
          >
            <Plus size={18} />
            Abrir Historia
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-4 font-semibold text-gray-600">Codigo</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Cedula</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Apellidos y Nombres</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Cama</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Fecha Apertura</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    <Stethoscope size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No se encontraron historias clinicas</p>
                  </td>
                </tr>
              )}
              {paginated.map(({ historia, refugiado }) => (
                <tr key={historia.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-caracas-blue">
                    {refugiado?.codigo || '-'}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {refugiado?.cedula || 'S/C'}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-800">
                      {refugiado?.apellidos || 'N/A'}, {refugiado?.nombres || 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {refugiado?.nro_cama || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {toDisplayDate(historia.fecha_apertura)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setDetalleData({ historia, refugiado: refugiado! });
                          setDetalleOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-caracas-blue hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver Detalle"
                      >
                        <Eye size={18} />
                      </button>
                      {tienePermisoPorCampamento('Salud', campId, 'Modificar') && (
                        <button
                          onClick={() => {
                            setHistoriaToEdit(historia);
                            setHistoriaModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-caracas-blue hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modificar Historia"
                        >
                          <Pencil size={18} />
                        </button>
                      )}
                      {tienePermisoPorCampamento('Salud', campId, 'Modificar') && (
                        <button
                          onClick={() => openAtencion(historia.id, `${refugiado?.apellidos || ''}, ${refugiado?.nombres || ''}`)}
                          className="p-2 text-gray-400 hover:text-caracas-blue hover:bg-blue-50 rounded-lg transition-colors"
                          title="Atención Médica"
                        >
                          <Stethoscope size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Mostrando {paginated.length} de {filtered.length} historias
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

      <HistoriaClinicaModal
        isOpen={historiaModalOpen}
        onClose={() => { setHistoriaModalOpen(false); setHistoriaToEdit(null); }}
        historiaToEdit={historiaToEdit}
      />
      <AtencionMedicaModal
        isOpen={atencionModalOpen}
        onClose={() => setAtencionModalOpen(false)}
        historiaClinicaId={atencionHCId}
        refugiadoNombre={atencionNombre}
      />
      <HistoriaClinicaDetalleModal
        isOpen={detalleOpen}
        onClose={() => { setDetalleOpen(false); setDetalleData(null); }}
        historia={detalleData?.historia || null}
        refugiado={detalleData?.refugiado || null}
      />
    </div>
  );
}
