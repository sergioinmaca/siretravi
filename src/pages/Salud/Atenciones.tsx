import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCampamento } from '../../context/CampamentoContext';
import { ArrowLeft, Search, Eye, Plus, Stethoscope } from 'lucide-react';
import AtencionMedicaModal from '../../components/salud/AtencionMedicaModal';
import HistorialAtencionesModal from '../../components/salud/HistorialAtencionesModal';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { formatCedula } from '../../lib/formatCedula';

export default function Atenciones() {
  const navigate = useNavigate();
  const { campamentoSeleccionado, refugiados } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();
  const campId = campamentoSeleccionado?.id || '';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;

  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [historialRefugiadoId, setHistorialRefugiadoId] = useState('');
  const [historialRefugiadoNombre, setHistorialRefugiadoNombre] = useState('');

  const [atencionModalOpen, setAtencionModalOpen] = useState(false);

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

  const handleVerHistorial = (ref: any) => {
    setHistorialRefugiadoId(ref.id);
    setHistorialRefugiadoNombre(`${ref.apellidos}, ${ref.nombres}`);
    setHistorialModalOpen(true);
  };

  const handleCloseHistorial = () => {
    setHistorialModalOpen(false);
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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar Integrante..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
          />
        </div>
        <button
          onClick={() => setAtencionModalOpen(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm"
        >
          <Plus size={18} />
          Registrar Atención, Beneficio o Donación
        </button>
      </div>

      {!search && (
        <div className="text-sm text-gray-500 font-medium mb-3">
          Mostrando {filtered.length} registros
        </div>
      )}

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
                <tr key={ref.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-caracas-blue">{ref.codigo || '-'}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{formatCedula(ref.cedula) ?? 'S/C'}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-800">{ref.apellidos}, {ref.nombres}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{ref.nro_cama || 'N/A'}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleVerHistorial(ref)}
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
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            loading={false}
            onChange={setPage}
            isMobile={false}
          />
        )}
      </div>

      <HistorialAtencionesModal
        isOpen={historialModalOpen}
        onClose={handleCloseHistorial}
        refugiadoId={historialRefugiadoId}
        refugiadoNombre={historialRefugiadoNombre}
        tienePermisoModificar={tienePermisoPorCampamento('Salud', campId, 'Modificar')}
        tienePermisoEliminar={tienePermisoPorCampamento('Salud', campId, 'Eliminar')}
      />

      <AtencionMedicaModal
        isOpen={atencionModalOpen}
        onClose={() => setAtencionModalOpen(false)}
      />
    </div>
  );
}
