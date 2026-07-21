import { X, Activity, Gift, HeartHandshake } from 'lucide-react';
import type { AtencionMedica } from '../../types';
import { toDisplayDate } from '../../lib/formatDate';

interface DetalleAtencionModalProps {
  isOpen: boolean;
  onClose: () => void;
  atencion: AtencionMedica | null;
}

const TIPO_CONFIG = {
  medica: { icon: Activity, label: 'Atención Médica', color: 'text-caracas-red', bg: 'bg-caracas-red/10' },
  beneficio: { icon: Gift, label: 'Beneficio', color: 'text-green-600', bg: 'bg-green-100' },
  donacion: { icon: HeartHandshake, label: 'Donación', color: 'text-purple-600', bg: 'bg-purple-100' },
};

export default function DetalleAtencionModal({ isOpen, onClose, atencion }: DetalleAtencionModalProps) {
  if (!isOpen || !atencion) return null;

  const config = TIPO_CONFIG[atencion.tipo];
  const Icon = config.icon;

  const renderEspecialidades = () => {
    const rows: any[] = [];
    for (let i = 1; i <= 10; i++) {
      const esp = (atencion as any)[`especialidad_${i}`];
      const diag = (atencion as any)[`diagnostico_${i}`];
      const trat = (atencion as any)[`tratamiento_${i}`];
      const resp = (atencion as any)[`responsable_${i}`];
      if (!esp) break;
      rows.push(
        <div key={i} className="border-l-2 border-caracas-red/30 pl-4 py-2 space-y-1">
          <p className="text-sm"><span className="font-medium">Especialidad:</span> {esp}</p>
          {diag && <p className="text-sm"><span className="font-medium">Diagnóstico:</span> {diag}</p>}
          {resp && <p className="text-sm"><span className="font-medium">Responsable:</span> {resp}</p>}
          {trat && <p className="text-sm"><span className="font-medium">Tratamiento:</span> {trat}</p>}
        </div>
      );
    }
    return rows;
  };

  const renderDetalleDinamico = () => {
    const prefix = atencion.tipo === 'beneficio' ? 'beneficio' : 'donacion';
    const rows: any[] = [];
    for (let i = 1; i <= 10; i++) {
      const tipo = (atencion as any)[`${prefix}_tipo_${i}`];
      const desc = (atencion as any)[`${prefix}_descripcion_${i}`];
      const entregado = (atencion as any)[`${prefix}_entregado_por_${i}`];
      const fecha = (atencion as any)[`${prefix}_fecha_${i}`];
      if (!tipo) break;
      rows.push(
        <div key={i} className={`${i > 1 ? 'border-t border-gray-100 pt-3 mt-3' : ''} space-y-1`}>
          <p className="text-sm"><span className="font-medium">Tipo:</span> {tipo}</p>
          {desc && <p className="text-sm"><span className="font-medium">Descripción:</span> {desc}</p>}
          {entregado && <p className="text-sm"><span className="font-medium">Entregado por:</span> {entregado}</p>}
          {fecha && <p className="text-sm"><span className="font-medium">Fecha:</span> {fecha instanceof Date ? toDisplayDate(fecha) : ''}</p>}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${config.bg} rounded-lg`}>
              <Icon size={20} className={config.color} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Detalle del Registro</h2>
              <p className="text-sm text-gray-500 mt-0.5 uppercase font-medium">{config.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] bg-gray-50/30 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm">
              <span className="font-medium text-gray-600">Fecha:</span>{' '}
              {atencion.fecha_atencion instanceof Date ? toDisplayDate(atencion.fecha_atencion) : ''}
            </p>
          </div>

          {atencion.tipo === 'medica' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Signos Vitales</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium text-gray-500">Presión Arterial:</span> {atencion.presion_arterial || '—'}</div>
                <div><span className="font-medium text-gray-500">Temperatura:</span> {atencion.temperatura ? `${atencion.temperatura} °C` : '—'}</div>
                <div><span className="font-medium text-gray-500">Frec. Cardíaca:</span> {atencion.frecuencia_cardiaca ? `${atencion.frecuencia_cardiaca} lpm` : '—'}</div>
                <div><span className="font-medium text-gray-500">Peso:</span> {atencion.peso ? `${atencion.peso} kg` : '—'}</div>
                <div><span className="font-medium text-gray-500">Talla:</span> {atencion.talla ? `${atencion.talla} cm` : '—'}</div>
                <div><span className="font-medium text-gray-500">Sat. O₂:</span> {atencion.saturacion_oxigeno ? `${atencion.saturacion_oxigeno}%` : '—'}</div>
              </div>
              {atencion.observaciones && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Observaciones</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{atencion.observaciones}</p>
                </div>
              )}
            </div>
          )}

          {atencion.tipo === 'medica' && renderEspecialidades().length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Especialidades</h3>
              {renderEspecialidades()}
            </div>
          )}

          {(atencion.tipo === 'beneficio' || atencion.tipo === 'donacion') && renderDetalleDinamico().length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {atencion.tipo === 'beneficio' ? 'Detalle del Beneficio' : 'Detalle de la Donación'}
              </h3>
              {renderDetalleDinamico()}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
