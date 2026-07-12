import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCampamento } from '../../context/CampamentoContext';
import { ArrowLeft, Stethoscope, Search, Plus, MoreVertical } from 'lucide-react';
import HistoriaClinicaModal from '../../components/salud/HistoriaClinicaModal';
import AtencionMedicaModal from '../../components/salud/AtencionMedicaModal';
import type { HistoriaClinica, Refugiado } from '../../types';

export default function HistoriasClinicas() {
  const navigate = useNavigate();
  const { campamentoSeleccionado, refugiados, historiasClinicas } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();
  const campId = campamentoSeleccionado?.id || '';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [historiaModalOpen, setHistoriaModalOpen] = useState(false);
  const [atencionModalOpen, setAtencionModalOpen] = useState(false);
  const [historiaToEdit, setHistoriaToEdit] = useState<HistoriaClinica | null>(null);
  const [atencionHCId, setAtencionHCId] = useState('');
  const [atencionNombre, setAtencionNombre] = useState('');
  const [contextMenuOpen, setContextMenuOpen] = useState<string | null>(null);
  const perPage = 15;

  const campRefugiados = refugiados.filter(r => r.campamento_id === campId);
  const campHistorias = historiasClinicas.filter(hc =>
    campRefugiados.some(r => r.id === hc.refugiado_id)
  );

  const hcConRefugiado = useMemo(() => {
    return campHistorias.map(hc => {
      const ref = campRefugiados.find(r => r.id === hc.refugiado_id);
      return { historia: hc, refugiado: ref };
    });
  }, [campHistorias, campRefugiados]);

  const filtered = hcConRefugiado.filter(item => {
    if (!search) return true;
    const q = search.toUpperCase();
    return (
      item.refugiado?.nombres?.toUpperCase().includes(q) ||
      item.refugiado?.apellidos?.toUpperCase().includes(q) ||
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
            placeholder="Buscar por nombre, apellido o cedula..."
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
                <th className="px-6 py-4 font-semibold text-gray-600">Cedula</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Apellidos y Nombres</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Cama</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Fecha Apertura</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                    <Stethoscope size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No se encontraron historias clinicas</p>
                  </td>
                </tr>
              )}
              {paginated.map(({ historia, refugiado }) => (
                <tr key={historia.id} className="hover:bg-gray-50 transition-colors">
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
                    {historia.fecha_apertura instanceof Date
                      ? historia.fecha_apertura.toLocaleDateString('es-VE')
                      : new Date(historia.fecha_apertura).toLocaleDateString('es-VE')}
                  </td>
                  <td className="px-6 py-4 text-center relative">
                    <button
                      onClick={() => setContextMenuOpen(contextMenuOpen === historia.id ? null : historia.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical size={18} className="text-gray-500" />
                    </button>
                    {contextMenuOpen === historia.id && (
                      <div className="absolute right-6 top-12 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[180px]">
                        {tienePermisoPorCampamento('Salud', campId, 'Modificar') && (
                          <button
                            onClick={() => {
                              setHistoriaToEdit(historia);
                              setHistoriaModalOpen(true);
                              setContextMenuOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Modificar Historia
                          </button>
                        )}
                        {tienePermisoPorCampamento('Salud', campId, 'Modificar') && (
                          <button
                            onClick={() => openAtencion(historia.id, `${refugiado?.apellidos || ''}, ${refugiado?.nombres || ''}`)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Atencion Medica
                          </button>
                        )}
                      </div>
                    )}
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
    </div>
  );
}
