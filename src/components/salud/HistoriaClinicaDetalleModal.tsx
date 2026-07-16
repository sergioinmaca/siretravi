import {
  X, User, Users, MapPin, Activity, ClipboardList, Stethoscope,
  Accessibility, AlertTriangle, Heart, Baby,
} from 'lucide-react';
import { useCampamento } from '../../context/CampamentoContext';
import { formatAge } from '../../lib/formatAge';
import { toDisplayDate } from '../../lib/formatDate';
import type { HistoriaClinica, Refugiado } from '../../types';

interface HistoriaClinicaDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  historia: HistoriaClinica | null;
  refugiado: Refugiado | null;
}

export default function HistoriaClinicaDetalleModal({
  isOpen,
  onClose,
  historia,
  refugiado,
}: HistoriaClinicaDetalleModalProps) {
  const { familias = [] } = useCampamento();

  if (!isOpen) return null;

  const familia = refugiado?.familia_id
    ? familias.find(f => f.id === refugiado.familia_id)
    : null;

  const jerarquiaLabel = refugiado
    ? refugiado.es_jefe_familia
      ? 'Jefe de Familia'
      : `Miembro (${familia?.nombre || 'Familia Desconocida'})`
    : '—';

  const enfCronicas = (() => {
    const pares: { enfermedad: string; tratamiento: string }[] = [];
    if (!historia) return pares;
    for (let i = 1; i <= 10; i++) {
      const enf = (historia as any)[`enf_cronica_${i}`] as string | undefined;
      const trat = (historia as any)[`tratamiento_${i}`] as string | undefined;
      if (enf && enf.trim()) {
        pares.push({ enfermedad: enf, tratamiento: trat || '' });
      }
    }
    return pares;
  })();

  const tieneInfoAdicionalMedica =
    !!historia?.tipo_discapacidad ||
    !!historia?.tipo_alergia ||
    !!historia?.medicamento_enfermedad ||
    !!historia?.lesion_sismo_detalle ||
    !!historia?.adulto_mayor_detalle ||
    !!historia?.lactante_detalle ||
    enfCronicas.length > 0;

  const tieneDesgloseMedico =
    !!historia?.enfermedades_previas ||
    !!historia?.cirugias;

  const tieneExamenFisico =
    !!historia?.examen_subjetivo ||
    !!historia?.examen_objetivo ||
    !!historia?.examen_diagnostico;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex-1 text-center ml-8">
            <h2 className="text-xl font-bold text-gray-800">Detalle de Historia Clínica</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {refugiado
                ? `${refugiado.apellidos}, ${refugiado.nombres} — Cód. ${refugiado.codigo || '—'}`
                : 'Integrante no disponible'}
              {historia && (
                <> &mdash; Apertura: {toDisplayDate(historia.fecha_apertura)}</>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30 space-y-6">

          {/* 1. Datos Personales */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-caracas-blue/10 rounded-lg">
                <User size={18} className="text-caracas-blue" />
              </div>
              <h3 className="font-semibold text-gray-800">Datos Personales</h3>
            </div>
            <div className="p-6">
              <div className="md:col-span-2 flex items-start gap-6 mb-6">
                <div className="shrink-0">
                  {refugiado?.foto_url ? (
                    <img
                      src={refugiado.foto_url}
                      alt="Foto del integrante"
                      className="w-28 h-32 object-cover rounded-xl border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-28 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400">
                      <User size={24} />
                      <span className="text-[10px] font-medium mt-1">Sin foto</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FichaField label="Código" value={refugiado?.codigo || '—'} />
                  <FichaField label="Cédula" value={refugiado?.cedula?.toString() || 'S/N'} />
                  <FichaField label="Nombres" value={refugiado?.nombres || '—'} />
                  <FichaField label="Apellidos" value={refugiado?.apellidos || '—'} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FichaField label="Género" value={refugiado ? (refugiado.genero ? 'Masculino' : 'Femenino') : '—'} />
                <FichaField
                  label="Fecha de Nacimiento"
                  value={refugiado?.fecha_nacimiento ? toDisplayDate(refugiado.fecha_nacimiento) : '—'}
                />
                <FichaField label="Edad" value={refugiado?.fecha_nacimiento ? formatAge(refugiado.fecha_nacimiento) : '—'} />
                <FichaField label="Teléfono" value={refugiado?.telefono?.toString() || '—'} />
                <FichaField label="Profesión / Ocupación" value={refugiado?.profesion || '—'} />
                <FichaField label="Nivel Educativo" value={refugiado?.nivel_educativo || '—'} />
              </div>
            </div>
          </div>

          {/* 2. Jerarquía Familiar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-caracas-green/10 rounded-lg">
                <Users size={18} className="text-caracas-green" />
              </div>
              <h3 className="font-semibold text-gray-800">Jerarquía Familiar</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FichaField label="Jerarquía Familiar" value={jerarquiaLabel} mono />
              {refugiado && !refugiado.es_jefe_familia && (
                <FichaField label="Parentesco con el jefe/a" value={refugiado.parentesco || '—'} />
              )}
            </div>
          </div>

          {/* 3. Ubicación y Procedencia */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <MapPin size={18} className="text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Ubicación y Procedencia</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FichaField label="Nro de Cama" value={refugiado?.nro_cama || '—'} />
              <FichaField label="Procedencia" value={refugiado?.procedencia || '—'} />
              <FichaField label="Dirección Exacta" value={refugiado?.direccion_exacta || '—'} />
              <FichaField
                label="Fecha de Ingreso"
                value={refugiado?.fecha_ingreso ? toDisplayDate(refugiado.fecha_ingreso) : '—'}
              />
            </div>
          </div>

          {/* 4. Información Adicional Médica */}
          {tieneInfoAdicionalMedica && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Activity size={18} className="text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Información Adicional Médica</h3>
              </div>
              <div className="p-6 space-y-4">
                {historia?.tipo_discapacidad && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <Accessibility size={14} /> Discapacidad: Sí
                    </span>
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{historia.tipo_discapacidad}</p>
                  </div>
                )}

                {historia?.tipo_alergia && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <AlertTriangle size={14} /> Alergias: Sí
                    </span>
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{historia.tipo_alergia}</p>
                  </div>
                )}

                {historia?.medicamento_enfermedad && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <Activity size={14} /> Medicamento
                    </span>
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{historia.medicamento_enfermedad}</p>
                  </div>
                )}

                {enfCronicas.length > 0 && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <Heart size={14} /> Enfermedad Crónica: Sí
                    </span>
                    <div className="mt-2 space-y-2">
                      {enfCronicas.map((ec, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-700">{ec.enfermedad}</p>
                          {ec.tratamiento && (
                            <p className="text-sm text-gray-500 mt-1">Tratamiento: {ec.tratamiento}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {historia?.lesion_sismo_detalle && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <AlertTriangle size={14} /> Lesión Sismo: Sí
                    </span>
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{historia.lesion_sismo_detalle}</p>
                  </div>
                )}

                {historia?.adulto_mayor_detalle && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <User size={14} /> Adulto Mayor Dependencia: Sí
                    </span>
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{historia.adulto_mayor_detalle}</p>
                  </div>
                )}

                {historia?.lactante_detalle && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <Baby size={14} /> Lactante: Sí
                    </span>
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{historia.lactante_detalle}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Desglose Médico */}
          {tieneDesgloseMedico && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ClipboardList size={18} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Desglose Médico</h3>
              </div>
              <div className="p-6 space-y-4">
                {historia?.enfermedades_previas && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Enfermedades Previas</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{historia.enfermedades_previas}</p>
                  </div>
                )}
                {historia?.cirugias && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Cirugías</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{historia.cirugias}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. Examen Físico General */}
          {tieneExamenFisico && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Stethoscope size={18} className="text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Examen Físico General</h3>
              </div>
              <div className="p-6 space-y-4">
                {historia?.examen_subjetivo && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Subjetivo</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{historia.examen_subjetivo}</p>
                  </div>
                )}
                {historia?.examen_objetivo && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Objetivo</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{historia.examen_objetivo}</p>
                  </div>
                )}
                {historia?.examen_diagnostico && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Diagnóstico</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{historia.examen_diagnostico}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Si no hay info médica registrada */}
          {!tieneInfoAdicionalMedica && !tieneDesgloseMedico && !tieneExamenFisico && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Stethoscope size={18} className="text-gray-500" />
                </div>
                <h3 className="font-semibold text-gray-800">Información Médica</h3>
              </div>
              <div className="p-6 text-center text-gray-400">
                <Stethoscope size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-medium">No se ha registrado información médica</p>
                <p className="text-sm mt-1">Utilice el botón de modificar para agregar datos clínicos</p>
              </div>
            </div>
          )}

        </div>

        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function FichaField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</h4>
      <span className={`font-medium ${mono ? 'text-caracas-blue bg-caracas-blue/5 px-2.5 py-1 rounded-lg text-sm' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}
