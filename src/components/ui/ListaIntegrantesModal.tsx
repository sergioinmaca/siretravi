import { useState, useMemo, useEffect } from 'react';
import { X, Users, Eye, ChevronUp, ChevronDown } from 'lucide-react';
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

function calcularEdad(fechaNacimiento: any): number {
  const d = fechaNacimiento instanceof Date ? fechaNacimiento : new Date(fechaNacimiento);
  if (isNaN(d.getTime())) return 0;
  const hoy = new Date();
  let edad = hoy.getFullYear() - d.getFullYear();
  const mes = hoy.getMonth() - d.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < d.getDate())) {
    edad--;
  }
  return edad;
}

export default function ListaIntegrantesModal({
  isOpen,
  onClose,
  titulo,
  datos,
  familias,
  onVerDetalle,
}: ListaIntegrantesModalProps) {
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (!sortColumn) return datos;
    const result = [...datos];
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'nombre':
          cmp = (a.apellidos || '').localeCompare(b.apellidos || '');
          if (cmp === 0) cmp = (a.nombres || '').localeCompare(b.nombres || '');
          break;
        case 'genero':
          cmp = (a.genero === b.genero) ? 0 : a.genero ? 1 : -1;
          break;
        case 'edad':
          cmp = calcularEdad(a.fecha_nacimiento) - calcularEdad(b.fecha_nacimiento);
          break;
        case 'jerarquia': {
          const ja = a.es_jefe_familia ? 0 : 1;
          const jb = b.es_jefe_familia ? 0 : 1;
          cmp = ja - jb;
          if (cmp === 0) {
            const famA = familias.find(f => f.id === a.familia_id)?.nombre || '';
            const famB = familias.find(f => f.id === b.familia_id)?.nombre || '';
            cmp = famA.localeCompare(famB);
          }
          break;
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [datos, sortColumn, sortDirection, familias]);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setSortColumn(null);
      setSortDirection('asc');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ChevronUp size={14} className="text-gray-300" />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-caracas-red" />
      : <ChevronDown size={14} className="text-caracas-red" />;
  };

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
            <span className="text-sm text-gray-400">({sorted.length})</span>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left sticky top-0 z-10">
                <th
                  className="px-6 py-4 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('nombre')}
                >
                  <span className="inline-flex items-center gap-1">
                    Apellidos y Nombres {renderSortIcon('nombre')}
                  </span>
                </th>
                <th
                  className="px-6 py-4 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('genero')}
                >
                  <span className="inline-flex items-center gap-1">
                    Género {renderSortIcon('genero')}
                  </span>
                </th>
                <th
                  className="px-6 py-4 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('edad')}
                >
                  <span className="inline-flex items-center gap-1">
                    Edad {renderSortIcon('edad')}
                  </span>
                </th>
                <th
                  className="px-6 py-4 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('jerarquia')}
                >
                  <span className="inline-flex items-center gap-1">
                    Jerarquía {renderSortIcon('jerarquia')}
                  </span>
                </th>
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
              {paginated.map((ref) => {
                try {
                  return (
                    <tr key={ref.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-gray-800">{ref.apellidos}, {ref.nombres}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ref.genero ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                          {ref.genero ? 'M' : 'F'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">{ref.fecha_nacimiento ? formatAge(ref.fecha_nacimiento) : '—'}</td>
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
                  );
                } catch (err) {
                  console.error('Error en fila:', err, 'ref:', ref);
                  return (
                    <tr key={ref.id}>
                      <td colSpan={5} className="px-6 py-3.5 text-red-500 text-sm">
                        Error: {String(err)}
                      </td>
                    </tr>
                  );
                }
              })}
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
