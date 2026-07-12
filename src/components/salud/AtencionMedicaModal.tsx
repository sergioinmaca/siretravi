import { useState } from 'react';
import { useCampamento } from '../../context/CampamentoContext';
import { X, Save, Activity } from 'lucide-react';
import { toDateInput } from '../../lib/formatDate';

interface AtencionMedicaModalProps {
  isOpen: boolean;
  onClose: () => void;
  historiaClinicaId: string;
  refugiadoNombre: string;
}

export default function AtencionMedicaModal({ isOpen, onClose, historiaClinicaId, refugiadoNombre }: AtencionMedicaModalProps) {
  const { agregarAtencionMedica } = useCampamento();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fechaAtencion: toDateInput(new Date()),
    presionArterial: '',
    temperatura: '',
    frecuenciaCardiaca: '',
    peso: '',
    talla: '',
    saturacionOxigeno: '',
    observaciones: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await agregarAtencionMedica({
        id: '',
        historia_clinica_id: historiaClinicaId,
        fecha_atencion: new Date(formData.fechaAtencion),
        presion_arterial: formData.presionArterial || undefined,
        temperatura: formData.temperatura ? parseFloat(formData.temperatura) : undefined,
        frecuencia_cardiaca: formData.frecuenciaCardiaca ? parseInt(formData.frecuenciaCardiaca) : undefined,
        peso: formData.peso ? parseFloat(formData.peso) : undefined,
        talla: formData.talla ? parseFloat(formData.talla) : undefined,
        saturacion_oxigeno: formData.saturacionOxigeno ? parseInt(formData.saturacionOxigeno) : undefined,
        observaciones: formData.observaciones || undefined,
        created_at: new Date(),
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up relative">
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Registrar Atencion Medica</h2>
            <p className="text-sm text-gray-500 mt-1">
              Paciente: <span className="font-semibold text-caracas-red">{refugiadoNombre}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30">
          {showSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <Activity size={20} className="text-green-600" />
              <p className="font-medium">Atencion medica registrada exitosamente!</p>
            </div>
          )}

          <form id="atencion-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-caracas-red/10 rounded-lg">
                  <Activity size={18} className="text-caracas-red" />
                </div>
                <h3 className="font-semibold text-gray-800">Signos Vitales y Datos de la Consulta</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Atencion</label>
                  <input
                    type="date"
                    value={formData.fechaAtencion}
                    onChange={(e) => setFormData(prev => ({ ...prev, fechaAtencion: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Presion Arterial</label>
                  <input
                    type="text"
                    value={formData.presionArterial}
                    onChange={(e) => setFormData(prev => ({ ...prev, presionArterial: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    placeholder="EJ. 120/80"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura (&deg;C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temperatura}
                    onChange={(e) => setFormData(prev => ({ ...prev, temperatura: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    placeholder="EJ. 36.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia Cardiaca (lpm)</label>
                  <input
                    type="number"
                    value={formData.frecuenciaCardiaca}
                    onChange={(e) => setFormData(prev => ({ ...prev, frecuenciaCardiaca: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    placeholder="EJ. 72"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.peso}
                    onChange={(e) => setFormData(prev => ({ ...prev, peso: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    placeholder="EJ. 70.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Talla (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.talla}
                    onChange={(e) => setFormData(prev => ({ ...prev, talla: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    placeholder="EJ. 170"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Saturacion de Oxigeno (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.saturacionOxigeno}
                    onChange={(e) => setFormData(prev => ({ ...prev, saturacionOxigeno: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    placeholder="EJ. 98"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value.toUpperCase() }))}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase resize-none"
                    placeholder="Observaciones de la consulta medica..."
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} type="button" className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button form="atencion-form" type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-8 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={18} />
            {isSubmitting ? 'Guardando...' : 'Registrar Atencion'}
          </button>
        </div>
      </div>
    </div>
  );
}
