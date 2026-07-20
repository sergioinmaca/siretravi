import { useState, useMemo } from 'react';
import { Users, Search, ChevronRight, ShieldOff, Trash2 } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import DetalleFamiliaModal from '../components/familias/DetalleFamiliaModal';
import type { Familia } from '../types';

export default function Familias() {
  const { campamentoSeleccionado, familias = [], refugiados = [], eliminarFamilia } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();

  const tieneAcceso = campamentoSeleccionado
    ? tienePermisoPorCampamento('Familias', campamentoSeleccionado.id, 'Ver')
    : true;

  if (!tieneAcceso) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldOff size={64} className="mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">Sin acceso a este campamento</p>
        <p className="text-sm text-gray-400 mt-1">No tienes permisos para ver las familias de {campamentoSeleccionado?.nombre}</p>
      </div>
    );
  }
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamilia, setSelectedFamilia] = useState<Familia | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const familiasDelCampamento = useMemo(() => {
    if (!campamentoSeleccionado) return [];
    const term = searchTerm.toUpperCase();
    return familias
      .filter(f => f.campamento_id === campamentoSeleccionado.id)
      .filter(f => f.nombre.includes(term))
      .map(f => {
        const integrantes = refugiados.filter(r => r.familia_id === f.id);
        return { ...f, integrantes: integrantes.length };
      });
  }, [searchTerm, familias, refugiados, campamentoSeleccionado]);

  const openModal = (familia: Familia) => {
    setSelectedFamilia(familia);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFamilia(null);
  };

  const handleEliminar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas eliminar esta familia? Esta acción no se puede deshacer.')) {
      eliminarFamilia(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Módulo de Familias</h2>
          <p className="text-gray-500">
            Gestionando familias del <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
          </p>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative w-full max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar familia..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-sm uppercase"
        />
      </div>

      {/* Grid de Cards */}
      {familiasDelCampamento.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {familiasDelCampamento.map((fam) => (
            <div
              key={fam.id}
              onClick={() => openModal(fam)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-caracas-red/30 cursor-pointer transition-all duration-300 group"
            >
              <div className="bg-gradient-to-r from-caracas-blue to-blue-700 p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white break-words">{fam.nombre.replace('FAMILIA ', 'FLIA. ')}</h3>
                    </div>
                  <ChevronRight size={20} className="text-white/50 group-hover:text-white transition-colors shrink-0" />
                </div>
              </div>
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users size={16} className="text-caracas-blue" />
                  <span className="font-medium text-base">{fam.integrantes} miembro{fam.integrantes !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-caracas-blue font-medium group-hover:underline">Ver detalle</span>
                  {campamentoSeleccionado && tienePermisoPorCampamento('Familias', campamentoSeleccionado.id, 'Eliminar') && (
                    <button
                      onClick={(e) => handleEliminar(e, fam.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar familia"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-gray-400">
          <Users size={64} className="mb-4 opacity-40" />
          <p className="text-lg font-medium text-gray-500">No hay familias registradas</p>
          <p className="text-sm text-gray-400 mt-1">
            Las familias se crean automáticamente al registrar un integrante como Jefe de Familia
          </p>
        </div>
      )}

      {/* Modal de Detalle */}
      <DetalleFamiliaModal
        isOpen={isModalOpen}
        onClose={closeModal}
        familia={selectedFamilia}
      />
    </div>
  );
}