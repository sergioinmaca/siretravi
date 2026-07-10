import { X, Users, BedDouble } from 'lucide-react';
import { useCampamento } from '../../context/CampamentoContext';
import type { Familia } from '../../types';

interface DetalleFamiliaModalProps {
  isOpen: boolean;
  onClose: () => void;
  familia: Familia | null;
}

export default function DetalleFamiliaModal({ isOpen, onClose, familia }: DetalleFamiliaModalProps) {
  const { refugiados = [] } = useCampamento();

  if (!isOpen || !familia) return null;

  const integrantes = refugiados.filter(r => r.familia_id === familia.id);

  const calcularEdad = (fechaNacimiento: Date | string) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{familia.nombre}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {integrantes.length} integrante{integrantes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30">
          {integrantes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100">
                    <th className="py-4 px-6 font-semibold text-sm text-gray-500">Cédula</th>
                    <th className="py-4 px-6 font-semibold text-sm text-gray-500">Apellidos y Nombres</th>
                    <th className="py-4 px-6 font-semibold text-sm text-gray-500">Edad</th>
                    <th className="py-4 px-6 font-semibold text-sm text-gray-500">Género</th>
                    <th className="py-4 px-6 font-semibold text-sm text-gray-500">Cama</th>
                    <th className="py-4 px-6 font-semibold text-sm text-gray-500">Procedencia</th>
                    <th className="py-4 px-6 font-semibold text-sm text-gray-500">Jefe</th>
                  </tr>
                </thead>
                <tbody>
                  {integrantes.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-6 text-sm font-medium text-gray-700">{p.cedula?.toString() || 'S/N'}</td>
                      <td className="py-3 px-6">
                        <div className="text-sm font-bold text-gray-800">{p.apellidos}</div>
                        <div className="text-xs text-gray-500">{p.nombres}</div>
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-600">{calcularEdad(p.fecha_nacimiento)} años</td>
                      <td className="py-3 px-6">
                        <span className={`text-sm font-medium ${p.genero ? 'text-blue-600' : 'text-pink-600'}`}>
                          {p.genero ? 'M' : 'F'}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-caracas-red">
                          <BedDouble size={14} />
                          {p.nro_cama}
                        </div>
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-600">{p.procedencia || '-'}</td>
                      <td className="py-3 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          p.es_jefe_familia
                            ? 'bg-caracas-blue/10 text-caracas-blue'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {p.es_jefe_familia ? 'Sí' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-gray-500">Esta familia no tiene integrantes registrados</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}