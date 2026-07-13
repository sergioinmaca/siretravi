import { X, Users, BedDouble, Calendar, MapPin, Home } from 'lucide-react';
import { useCampamento } from '../../context/CampamentoContext';
import { toDisplayDate } from '../../lib/formatDate';
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
  const jefe = integrantes.find(r => r.es_jefe_familia);

  const sortedIntegrantes = [...integrantes].sort((a, b) =>
    a.es_jefe_familia ? -1 : b.es_jefe_familia ? 1 : 0
  );

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
          <div className="flex-1 text-center ml-8">
            <h2 className="text-xl font-bold text-gray-800">Ficha Familiar</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {familia.nombre} — {integrantes.length} integrante{integrantes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors shrink-0">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30 space-y-6">

          {/* Ficha del Jefe de Familia */}
          {jefe && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Fecha de Registro</h4>
                  <div className="flex items-center gap-2 text-gray-800">
                    <Calendar size={16} className="text-caracas-blue shrink-0" />
                    <span className="font-medium">{jefe.fecha_ingreso ? toDisplayDate(jefe.fecha_ingreso) : '—'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Procedencia</h4>
                  <div className="flex items-center gap-2 text-gray-800 justify-end">
                    <MapPin size={16} className="text-caracas-blue shrink-0" />
                    <span className="font-medium">{jefe.procedencia || '—'}</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Dirección</h4>
                <div className="flex items-center gap-2 text-gray-800">
                  <Home size={16} className="text-caracas-blue shrink-0" />
                  <span className="font-medium">{jefe.direccion_exacta || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Integrantes */}
          {integrantes.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Código</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Cédula</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Apellidos y Nombres</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Edad</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Género</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Cama</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Parentesco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedIntegrantes.map((p) => (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-6 text-sm font-medium text-caracas-blue">{p.codigo || '—'}</td>
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
                            {p.nro_cama || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-600">
                          {p.es_jefe_familia ? '' : (p.parentesco || '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-gray-400">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-gray-500">Esta familia no tiene integrantes registrados</p>
            </div>
          )}

          {/* Situación Socioeconómica de la Vivienda de Origen */}
          {jefe && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MapPin size={18} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Situación Socioeconómica de la Vivienda de Origen</h3>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Condición de la vivienda tras el sismo</h4>
                  <p className="text-sm font-medium text-gray-800">{jefe.condicion_vivienda || '—'}</p>
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tenencia de la Vivienda</h4>
                  <p className="text-sm font-medium text-gray-800">{jefe.tenencia_vivienda || '—'}</p>
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Ingreso Familiar Principal antes de la Emergencia</h4>
                  <p className="text-sm font-medium text-gray-800">{jefe.ingreso_familiar || '—'}</p>
                </div>
              </div>
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
