import { useState, useEffect } from 'react';
import { X, Save, Lock } from 'lucide-react';
import { NOMBRE_TIPO_COMIDA } from '../../types';
import type { CocinaSlot, TipoComida } from '../../types';
import { formatTime12h } from '../../lib/formatTime';
import { useModalBackLock } from '../../hooks/useModalBackLock';

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

  useModalBackLock(isOpen);

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
    <div className="fixed inset-0 z-[60] flex flex-col md:items-center md:justify-center md:p-4 md:bg-gray-900/40 md:backdrop-blur-sm">
      <div className="bg-white w-full h-full pt-[calc(env(safe-area-inset-top)+3.5rem)] md:pt-0 md:h-auto md:max-h-[90vh] md:max-w-md md:rounded-3xl md:shadow-2xl flex flex-col overflow-hidden animate-slide-up relative">
        <div className="hidden md:flex px-6 py-5 border-b border-gray-100 items-center justify-between shrink-0">
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

        <button onClick={onClose} className="absolute top-[calc(env(safe-area-inset-top)+3.75rem)] right-4 z-20 md:hidden p-2 bg-caracas-red hover:bg-red-800 rounded-full text-white transition-colors">
          <X size={24} />
        </button>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pt-5 px-5 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:p-6 space-y-5">
          <div className="md:hidden">
            <h2 className="text-xl font-bold text-gray-800">Horarios del Campamento</h2>
            {campamentoNombre && (
              <p className="text-sm text-gray-500 mt-0.5">
                Campamento: <span className="font-semibold text-caracas-red">{campamentoNombre}</span>
              </p>
            )}
          </div>
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
                        bloqueado
                          ? `bg-gray-400 cursor-not-allowed opacity-70`
                          : `${s.activo ? 'bg-caracas-red' : 'bg-gray-300'} cursor-pointer`
                      }`}
                      title={bloqueado ? 'Esta comida siempre está activa' : undefined}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                          s.activo ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {bloqueado && (
                          <Lock size={12} className="text-gray-400 shrink-0" />
                        )}
                        <p className="text-sm font-semibold text-gray-700 truncate">
                          {NOMBRE_TIPO_COMIDA[s.tipo]}
                        </p>
                      </div>
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
            Desayuno, Almuerzo y Cena están siempre activos. La hora se precarga al crear comidas
            nuevas; cambiarla aquí no altera las comidas ya cargadas.
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
