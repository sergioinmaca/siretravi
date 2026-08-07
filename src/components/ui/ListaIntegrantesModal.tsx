import { useState } from 'react';
import { X, Users, Eye } from 'lucide-react';
import type { Refugiado, Familia } from '../../types';
import { PaginationControls } from './PaginationControls';
import { formatAge } from '../../lib/formatAge';

interface ListaIntegrantesModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  datos: Refugiado[];
  familias: Familia[];
  onVerDetalle: (refugiado: Refugiado) => void;
}

const PER_PAGE = 15;

export default function ListaIntegrantesModal({
  isOpen,
  onClose,
  titulo,
  datos,
  familias,
  onVerDetalle,
}: ListaIntegrantesModalProps) {
  const [page, setPage] = useState(1);

  if (!isOpen) return null;

  const totalPages = Math.ceil(datos.length / PER_PAGE);
  const paginated = datos.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const getJerarquia = (r: Refugiado) => {
    if (r.es_jefe_familia) return 'Jefe de Familia';
    const familia = familias.find(f => f.id === r.familia_id);
    return `Miembro — ${familia?.nombre || 'Sin familia'}`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[550px]">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-caracas-blue/10 rounded-lg">
              <Users size={20} className="text-caracas-blue" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">{titulo}</h2>
            <span className="text-sm text-gray-400">({datos.length})</span>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left sticky top-0 z-10">
                <th className="px-6 py-4 font-semibold text-gray-600">Apellidos y Nombres</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Género</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Edad</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Jerarquía</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                    <Users size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No hay integrantes en esta categoría</p>
                  </td>
                </tr>
              )}
              {paginated.map((ref) => (
                <tr key={ref.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <p className="font-semibold text-gray-800">{ref.apellidos}, {ref.nombres}</p>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ref.genero ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                      {ref.genero ? 'M' : 'F'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-gray-600">{formatAge(ref.fecha_nacimiento)}</td>
                  <td className="px-6 py-3.5 text-gray-600 text-sm">{getJerarquia(ref)}</td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => onVerDetalle(ref)}
                      className="p-2 text-gray-400 hover:text-caracas-blue hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver detalle"
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
    </div>
  );
}
