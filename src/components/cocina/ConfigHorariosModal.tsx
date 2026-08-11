import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { NOMBRE_TIPO_COMIDA } from '../../types';
import type { CocinaSlot, TipoComida } from '../../types';
import { formatTime12h } from '../../lib/formatTime';

interface ConfigHorariosModalProps {
  isOpen: boolean;
  campamentoNombre: string;
  slots: CocinaSlot[];
  onClose: () => void;
  onSave: (slots: { tipo: TipoComida; activo: boolean; hora_servicio: string }[]) => Promise<void>;
}

const SIEMPRE_ACTIVOS: TipoComida[] = ['desayuno', 'almuerzo', 'cena'];

export default function ConfigHorariosModal({
  isOpen,
  campamentoNombre,
  slots,
  onClose,
  onSave,
}: ConfigHorariosModalProps) {
  const [local, setLocal] = useState<
    { tipo: TipoComida; activo: boolean; hora_servicio: string }[]
  >([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocal(
        slots.map((s) => ({
          tipo: s.tipo,
          activo: s.activo,
          hora_servicio: s.hora_servicio,
        }))
      );
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, slots]);

  if (!isOpen) return null;

  const update = (tipo: TipoComida, patch: Partial<{ activo: boolean; hora_servicio: string }>) => {
    setLocal((prev) => prev.map((s) => (s.tipo === tipo ? { ...s, ...patch } : s)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (local.some((s) => s.activo && !s.hora_servicio)) {
      setError('Las comidas activas deben tener hora de servicio');
      return;
    }

    setSubmitting(true);
    try {
      await onSave(local);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar los horarios');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Horarios del Campamento</h2>
            {campamentoNombre && (
              <p className="text-sm text-gray-500 mt-0.5">
                Campamento: <span className="font-semibold text-caracas-red">{campamentoNombre}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {local.map((s) => {
              const bloqueado = SIEMPRE_ACTIVOS.includes(s.tipo);
              return (
                <div
                  key={s.tipo}
                  className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 transition-colors ${
                    s.activo ? 'border-caracas-red/30 bg-caracas-red/[0.03]' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => !bloqueado && update(s.tipo, { activo: !s.activo })}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                        s.activo ? 'bg-caracas-red' : 'bg-gray-300'
                      } ${bloqueado ? 'cursor-default' : 'cursor-pointer'}`}
                      title={bloqueado ? 'Esta comida siempre está activa' : undefined}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                          s.activo ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">
                        {NOMBRE_TIPO_COMIDA[s.tipo]}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTime12h(s.hora_servicio) || 'Sin hora'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="time"
                    value={s.hora_servicio}
                    onChange={(e) => update(s.tipo, { hora_servicio: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-sm"
                  />
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            La hora se precarga al crear comidas nuevas. Cambiar una hora aquí no altera las comidas
            ya cargadas.
          </p>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
