import { useState, useEffect } from 'react';
import { useCampamento } from '../../context/CampamentoContext';
import { X, Save, Search, User, Stethoscope } from 'lucide-react';
import type { Refugiado, HistoriaClinica } from '../../types';

interface HistoriaClinicaModalProps {
  isOpen: boolean;
  onClose: () => void;
  historiaToEdit?: HistoriaClinica | null;
  refugiadoPreseleccionado?: Refugiado | null;
}

const TIPOS_DISCAPACIDAD = [
  'Fisica o motriz',
  'Sensorial',
  'Intelectual',
  'Psicosocial o mental',
  'Visceral u Organica',
  'Multiple',
];

export default function HistoriaClinicaModal({ isOpen, onClose, historiaToEdit, refugiadoPreseleccionado }: HistoriaClinicaModalProps) {
  const { campamentoSeleccionado, refugiados, historiasClinicas, agregarHistoriaClinica, actualizarHistoriaClinica } = useCampamento();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [cedulaBusqueda, setCedulaBusqueda] = useState('');
  const [refugiadoEncontrado, setRefugiadoEncontrado] = useState<Refugiado | null>(refugiadoPreseleccionado || null);
  const [formData, setFormData] = useState({
    tipoDiscapacidad: '',
    tipoAlergia: '',
    medicamentoEnfermedad: '',
    lesionSismoDetalle: '',
    adultoMayorDetalle: '',
    lactanteDetalle: '',
    enfermedadesPrevias: '',
    cirugias: '',
    examenSubjetivo: '',
    examenObjetivo: '',
    examenDiagnostico: '',
    fechaApertura: new Date().toISOString().split('T')[0],
  });

  const isEditing = !!historiaToEdit;

  useEffect(() => {
    if (isOpen && historiaToEdit) {
      setFormData({
        tipoDiscapacidad: historiaToEdit.tipo_discapacidad || '',
        tipoAlergia: historiaToEdit.tipo_alergia || '',
        medicamentoEnfermedad: historiaToEdit.medicamento_enfermedad || '',
        lesionSismoDetalle: historiaToEdit.lesion_sismo_detalle || '',
        adultoMayorDetalle: historiaToEdit.adulto_mayor_detalle || '',
        lactanteDetalle: historiaToEdit.lactante_detalle || '',
        enfermedadesPrevias: historiaToEdit.enfermedades_previas || '',
        cirugias: historiaToEdit.cirugias || '',
        examenSubjetivo: historiaToEdit.examen_subjetivo || '',
        examenObjetivo: historiaToEdit.examen_objetivo || '',
        examenDiagnostico: historiaToEdit.examen_diagnostico || '',
        fechaApertura: historiaToEdit.fecha_apertura instanceof Date
          ? historiaToEdit.fecha_apertura.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      });
      const refConHC = refugiados.find(r => r.id === historiaToEdit.refugiado_id);
      if (refConHC) setRefugiadoEncontrado(refConHC);
    } else if (isOpen && !historiaToEdit) {
      setFormData({
        tipoDiscapacidad: '', tipoAlergia: '', medicamentoEnfermedad: '',
        lesionSismoDetalle: '', adultoMayorDetalle: '', lactanteDetalle: '',
        enfermedadesPrevias: '', cirugias: '',
        examenSubjetivo: '', examenObjetivo: '', examenDiagnostico: '',
        fechaApertura: new Date().toISOString().split('T')[0],
      });
      setRefugiadoEncontrado(refugiadoPreseleccionado || null);
      setCedulaBusqueda(refugiadoPreseleccionado?.cedula?.toString() || '');
    }
  }, [isOpen, historiaToEdit, refugiadoPreseleccionado]);

  const buscarPorCedula = () => {
    if (!cedulaBusqueda.trim()) return;
    const cedulaNum = parseInt(cedulaBusqueda.trim());
    if (isNaN(cedulaNum)) return;

    const encontrado = refugiados.find(
      r => r.cedula === cedulaNum && r.campamento_id === campamentoSeleccionado?.id
    );

    if (encontrado) {
      const yaTieneHC = historiasClinicas.some(hc => hc.refugiado_id === encontrado.id);
      if (yaTieneHC && !isEditing) {
        alert('Este refugiado ya tiene una historia clinica abierta.');
        return;
      }
      setRefugiadoEncontrado(encontrado);
    } else {
      alert('No se encontro ningun refugiado con esa cedula en este campamento.');
      setRefugiadoEncontrado(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refugiadoEncontrado && !isEditing) {
      alert('Debe buscar un refugiado por cedula primero.');
      return;
    }

    setIsSubmitting(true);

    try {
      const hcPayload: HistoriaClinica = {
        id: historiaToEdit?.id || '',
        refugiado_id: historiaToEdit?.refugiado_id || refugiadoEncontrado!.id,
        tipo_discapacidad: formData.tipoDiscapacidad || undefined,
        tipo_alergia: formData.tipoAlergia || undefined,
        medicamento_enfermedad: formData.medicamentoEnfermedad || undefined,
        lesion_sismo_detalle: formData.lesionSismoDetalle || undefined,
        adulto_mayor_detalle: formData.adultoMayorDetalle || undefined,
        lactante_detalle: formData.lactanteDetalle || undefined,
        enfermedades_previas: formData.enfermedadesPrevias || undefined,
        cirugias: formData.cirugias || undefined,
        examen_subjetivo: formData.examenSubjetivo || undefined,
        examen_objetivo: formData.examenObjetivo || undefined,
        examen_diagnostico: formData.examenDiagnostico || undefined,
        fecha_apertura: new Date(formData.fechaApertura),
        created_at: new Date(),
      };

      if (isEditing && historiaToEdit) {
        await actualizarHistoriaClinica(historiaToEdit.id, hcPayload);
      } else {
        await agregarHistoriaClinica(hcPayload);
      }

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

  if (!isOpen) return null;

  const refConFlags = refugiadoEncontrado
    ? { discapacidad: refugiadoEncontrado.discapacidad, alergias: refugiadoEncontrado.alergias, enfermedad_cronica: refugiadoEncontrado.enfermedad_cronica, lesion_sismo: refugiadoEncontrado.lesion_sismo, adulto_mayor_dependencia: refugiadoEncontrado.adulto_mayor_dependencia, lactante: refugiadoEncontrado.lactante }
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up relative">
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {isEditing ? 'Modificar Historia Clinica' : 'Abrir Historia Clinica'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Campamento: <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30">
          {showSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <Stethoscope size={20} className="text-green-600" />
              <p className="font-medium">{isEditing ? 'Historia clinica actualizada exitosamente!' : 'Historia clinica abierta exitosamente!'}</p>
            </div>
          )}

          <form id="hc-form" onSubmit={handleSubmit} className="space-y-6">
            {!isEditing && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-caracas-blue/10 rounded-lg">
                    <Search size={18} className="text-caracas-blue" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Buscar Refugiado</h3>
                </div>
                <div className="p-6">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cedula del Refugiado</label>
                      <input
                        type="number"
                        value={cedulaBusqueda}
                        onChange={(e) => setCedulaBusqueda(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarPorCedula(); } }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                        placeholder="Escriba la cedula y presione Enter"
                      />
                    </div>
                    <button type="button" onClick={buscarPorCedula} className="px-6 py-2.5 bg-caracas-blue text-white rounded-xl font-medium hover:bg-blue-800 transition-colors">
                      Buscar
                    </button>
                  </div>
                  {refugiadoEncontrado && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <p className="font-semibold text-green-800">
                        {refugiadoEncontrado.nombres} {refugiadoEncontrado.apellidos}
                      </p>
                      <p className="text-sm text-green-700">
                        C.I: {refugiadoEncontrado.cedula || 'N/A'} | Edad: aprox. | Cama: {refugiadoEncontrado.nro_cama || 'N/A'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {refugiadoEncontrado && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-caracas-blue/10 rounded-lg">
                    <User size={18} className="text-caracas-blue" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Datos Personales</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nombres</label>
                    <p className="font-semibold text-gray-800">{refugiadoEncontrado.nombres}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Apellidos</label>
                    <p className="font-semibold text-gray-800">{refugiadoEncontrado.apellidos}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Nacimiento</label>
                    <p className="font-semibold text-gray-800">
                      {refugiadoEncontrado.fecha_nacimiento instanceof Date
                        ? refugiadoEncontrado.fecha_nacimiento.toLocaleDateString('es-VE')
                        : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Stethoscope size={18} className="text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Desglose Medico</h3>
              </div>
              <div className="p-6 space-y-6">
                {refConFlags?.discapacidad && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Discapacidad</label>
                    <select
                      value={formData.tipoDiscapacidad}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipoDiscapacidad: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    >
                      <option value="">-- SELECCIONE --</option>
                      {TIPOS_DISCAPACIDAD.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                )}

                {refConFlags?.alergias && (
                  <div className="border-t border-gray-100 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Especifique la Alergia</label>
                    <input
                      type="text"
                      value={formData.tipoAlergia}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipoAlergia: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                      placeholder="EJ. PENICILINA, POLEN, MANI"
                    />
                  </div>
                )}

                {refConFlags?.enfermedad_cronica && (
                  <div className="border-t border-gray-100 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medicamento Requerido</label>
                    <input
                      type="text"
                      value={formData.medicamentoEnfermedad}
                      onChange={(e) => setFormData(prev => ({ ...prev, medicamentoEnfermedad: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                      placeholder="EJ. INSULINA, LEVOTIROXINA"
                    />
                  </div>
                )}

                {refConFlags?.lesion_sismo && (
                  <div className="border-t border-gray-100 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Detalle de la Lesion por Sismo</label>
                    <input
                      type="text"
                      value={formData.lesionSismoDetalle}
                      onChange={(e) => setFormData(prev => ({ ...prev, lesionSismoDetalle: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                      placeholder="EJ. FRACTURA DE FEMUR DERECHO"
                    />
                  </div>
                )}

                {refConFlags?.adulto_mayor_dependencia && (
                  <div className="border-t border-gray-100 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Detalle de Dependencia</label>
                    <input
                      type="text"
                      value={formData.adultoMayorDetalle}
                      onChange={(e) => setFormData(prev => ({ ...prev, adultoMayorDetalle: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                      placeholder="EJ. REQUIERE ASISTENCIA PARA MOVILIZARSE"
                    />
                  </div>
                )}

                {refConFlags?.lactante && (
                  <div className="border-t border-gray-100 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Detalle de Lactancia</label>
                    <input
                      type="text"
                      value={formData.lactanteDetalle}
                      onChange={(e) => setFormData(prev => ({ ...prev, lactanteDetalle: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                      placeholder="EJ. LACTANCIA MATERNA EXCLUSIVA"
                    />
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enfermedades Previas</label>
                  <textarea
                    value={formData.enfermedadesPrevias}
                    onChange={(e) => setFormData(prev => ({ ...prev, enfermedadesPrevias: e.target.value.toUpperCase() }))}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase resize-none"
                    placeholder="EJ. DIABETES TIPO 2, HIPERTENSION ARTERIAL..."
                  />
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cirugias</label>
                  <textarea
                    value={formData.cirugias}
                    onChange={(e) => setFormData(prev => ({ ...prev, cirugias: e.target.value.toUpperCase() }))}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase resize-none"
                    placeholder="EJ. APENDICECTOMIA (2015), CESAREA (2020)..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Stethoscope size={18} className="text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Examen Fisico General</h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subjetivo</label>
                  <textarea
                    value={formData.examenSubjetivo}
                    onChange={(e) => setFormData(prev => ({ ...prev, examenSubjetivo: e.target.value.toUpperCase() }))}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase resize-none"
                    placeholder="Lo que el paciente refiere sentir..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo</label>
                  <textarea
                    value={formData.examenObjetivo}
                    onChange={(e) => setFormData(prev => ({ ...prev, examenObjetivo: e.target.value.toUpperCase() }))}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase resize-none"
                    placeholder="Lo que el medico observa y mide..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnostico</label>
                  <textarea
                    value={formData.examenDiagnostico}
                    onChange={(e) => setFormData(prev => ({ ...prev, examenDiagnostico: e.target.value.toUpperCase() }))}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase resize-none"
                    placeholder="Conclusion diagnostica..."
                  />
                </div>
              </div>
            </div>

            {!isEditing && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Apertura</label>
                  <input
                    type="date"
                    value={formData.fechaApertura}
                    onChange={(e) => setFormData(prev => ({ ...prev, fechaApertura: e.target.value }))}
                    className="w-full md:w-64 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} type="button" className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button form="hc-form" type="submit" disabled={(!refugiadoEncontrado && !isEditing) || isSubmitting} className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-8 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={18} />
            {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Abrir Historia Clinica'}
          </button>
        </div>
      </div>
    </div>
  );
}
