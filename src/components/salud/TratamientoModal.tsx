import { useState } from 'react';
import { X, Save, Pill } from 'lucide-react';
import { agregarTratamiento } from '../../lib/salud';

interface TratamientoModalProps {
  isOpen: boolean;
  onClose: () => void;
  historiaClinicaId: string;
  refugiadoNombre: string;
}

export default function TratamientoModal({ isOpen, onClose, historiaClinicaId, refugiadoNombre }: TratamientoModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    medicamento: '',
    hora: '',
    dosis: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicamento.trim() || !formData.hora.trim()) {
      alert('El medicamento y la hora son obligatorios.');
      return;
    }

    setIsSubmitting(true);

    try {
      await agregarTratamiento({
        id: '',
        historia_clinica_id: historiaClinicaId,
        medicamento: formData.medicamento.toUpperCase(),
        hora: formData.hora,
        dosis: formData.dosis || undefined,
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up relative">
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Agregar Tratamiento</h2>
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
              <Pill size={20} className="text-green-600" />
              <p className="font-medium">Tratamiento agregado exitosamente!</p>
            </div>
          )}

          <form id="tratamiento-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Pill size={18} className="text-amber-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Datos del Tratamiento</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medicamento <span className="text-caracas-red">*</span></label>
                  <input
                    type="text"
                    value={formData.medicamento}
                    onChange={(e) => setFormData(prev => ({ ...prev, medicamento: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                    placeholder="EJ. INSULINA, LEVOTIROXINA"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora <span className="text-caracas-red">*</span></label>
                  <input
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData(prev => ({ ...prev, hora: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dosis</label>
                  <input
                    type="text"
                    value={formData.dosis}
                    onChange={(e) => setFormData(prev => ({ ...prev, dosis: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                    placeholder="EJ. 10 UI, 50 MCG"
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
          <button form="tratamiento-form" type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-8 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={18} />
            {isSubmitting ? 'Guardando...' : 'Agregar Tratamiento'}
          </button>
        </div>
      </div>
    </div>
  );
}
