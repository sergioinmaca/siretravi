import { useState, useEffect, useCallback } from 'react';
import { useCampamento } from '../../context/CampamentoContext';
import { X, Save, Search, User, Users, MapPin, Stethoscope, Accessibility, AlertCircle } from 'lucide-react';
import type { Refugiado, HistoriaClinica } from '../../types';
import { formatAge } from '../../lib/formatAge';

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

const CANTIDAD_ENF_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

function buildEmptyEnfCronicas() {
  return Array.from({ length: 10 }, () => ({ enfermedad: '', tratamiento: '' }));
}

function buildEmptyFormData() {
  return {
    discapacidad: false,
    alergias: false,
    enfermedadCronica: false,
    lesionSismo: false,
    adultoMayorDependencia: false,
    lactante: false,
    embarazo: false,
    tiempoEmbarazo: '',
    tipoDiscapacidad: '',
    tipoAlergia: '',
    lesionSismoDetalle: '',
    adultoMayorDetalle: '',
    lactanteDetalle: '',
    enfermedadesPrevias: '',
    cirugias: '',
    examenSubjetivo: '',
    examenObjetivo: '',
    examenDiagnostico: '',
    fechaApertura: new Date().toISOString().split('T')[0],
  };
}

function rellenarEnfCronicasDesdeHC(hc: HistoriaClinica): { lista: { enfermedad: string; tratamiento: string }[]; cantidad: number } {
  const lista = buildEmptyEnfCronicas();
  let ultimaLlena = 0;
  const cols = [
    ['enf_cronica_1', 'tratamiento_1'],
    ['enf_cronica_2', 'tratamiento_2'],
    ['enf_cronica_3', 'tratamiento_3'],
    ['enf_cronica_4', 'tratamiento_4'],
    ['enf_cronica_5', 'tratamiento_5'],
    ['enf_cronica_6', 'tratamiento_6'],
    ['enf_cronica_7', 'tratamiento_7'],
    ['enf_cronica_8', 'tratamiento_8'],
    ['enf_cronica_9', 'tratamiento_9'],
    ['enf_cronica_10', 'tratamiento_10'],
  ] as const;

  cols.forEach(([enfKey, trKey], idx) => {
    const enfVal = (hc as unknown as Record<string, unknown>)[enfKey] as string | undefined;
    const trVal = (hc as unknown as Record<string, unknown>)[trKey] as string | undefined;
    if (enfVal || trVal) {
      lista[idx] = { enfermedad: enfVal || '', tratamiento: trVal || '' };
      ultimaLlena = idx + 1;
    }
  });

  return { lista, cantidad: Math.max(ultimaLlena, 1) };
}

export default function HistoriaClinicaModal({ isOpen, onClose, historiaToEdit, refugiadoPreseleccionado }: HistoriaClinicaModalProps) {
  const { campamentoSeleccionado, refugiados, familias, historiasClinicas, agregarHistoriaClinica, actualizarHistoriaClinica, actualizarRefugiado } = useCampamento();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cedulaBusqueda, setCedulaBusqueda] = useState('');
  const [refugiadoEncontrado, setRefugiadoEncontrado] = useState<Refugiado | null>(refugiadoPreseleccionado || null);
  const [formData, setFormData] = useState(buildEmptyFormData());
  const [enfCronicasList, setEnfCronicasList] = useState(buildEmptyEnfCronicas());
  const [cantidadEnfCronicas, setCantidadEnfCronicas] = useState(1);
  const [edadCalculada, setEdadCalculada] = useState('');

  const isEditing = !!historiaToEdit;

  const resetForm = useCallback(() => {
    setFormData(buildEmptyFormData());
    setEnfCronicasList(buildEmptyEnfCronicas());
    setCantidadEnfCronicas(1);
    setEdadCalculada('');
    setErrorMsg('');
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (historiaToEdit) {
        const { lista, cantidad } = rellenarEnfCronicasDesdeHC(historiaToEdit);
        setEnfCronicasList(lista);
        setCantidadEnfCronicas(cantidad);

        setFormData({
          discapacidad: !!historiaToEdit.tipo_discapacidad,
          alergias: !!historiaToEdit.tipo_alergia,
          enfermedadCronica: !!historiaToEdit.enf_cronica_1 || !!historiaToEdit.tratamiento_1,
          lesionSismo: !!historiaToEdit.lesion_sismo_detalle,
          adultoMayorDependencia: !!historiaToEdit.adulto_mayor_detalle,
          lactante: !!historiaToEdit.lactante_detalle,
          embarazo: false,
          tiempoEmbarazo: '',
          tipoDiscapacidad: historiaToEdit.tipo_discapacidad || '',
          tipoAlergia: historiaToEdit.tipo_alergia || '',
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
        if (refConHC) {
          setRefugiadoEncontrado(refConHC);
          setEdadCalculada(formatAge(new Date(refConHC.fecha_nacimiento)));
        }
      } else {
        resetForm();
        setRefugiadoEncontrado(refugiadoPreseleccionado || null);
        setCedulaBusqueda(refugiadoPreseleccionado?.cedula?.toString() || '');
        if (refugiadoPreseleccionado) {
          setEdadCalculada(formatAge(new Date(refugiadoPreseleccionado.fecha_nacimiento)));
          setFormData(prev => ({
            ...prev,
            discapacidad: refugiadoPreseleccionado.discapacidad,
            alergias: refugiadoPreseleccionado.alergias,
            enfermedadCronica: refugiadoPreseleccionado.enfermedad_cronica,
            lesionSismo: refugiadoPreseleccionado.lesion_sismo,
            adultoMayorDependencia: refugiadoPreseleccionado.adulto_mayor_dependencia,
            lactante: refugiadoPreseleccionado.lactante || false,
            embarazo: refugiadoPreseleccionado.embarazo,
            tiempoEmbarazo: refugiadoPreseleccionado.tiempo_embarazo?.toString() || '',
          }));
        }
      }
    }
  }, [isOpen, historiaToEdit, refugiadoPreseleccionado, refugiados, resetForm]);

  const buscarRefugiado = () => {
    if (!cedulaBusqueda.trim()) return;
    const busqueda = cedulaBusqueda.trim();
    const esNumerico = /^\d+$/.test(busqueda);

    const encontrado = esNumerico
      ? refugiados.find(
          r => r.cedula === parseInt(busqueda) && r.campamento_id === campamentoSeleccionado?.id
        )
      : refugiados.find(
          r => r.codigo.toUpperCase() === busqueda.toUpperCase() && r.campamento_id === campamentoSeleccionado?.id
        );

    if (encontrado) {
      const yaTieneHC = historiasClinicas.some(hc => hc.refugiado_id === encontrado.id);
      if (yaTieneHC && !isEditing) {
        alert('Este integrante ya tiene una historia clinica abierta.');
        return;
      }
      setRefugiadoEncontrado(encontrado);
      setEdadCalculada(formatAge(new Date(encontrado.fecha_nacimiento)));
      setFormData(prev => ({
        ...prev,
        discapacidad: encontrado.discapacidad,
        alergias: encontrado.alergias,
        enfermedadCronica: encontrado.enfermedad_cronica,
        lesionSismo: encontrado.lesion_sismo,
        adultoMayorDependencia: encontrado.adulto_mayor_dependencia,
        lactante: encontrado.lactante || false,
        embarazo: encontrado.embarazo,
        tiempoEmbarazo: encontrado.tiempo_embarazo?.toString() || '',
      }));
    } else {
      alert('No se encontro ningun integrante con esa cedula en este campamento.');
      setRefugiadoEncontrado(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refugiadoEncontrado && !isEditing) {
      alert('Debe buscar un integrante por cedula primero.');
      return;
    }

    setIsSubmitting(true);

    try {
      const refId = historiaToEdit?.refugiado_id || refugiadoEncontrado!.id;

      const refOriginal = refugiados.find(r => r.id === refId);
      const flagsChanged = refOriginal && (
        refOriginal.discapacidad !== formData.discapacidad ||
        refOriginal.alergias !== formData.alergias ||
        refOriginal.enfermedad_cronica !== formData.enfermedadCronica ||
        refOriginal.lesion_sismo !== formData.lesionSismo ||
        refOriginal.adulto_mayor_dependencia !== formData.adultoMayorDependencia ||
        refOriginal.lactante !== formData.lactante ||
        refOriginal.embarazo !== formData.embarazo
      );

      if (flagsChanged) {
        await actualizarRefugiado(refId, {
          id: refId,
          codigo: refOriginal!.codigo,
          campamento_id: refOriginal!.campamento_id,
          familia_id: refOriginal!.familia_id,
          nombres: refOriginal!.nombres,
          apellidos: refOriginal!.apellidos,
          cedula: refOriginal!.cedula,
          genero: refOriginal!.genero,
          fecha_nacimiento: refOriginal!.fecha_nacimiento,
          es_jefe_familia: refOriginal!.es_jefe_familia,
          nro_cama: refOriginal!.nro_cama,
          procedencia: refOriginal!.procedencia,
          discapacidad: formData.discapacidad,
          embarazo: formData.embarazo,
          tiempo_embarazo: refOriginal!.tiempo_embarazo,
          mascotas: refOriginal!.mascotas,
          tipo_mascota: refOriginal!.tipo_mascota,
          mascota_sexo: refOriginal!.mascota_sexo,
          mascota_raza: refOriginal!.mascota_raza,
          mascota_nombre: refOriginal!.mascota_nombre,
          mascota_edad: refOriginal!.mascota_edad,
          telefono: refOriginal!.telefono,
          profesion: refOriginal!.profesion,
          talla_camisa: refOriginal!.talla_camisa,
          talla_pantalon: refOriginal!.talla_pantalon,
          talla_zapatos: refOriginal!.talla_zapatos,
          alergias: formData.alergias,
          enfermedad_cronica: formData.enfermedadCronica,
          lesion_sismo: formData.lesionSismo,
          adulto_mayor_dependencia: formData.adultoMayorDependencia,
          lactante: formData.lactante,
          nivel_educativo: refOriginal!.nivel_educativo,
          condicion_vivienda: refOriginal!.condicion_vivienda,
          tenencia_vivienda: refOriginal!.tenencia_vivienda,
          ingreso_familiar: refOriginal!.ingreso_familiar,
          parentesco: refOriginal!.parentesco,
        });
      }

      const hcPayload: HistoriaClinica = {
        id: historiaToEdit?.id || '',
        refugiado_id: refId,
        tipo_discapacidad: formData.tipoDiscapacidad || undefined,
        tipo_alergia: formData.tipoAlergia || undefined,
        medicamento_enfermedad: undefined,
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
        enf_cronica_1: enfCronicasList[0].enfermedad || undefined,
        tratamiento_1: enfCronicasList[0].tratamiento || undefined,
        enf_cronica_2: enfCronicasList[1].enfermedad || undefined,
        tratamiento_2: enfCronicasList[1].tratamiento || undefined,
        enf_cronica_3: enfCronicasList[2].enfermedad || undefined,
        tratamiento_3: enfCronicasList[2].tratamiento || undefined,
        enf_cronica_4: enfCronicasList[3].enfermedad || undefined,
        tratamiento_4: enfCronicasList[3].tratamiento || undefined,
        enf_cronica_5: enfCronicasList[4].enfermedad || undefined,
        tratamiento_5: enfCronicasList[4].tratamiento || undefined,
        enf_cronica_6: enfCronicasList[5].enfermedad || undefined,
        tratamiento_6: enfCronicasList[5].tratamiento || undefined,
        enf_cronica_7: enfCronicasList[6].enfermedad || undefined,
        tratamiento_7: enfCronicasList[6].tratamiento || undefined,
        enf_cronica_8: enfCronicasList[7].enfermedad || undefined,
        tratamiento_8: enfCronicasList[7].tratamiento || undefined,
        enf_cronica_9: enfCronicasList[8].enfermedad || undefined,
        tratamiento_9: enfCronicasList[8].tratamiento || undefined,
        enf_cronica_10: enfCronicasList[9].enfermedad || undefined,
        tratamiento_10: enfCronicasList[9].tratamiento || undefined,
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
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error desconocido al guardar la historia clinica');
      console.error('Error al guardar HC:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const familiaDelRefugiado = refugiadoEncontrado
    ? familias.find(f => f.id === refugiadoEncontrado.familia_id)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up relative">
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
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <AlertCircle size={20} className="text-red-600 shrink-0" />
              <p className="font-medium text-sm">{errorMsg}</p>
            </div>
          )}

          <form id="hc-form" onSubmit={handleSubmit} className="space-y-6">
            {!isEditing && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-caracas-blue/10 rounded-lg">
                    <Search size={18} className="text-caracas-blue" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Buscar Integrante</h3>
                </div>
                <div className="p-6">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cedula o Codigo del Integrante</label>
                      <input
                        type="number"
                        value={cedulaBusqueda}
                        onChange={(e) => setCedulaBusqueda(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarRefugiado(); } }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                        placeholder="Escriba la cedula o codigo y presione Enter"
                      />
                    </div>
                    <button type="button" onClick={buscarRefugiado} className="px-6 py-2.5 bg-caracas-blue text-white rounded-xl font-medium hover:bg-blue-800 transition-colors">
                      Buscar
                    </button>
                  </div>
                  {refugiadoEncontrado && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <p className="font-semibold text-green-800">
                        {refugiadoEncontrado.nombres} {refugiadoEncontrado.apellidos}
                      </p>
                      <p className="text-sm text-green-700">
                        {refugiadoEncontrado.codigo && <span>Codigo: {refugiadoEncontrado.codigo} | </span>}
                        C.I: {refugiadoEncontrado.cedula || 'N/A'} | Edad: {edadCalculada || 'N/A'} | Cama: {refugiadoEncontrado.nro_cama || 'N/A'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {refugiadoEncontrado && (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-caracas-blue/10 rounded-lg">
                      <User size={18} className="text-caracas-blue" />
                    </div>
                    <h3 className="font-semibold text-gray-800">1. Datos Personales</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Nombres</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.nombres}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Apellidos</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.apellidos}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Cedula</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.cedula || 'N/A'}</p>
                    </div>
                    {refugiadoEncontrado.codigo && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Codigo</label>
                        <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.codigo}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Genero</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">
                        {refugiadoEncontrado.genero ? 'MASCULINO' : 'FEMENINO'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Nacimiento</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">
                        {refugiadoEncontrado.fecha_nacimiento instanceof Date
                          ? refugiadoEncontrado.fecha_nacimiento.toLocaleDateString('es-VE')
                          : ''}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Edad</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{edadCalculada || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Telefono</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.telefono?.toString() || 'No registrado'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Profesion u Ocupacion</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.profesion || 'No registrada'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Nivel Educativo</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.nivel_educativo || 'No registrado'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-caracas-green/10 rounded-lg">
                      <Users size={18} className="text-caracas-green" />
                    </div>
                    <h3 className="font-semibold text-gray-800">2. Jerarquia Familiar</h3>
                  </div>
                  <div className="p-6">
                    {refugiadoEncontrado.es_jefe_familia ? (
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl inline-block">
                        Es Jefe de Familia
                      </p>
                    ) : (
                      <div>
                        <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl inline-block">
                          {familiaDelRefugiado ? `Pertenece a: ${familiaDelRefugiado.nombre}` : 'Sin familia asignada'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <MapPin size={18} className="text-yellow-600" />
                    </div>
                    <h3 className="font-semibold text-gray-800">3. Ubicacion y Procedencia</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Nro de Cama</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.nro_cama || 'Sin asignar'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Procedencia</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.procedencia || 'No registrada'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Direccion Exacta</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.direccion_exacta || 'No registrada'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Ingreso</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">
                        {refugiadoEncontrado.fecha_ingreso instanceof Date
                          ? refugiadoEncontrado.fecha_ingreso.toLocaleDateString('es-VE')
                          : 'No registrada'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Accessibility size={18} className="text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-800">4. Informacion Adicional Medica</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.discapacidad}
                      onChange={(e) => setFormData(prev => ({ ...prev, discapacidad: e.target.checked, tipoDiscapacidad: e.target.checked ? prev.tipoDiscapacidad : '' }))}
                      disabled={!refugiadoEncontrado && !isEditing}
                      className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                    />
                    <span className="text-gray-700 font-medium">?Presenta alguna discapacidad?</span>
                  </label>
                  {formData.discapacidad && (
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
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.alergias}
                      onChange={(e) => setFormData(prev => ({ ...prev, alergias: e.target.checked, tipoAlergia: e.target.checked ? prev.tipoAlergia : '' }))}
                      disabled={!refugiadoEncontrado && !isEditing}
                      className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                    />
                    <span className="text-gray-700 font-medium">?Presenta alguna alergia?</span>
                  </label>
                  {formData.alergias && (
                    <input
                      type="text"
                      value={formData.tipoAlergia}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipoAlergia: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                      placeholder="EJ. PENICILINA, POLEN, MANI"
                    />
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enfermedadCronica}
                        onChange={(e) => setFormData(prev => ({ ...prev, enfermedadCronica: e.target.checked }))}
                        disabled={!refugiadoEncontrado && !isEditing}
                        className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                      />
                      <span className="text-gray-700 font-medium">?Enfermedad que requiera tto. de por vida?</span>
                    </label>
                    {formData.enfermedadCronica && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 font-medium">Cantidad:</label>
                        <select
                          value={cantidadEnfCronicas}
                          onChange={(e) => setCantidadEnfCronicas(parseInt(e.target.value))}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-sm"
                        >
                          {CANTIDAD_ENF_OPTIONS.map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  {formData.enfermedadCronica && (
                    <div className="space-y-3">
                      {Array.from({ length: cantidadEnfCronicas }, (_, i) => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Enfermedad #{i + 1}</label>
                            <input
                              type="text"
                              value={enfCronicasList[i].enfermedad}
                              onChange={(e) => {
                                setEnfCronicasList(prev => {
                                  const updated = [...prev];
                                  updated[i] = { ...updated[i], enfermedad: e.target.value.toUpperCase() };
                                  return updated;
                                });
                              }}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                              placeholder="EJ. DIABETES TIPO 2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Medicamento / Tratamiento</label>
                            <input
                              type="text"
                              value={enfCronicasList[i].tratamiento}
                              onChange={(e) => {
                                setEnfCronicasList(prev => {
                                  const updated = [...prev];
                                  updated[i] = { ...updated[i], tratamiento: e.target.value.toUpperCase() };
                                  return updated;
                                });
                              }}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                              placeholder="EJ. INSULINA, LOSARTAN"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.lesionSismo}
                      onChange={(e) => setFormData(prev => ({ ...prev, lesionSismo: e.target.checked, lesionSismoDetalle: e.target.checked ? prev.lesionSismoDetalle : '' }))}
                      disabled={!refugiadoEncontrado && !isEditing}
                      className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                    />
                    <span className="text-gray-700 font-medium">?Presenta alguna lesion fisica a causa del sismo?</span>
                  </label>
                  {formData.lesionSismo && (
                    <input
                      type="text"
                      value={formData.lesionSismoDetalle}
                      onChange={(e) => setFormData(prev => ({ ...prev, lesionSismoDetalle: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                      placeholder="EJ. FRACTURA DE FEMUR DERECHO"
                    />
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.adultoMayorDependencia}
                      onChange={(e) => setFormData(prev => ({ ...prev, adultoMayorDependencia: e.target.checked, adultoMayorDetalle: e.target.checked ? prev.adultoMayorDetalle : '' }))}
                      disabled={!refugiadoEncontrado && !isEditing}
                      className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                    />
                    <span className="text-gray-700 font-medium">?Adulto mayor en situacion de dependencia?</span>
                  </label>
                  {formData.adultoMayorDependencia && (
                    <input
                      type="text"
                      value={formData.adultoMayorDetalle}
                      onChange={(e) => setFormData(prev => ({ ...prev, adultoMayorDetalle: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                      placeholder="EJ. REQUIERE ASISTENCIA PARA MOVILIZARSE"
                    />
                  )}
                </div>

                {(!refugiadoEncontrado || !refugiadoEncontrado.genero) && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.lactante}
                        onChange={(e) => setFormData(prev => ({ ...prev, lactante: e.target.checked, lactanteDetalle: e.target.checked ? prev.lactanteDetalle : '' }))}
                        disabled={!refugiadoEncontrado && !isEditing}
                        className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                      />
                      <span className="text-gray-700 font-medium">?Es lactante?</span>
                    </label>
                    {formData.lactante && (
                      <input
                        type="text"
                        value={formData.lactanteDetalle}
                        onChange={(e) => setFormData(prev => ({ ...prev, lactanteDetalle: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                        placeholder="EJ. LACTANCIA MATERNA EXCLUSIVA"
                      />
                    )}
                  </div>
                )}

                {(!refugiadoEncontrado || !refugiadoEncontrado.genero) && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.embarazo}
                        onChange={(e) => setFormData(prev => ({ ...prev, embarazo: e.target.checked, tiempoEmbarazo: e.target.checked ? prev.tiempoEmbarazo : '' }))}
                        disabled={!refugiadoEncontrado && !isEditing}
                        className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                      />
                      <span className="text-gray-700 font-medium">?Se encuentra en estado de embarazo?</span>
                    </label>
                    {formData.embarazo && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo de Embarazo (semanas)</label>
                        <input
                          type="number"
                          min={1}
                          max={42}
                          value={formData.tiempoEmbarazo}
                          onChange={(e) => setFormData(prev => ({ ...prev, tiempoEmbarazo: e.target.value }))}
                          className="w-full md:w-64 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                          placeholder="Ej. 24"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Stethoscope size={18} className="text-pink-600" />
                </div>
                <h3 className="font-semibold text-gray-800">5. Desglose Medico</h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
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
                <h3 className="font-semibold text-gray-800">6. Examen Fisico General</h3>
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
