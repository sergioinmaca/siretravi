import { useState, useEffect } from 'react';
import { X, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import dayjs from '../../lib/dayjs';
import { NOMBRE_TIPO_COMIDA } from '../../types';
import type { CocinaSlot, TipoComida } from '../../types';
import { formatTime12h } from '../../lib/formatTime';
import { fetchResponsables } from '../../lib/cocina';
import { useModalBackLock } from '../../hooks/useModalBackLock';

interface CompletarSemanaModalProps {
  isOpen: boolean;
  campamentoId: string;
  campamentoNombre: string;
  dias: dayjs.Dayjs[];
  slots: CocinaSlot[];
  racionesDefault: number;
  responsableDefault: string;
  onClose: () => void;
  onSave: (entries: {
    fecha: string;
    tipo: TipoComida;
    menu: string;
    bebida: string;
    hora_servicio: string;
    raciones: number;
    responsable?: string;
  }[]) => Promise<{ creadas: number; omitidas: number }>;
}

interface ComidaForm {
  menu: string;
  bebida: string;
  hora_servicio: string;
  raciones: number;
  responsable: string;
}

export default function CompletarSemanaModal({
  isOpen,
  campamentoId,
  campamentoNombre,
  dias,
  slots,
  racionesDefault,
  responsableDefault,
  onClose,
  onSave,
}: CompletarSemanaModalProps) {
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([]);
  const [comidasSeleccionadas, setComidasSeleccionadas] = useState<TipoComida[]>([]);
  const [porComida, setPorComida] = useState<Record<string, ComidaForm>>({});
  const [responsables, setResponsables] = useState<string[]>([]);
  const [result, setResult] = useState<{ creadas: number; omitidas: number } | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useModalBackLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setDiasSeleccionados(dias.map((d) => d.format('YYYY-MM-DD')));
      setComidasSeleccionadas(slots.map((s) => s.tipo));
      const forms: Record<string, ComidaForm> = {};
      slots.forEach((s) => {
        forms[s.tipo] = {
          menu: '',
          bebida: '',
          hora_servicio: s.hora_servicio,
          raciones: racionesDefault,
          responsable: responsableDefault,
        };
      });
      setPorComida(forms);
      setResult(null);
      setError('');
      setSubmitting(false);
      if (campamentoId) {
        fetchResponsables(campamentoId).then(setResponsables).catch(console.error);
      }
    }
  }, [isOpen, dias, slots, racionesDefault, responsableDefault, campamentoId]);

  if (!isOpen) return null;

  const toggleDia = (fecha: string) => {
    setDiasSeleccionados((prev) =>
      prev.includes(fecha) ? prev.filter((f) => f !== fecha) : [...prev, fecha]
    );
  };

  const toggleComida = (tipo: TipoComida) => {
    setComidasSeleccionadas((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    );
  };

  const updateComida = (tipo: TipoComida, patch: Partial<ComidaForm>) => {
    setPorComida((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], ...patch },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (diasSeleccionados.length === 0) {
      setError('Selecciona al menos un día');
      return;
    }
    if (comidasSeleccionadas.length === 0) {
      setError('Selecciona al menos una comida');
      return;
    }

    const sinMenu = comidasSeleccionadas.filter(
      (t) => !(porComida[t]?.menu || '').trim()
    );
    if (sinMenu.length > 0) {
      setError(`Falta el menú de: ${sinMenu.map((t) => NOMBRE_TIPO_COMIDA[t]).join(', ')}`);
      return;
    }

    const sinBebida = comidasSeleccionadas.filter(
      (t) => !(porComida[t]?.bebida || '').trim()
    );
    if (sinBebida.length > 0) {
      setError(`Falta la bebida de: ${sinBebida.map((t) => NOMBRE_TIPO_COMIDA[t]).join(', ')}`);
      return;
    }

    const entries = diasSeleccionados.flatMap((fecha) =>
      comidasSeleccionadas.map((tipo) => ({
        fecha,
        tipo,
        menu: (porComida[tipo]?.menu || '').trim(),
        bebida: (porComida[tipo]?.bebida || '').trim(),
        hora_servicio: porComida[tipo]?.hora_servicio || '',
        raciones: Number(porComida[tipo]?.raciones) || 0,
        responsable: (porComida[tipo]?.responsable || '').trim() || undefined,
      }))
    );

    setSubmitting(true);
    try {
      const res = await onSave(entries);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Error al guardar las comidas');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col md:items-center md:justify-center md:p-4 md:bg-gray-900/40 md:backdrop-blur-sm">
      <div className="bg-white w-full h-full pt-[calc(env(safe-area-inset-top)+3.5rem)] md:pt-0 md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-3xl md:shadow-2xl flex flex-col overflow-hidden animate-slide-up relative">
        <div className="hidden md:flex px-6 py-5 border-b border-gray-100 items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Completar Semana</h2>
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

        {result ? (
          <div className="flex-1 overflow-y-auto pt-5 px-5 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:p-8 space-y-4">
            <div className="md:hidden">
              <h2 className="text-xl font-bold text-gray-800">Completar Semana</h2>
              {campamentoNombre && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Campamento: <span className="font-semibold text-caracas-red">{campamentoNombre}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 text-green-700">
              <CheckCircle2 size={32} />
              <p className="font-semibold text-lg">Se guardaron {result.creadas} comidas.</p>
            </div>
            {result.omitidas > 0 && (
              <div className="flex items-start gap-3 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium">
                  Se omitieron {result.omitidas} celdas que ya estaban cargadas.
                </p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-caracas-red hover:bg-red-800 text-white font-medium transition-colors shadow-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pt-5 px-5 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:p-6 space-y-6">
            <div className="md:hidden">
              <h2 className="text-xl font-bold text-gray-800">Completar Semana</h2>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Días</label>
              <div className="grid grid-cols-7 gap-2">
                {dias.map((dia) => {
                  const fecha = dia.format('YYYY-MM-DD');
                  const activo = diasSeleccionados.includes(fecha);
                  return (
                    <button
                      key={fecha}
                      type="button"
                      onClick={() => toggleDia(fecha)}
                      className={`flex flex-col items-center py-2 rounded-xl border-2 transition-colors ${
                        activo
                          ? 'border-caracas-red bg-caracas-red/5 text-caracas-red'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xs font-medium">{dia.format('ddd')}</span>
                      <span className="text-sm font-bold">{dia.format('D')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Comidas</label>
              <div className="space-y-4">
                {slots.map((slot) => {
                  const activo = comidasSeleccionadas.includes(slot.tipo);
                  const form = porComida[slot.tipo] || {
                    menu: '',
                    hora_servicio: slot.hora_servicio,
                    raciones: racionesDefault,
                    responsable: responsableDefault,
                  };
                  return (
                    <div
                      key={slot.tipo}
                      className={`rounded-2xl border-2 transition-colors p-4 ${
                        activo ? 'border-caracas-red/30 bg-caracas-red/[0.03]' : 'border-gray-100 opacity-60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleComida(slot.tipo)}
                        className="flex items-center gap-2 mb-3"
                      >
                        <span
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-white text-xs font-bold transition-colors ${
                            activo ? 'bg-caracas-red border-caracas-red' : 'border-gray-300'
                          }`}
                        >
                          {activo && '✓'}
                        </span>
                        <span className="text-sm font-semibold text-gray-700">
                          {NOMBRE_TIPO_COMIDA[slot.tipo]}
                        </span>
                        <span className="text-xs text-gray-400">({formatTime12h(slot.hora_servicio)})</span>
                      </button>

                      {activo && (
                        <div className="space-y-3 pl-7">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Menú <span className="text-caracas-red">*</span>
                            </label>
                            <textarea
                              value={form.menu}
                              onChange={(e) => updateComida(slot.tipo, { menu: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all resize-none"
                              placeholder="Menú para todos los días seleccionados"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Bebida <span className="text-caracas-red">*</span>
                            </label>
                            <textarea
                              value={form.bebida}
                              onChange={(e) => updateComida(slot.tipo, { bebida: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all resize-none"
                              placeholder="Bebida para todos los días seleccionados"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Hora</label>
                              <input
                                type="time"
                                value={form.hora_servicio}
                                onChange={(e) => updateComida(slot.tipo, { hora_servicio: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Raciones</label>
                              <input
                                type="number"
                                min={0}
                                value={form.raciones}
                                onChange={(e) => updateComida(slot.tipo, { raciones: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Responsable</label>
                              <input
                                type="text"
                                list="sugerencia-responsables"
                                value={form.responsable}
                                onChange={(e) => updateComida(slot.tipo, { responsable: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <datalist id="sugerencia-responsables">
              {responsables.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>

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
                {submitting ? 'Guardando...' : 'Guardar semana'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
