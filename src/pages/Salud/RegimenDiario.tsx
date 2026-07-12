import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCampamento } from '../../context/CampamentoContext';
import { ArrowLeft, Pill, Clock, Plus, Trash2 } from 'lucide-react';
import TratamientoModal from '../../components/salud/TratamientoModal';

export default function RegimenDiario() {
  const navigate = useNavigate();
  const { campamentoSeleccionado, refugiados, historiasClinicas, tratamientos, eliminarTratamiento } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();
  const campId = campamentoSeleccionado?.id || '';
  const [tratamientoModalOpen, setTratamientoModalOpen] = useState(false);
  const [selectedHCId, setSelectedHCId] = useState('');
  const [selectedNombre, setSelectedNombre] = useState('');

  const campRefugiados = refugiados.filter(r => r.campamento_id === campId);

  const pacientesCronicos = campRefugiados.filter(r => r.enfermedad_cronica);

  const getHCForRefugiado = (refugiadoId: string) =>
    historiasClinicas.find(hc => hc.refugiado_id === refugiadoId);

  const getTratamientosForHC = (hcId: string) =>
    tratamientos
      .filter(t => t.historia_clinica_id === hcId)
      .sort((a, b) => a.hora.localeCompare(b.hora));

  const openTratamiento = (hcId: string, nombre: string) => {
    setSelectedHCId(hcId);
    setSelectedNombre(nombre);
    setTratamientoModalOpen(true);
  };

  if (!tienePermisoPorCampamento('Salud', campId, 'Ver')) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 gap-4">
        <Pill size={64} strokeWidth={1} />
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
          <h1 className="text-2xl font-bold text-gray-800">Regimen Diario</h1>
          <p className="text-sm text-gray-500">{campamentoSeleccionado?.nombre} — Pacientes con tratamiento de por vida</p>
        </div>
      </div>

      {pacientesCronicos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Pill size={64} strokeWidth={1} className="mb-4" />
          <p className="text-lg font-medium">No hay pacientes con enfermedades cronicas</p>
          <p className="text-sm mt-1">Los pacientes con checkbox marcado en "enfermedad que requiera tratamiento de por vida" apareceran aqui</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pacientesCronicos.map(refugiado => {
          const hc = getHCForRefugiado(refugiado.id);
          const tratamientosDelPaciente = hc ? getTratamientosForHC(hc.id) : [];

          return (
            <div key={refugiado.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-gradient-to-r from-caracas-blue to-blue-800 px-6 py-4">
                <h3 className="text-lg font-bold text-white">
                  {refugiado.apellidos}, {refugiado.nombres}
                </h3>
                <p className="text-blue-100 text-sm">
                  C.I: {refugiado.cedula || 'S/C'} | Cama: {refugiado.nro_cama || 'N/A'}
                </p>
              </div>
              <div className="p-6">
                {tratamientosDelPaciente.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-gray-400">
                    <Pill size={28} className="mb-2" />
                    <p className="text-sm">Sin tratamientos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tratamientosDelPaciente.map(tr => (
                      <div key={tr.id} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                        <div className="p-1.5 bg-amber-100 rounded-lg shrink-0">
                          <Clock size={16} className="text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm">{tr.medicamento}</p>
                          <p className="text-xs text-gray-500">
                            {tr.hora}{tr.dosis ? ` — ${tr.dosis}` : ''}
                          </p>
                        </div>
                        {tienePermisoPorCampamento('Salud', campId, 'Eliminar') && (
                          <button
                            onClick={() => eliminarTratamiento(tr.id)}
                            className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                            title="Eliminar tratamiento"
                          >
                            <Trash2 size={14} className="text-red-400 hover:text-red-600" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {hc && tienePermisoPorCampamento('Salud', campId, 'Modificar') && (
                  <button
                    onClick={() => openTratamiento(hc.id, `${refugiado.apellidos}, ${refugiado.nombres}`)}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-medium transition-colors"
                  >
                    <Plus size={16} />
                    Agregar Tratamiento
                  </button>
                )}

                {!hc && (
                  <p className="mt-4 text-xs text-center text-gray-400">
                    Abra primero la historia clinica para registrar tratamientos
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TratamientoModal
        isOpen={tratamientoModalOpen}
        onClose={() => setTratamientoModalOpen(false)}
        historiaClinicaId={selectedHCId}
        refugiadoNombre={selectedNombre}
      />
    </div>
  );
}
