import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, UserPlus, MoreHorizontal, FileText, Pencil, Trash2, ShieldOff } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import type { Refugiado } from '../types';
import RegistroModal from '../components/refugiados/RegistroModal';
import { formatAge } from '../lib/formatAge';

export default function Refugiados() {
  const { campamentoSeleccionado, refugiados = [], familias = [], eliminarRefugiado } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();

  const tieneAcceso = campamentoSeleccionado
    ? tienePermisoPorCampamento('Integrantes', campamentoSeleccionado.id, 'Ver')
    : true;

  if (!tieneAcceso) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldOff size={64} className="mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">Sin acceso a este campamento</p>
        <p className="text-sm text-gray-400 mt-1">No tienes permisos para ver los integrantes de {campamentoSeleccionado?.nombre}</p>
      </div>
    );
  }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const [editandoRefugiado, setEditandoRefugiado] = useState<Refugiado | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbiertoId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredRefugiados = useMemo(() => {
    if (!campamentoSeleccionado) return [];
    
    const term = searchTerm.toUpperCase();
    return refugiados
      .filter(r => r.campamento_id === campamentoSeleccionado.id)
      .filter(r => 
        r.nombres.includes(term) || 
        r.apellidos.includes(term) || 
        (r.cedula?.toString() || '').includes(term) ||
        (r.codigo || '').toUpperCase().includes(term)
      )
      .map(r => {
        let jerarquiaStr = 'Jefe de Familia';
        if (!r.es_jefe_familia && r.familia_id) {
          const familia = familias.find(f => f.id === r.familia_id);
          jerarquiaStr = `Miembro (${familia?.nombre || 'Familia Desconocida'})`;
        }

        return {
          id: r.id,
          codigo: r.codigo || '-',
          cedula: r.cedula?.toString() || 'S/N',
          nombres: r.nombres,
          apellidos: r.apellidos,
          edad: formatAge(r.fecha_nacimiento),
          jerarquia: jerarquiaStr,
          cama: r.nro_cama,
          refugiado: r
        };
      });
  }, [searchTerm, refugiados, campamentoSeleccionado, familias]);

  // Lógica de Paginación
  const REGISTROS_POR_PAGINA = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredRefugiados.length / REGISTROS_POR_PAGINA);
  const paginatedRefugiados = filteredRefugiados.slice(
    (currentPage - 1) * REGISTROS_POR_PAGINA,
    currentPage * REGISTROS_POR_PAGINA
  );

  // Reiniciar a la primera página cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleEliminar = (id: string) => {
    setMenuAbiertoId(null);
    if (window.confirm('¿Estás seguro de que deseas eliminar este integrante? Esta acción no se puede deshacer.')) {
      eliminarRefugiado(id);
    }
  };

  const handleModificar = (refugiado: Refugiado) => {
    setMenuAbiertoId(null);
    setEditandoRefugiado(refugiado);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Panel de Integrantes</h2>
          <p className="text-gray-500">
            Gestionando registros del <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
          </p>
        </div>
        {campamentoSeleccionado && tienePermisoPorCampamento('Integrantes', campamentoSeleccionado.id, 'Crear') && (
          <button 
            onClick={() => {
              setEditandoRefugiado(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-caracas-red/20 transform hover:-translate-y-0.5"
          >
            <UserPlus size={20} />
            Registrar Nuevo Integrante
          </button>
        )}
      </div>

      {/* Tarjeta Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
        
        {/* Barra de Herramientas (Búsqueda) */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por cédula, nombre o apellido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-sm uppercase"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium">
            Mostrando {filteredRefugiados.length} registros
          </div>
        </div>

        {/* Tabla Interactiva */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="py-4 px-6 font-semibold text-sm text-gray-500">Código</th>
                <th className="py-4 px-6 font-semibold text-sm text-gray-500">Cédula</th>
                <th className="py-4 px-6 font-semibold text-sm text-gray-500">Apellidos y Nombres</th>
                <th className="py-4 px-6 font-semibold text-sm text-gray-500">Edad</th>
                <th className="py-4 px-6 font-semibold text-sm text-gray-500">Jerarquía</th>
                <th className="py-4 px-6 font-semibold text-sm text-gray-500">Cama</th>
                <th className="py-4 px-6 font-semibold text-sm text-gray-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRefugiados.length > 0 ? (
                paginatedRefugiados.map((refugiado) => (
                  <tr key={refugiado.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors group">
                    <td className="py-3 px-6 text-sm font-medium text-caracas-blue">{refugiado.codigo || '-'}</td>
                    <td className="py-3 px-6 text-sm font-medium text-gray-700">{refugiado.cedula}</td>
                    <td className="py-3 px-6">
                      <div className="text-sm font-bold text-gray-800">{refugiado.apellidos}</div>
                      <div className="text-xs text-gray-500">{refugiado.nombres}</div>
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-600">{refugiado.edad}</td>
                    <td className="py-3 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        refugiado.jerarquia === 'Jefe de Familia' 
                          ? 'bg-caracas-blue/10 text-caracas-blue' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {refugiado.jerarquia}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-caracas-red">
                        <FileText size={14} />
                        {refugiado.cama}
                      </div>
                    </td>
                    <td className="py-3 px-6 text-right relative">
                      <button
                        onClick={() => setMenuAbiertoId(menuAbiertoId === refugiado.id ? null : refugiado.id)}
                        className="p-2 text-gray-400 hover:text-caracas-red hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {menuAbiertoId === refugiado.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-4 top-12 z-50 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden w-44"
                        >
                          {campamentoSeleccionado && tienePermisoPorCampamento('Integrantes', campamentoSeleccionado.id, 'Modificar') && (
                            <button
                              onClick={() => handleModificar(refugiado.refugiado)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-caracas-blue/5 hover:text-caracas-blue transition-colors text-left"
                            >
                              <Pencil size={16} />
                              Modificar
                            </button>
                          )}
                          {campamentoSeleccionado && tienePermisoPorCampamento('Integrantes', campamentoSeleccionado.id, 'Eliminar') && (
                            <button
                              onClick={() => handleEliminar(refugiado.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left border-t border-gray-100"
                            >
                              <Trash2 size={16} />
                              Eliminar
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Search size={48} className="text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-600">No se encontraron resultados</p>
                      <p className="text-sm text-gray-400">Intenta con otro término de búsqueda</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Controles de Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500">
              Página {currentPage} de {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Modal de Registro / Edición */}
      <RegistroModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditandoRefugiado(null);
        }}
        refugiadoToEdit={editandoRefugiado}
      />

    </div>
  );
}