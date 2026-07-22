import { useState, useMemo } from 'react';
import { Tent, BedDouble, MapPin, Plus, ShieldOff } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import type { Campamento } from '../types';
import CrearRefugioModal from '../components/constructor/CrearRefugioModal';

export default function Constructor() {
  const { campamentos } = useCampamento();
  const { tienePermiso, obtenerCampamentosPermitidos } = useAuth();

  const campamentosPermitidos = useMemo(() => {
    const idsPermitidos = obtenerCampamentosPermitidos('Constructor');
    if (idsPermitidos === null) return campamentos;
    return campamentos.filter(c => idsPermitidos.includes(c.id));
  }, [campamentos, obtenerCampamentosPermitidos]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCamp, setEditingCamp] = useState<Campamento | null>(null);

  const calcularTotalCamas = (campamento: typeof campamentos[0]) => {
    return campamento.modulos.reduce((total, c) => {
      return total + (c.literas * 2) + c.camas_individuales + (c.camas_duplex * 2);
    }, 0);
  };

  return (
    <div className="space-y-6">

      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Constructor de Campamentos</h2>
          <p className="text-gray-500">Gestiona la infraestructura de los campamentos y sus módulos</p>
        </div>
        {tienePermiso('Constructor', 'Crear') && (
          <button
            onClick={() => {
              setEditingCamp(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-caracas-red/20 transform hover:-translate-y-0.5"
          >
            <Plus size={20} />
            Crear Nuevo Campamento
          </button>
        )}
      </div>

      {/* Grid de Cards */}
      {campamentosPermitidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ShieldOff size={64} className="mb-4 opacity-40" />
          <p className="text-lg font-medium text-gray-500">Sin acceso a campamentos</p>
          <p className="text-sm text-gray-400 mt-1">No tienes permisos para gestionar ningún campamento en el módulo Constructor</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campamentosPermitidos.map((camp) => (
          <div
            key={camp.id}
            onClick={() => {
              setEditingCamp(camp);
              setIsModalOpen(true);
            }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-caracas-red/30 cursor-pointer transition-all duration-300 group"
          >
            {/* Header de la Card */}
            <div className="bg-gradient-to-r from-caracas-red to-red-700 p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
              <h3 className="text-lg font-bold text-white relative z-10 truncate">{camp.nombre}</h3>
              <div className="flex items-center gap-1.5 mt-1.5 relative z-10">
                <MapPin size={14} className="text-white/70" />
                <p className="text-sm text-white/80 truncate">{camp.ubicacion}</p>
              </div>
              <span className={`absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full z-10 ${
                camp.estado === 'activo' ? 'bg-green-400/20 text-green-100' : 'bg-gray-400/20 text-gray-200'
              }`}>
                {camp.estado === 'activo' ? '● Activo' : '○ Inactivo'}
              </span>
            </div>

            {/* Body de la Card */}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl text-center group-hover:bg-caracas-blue/5 transition-colors">
                  <Tent size={24} className="mx-auto mb-1 text-caracas-blue" />
                  <p className="text-2xl font-bold text-gray-800">{camp.modulos.length}</p>
                  <p className="text-xs text-gray-500 font-medium">Módulo{camp.modulos.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl text-center group-hover:bg-caracas-red/5 transition-colors">
                  <BedDouble size={24} className="mx-auto mb-1 text-caracas-red" />
                  <p className="text-2xl font-bold text-gray-800">{calcularTotalCamas(camp)}</p>
                  <p className="text-xs text-gray-500 font-medium">Camas</p>
                </div>
              </div>

              {/* Resumen de modulos */}
              <div className="mt-4 space-y-2">
                {camp.modulos.slice(0, 3).map((modulo) => (
                  <div key={modulo.id} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="font-medium text-gray-700 truncate">{modulo.nombre}</span>
                    <span className="text-xs text-gray-500 shrink-0 ml-2">
                      {modulo.literas}L · {modulo.camas_individuales}I · {modulo.camas_duplex}D
                    </span>
                  </div>
                ))}
                {camp.modulos.length > 3 && (
                  <p className="text-xs text-gray-400 text-center">+{camp.modulos.length - 3} módulo(s) más</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal de Creación / Edición */}
      <CrearRefugioModal
        key={editingCamp?.id || 'create'}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCamp(null);
        }}
        campamentoToEdit={editingCamp}
      />
    </div>
  );
}
