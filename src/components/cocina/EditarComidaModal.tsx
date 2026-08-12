import { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import dayjs from '../../lib/dayjs';
import { NOMBRE_TIPO_COMIDA } from '../../types';
import type { ComidaMenu, TipoComida } from '../../types';
import { fetchResponsables } from '../../lib/cocina';

interface EditarComidaModalProps {
  isOpen: boolean;
  campamentoId: string;
  fecha: string;
  tipo: TipoComida;
  comida: ComidaMenu | null;
  slotHora: string;
  racionesDefault: number;
  campamentoNombre: string;
  soloLectura: boolean;
  puedeEliminar: boolean;
  onClose: () => void;
  onSave: (data: {
    menu: string;
    bebida: string;
    hora_servicio: string;
    raciones: number;
    responsable?: string;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function EditarComidaModal({
  isOpen,
  campamentoId,
  fecha,
  tipo,
  comida,
  slotHora,
  racionesDefault,
  campamentoNombre,
  soloLectura,
  puedeEliminar,
  onClose,
  onSave,
  onDelete,
}: EditarComidaModalProps) {
  const [menu, setMenu] = useState('');
  const [bebida, setBebida] = useState('');
  const [hora, setHora] = useState(slotHora);
  const [raciones, setRaciones] = useState(racionesDefault);
  const [responsable, setResponsable] = useState('');
  const [responsables, setResponsables] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMenu(comida?.menu || '');
      setBebida(comida?.bebida || '');
      setHora(comida?.hora_servicio || slotHora);
      setRaciones(comida?.raciones ?? racionesDefault);
      setResponsable(comida?.responsable || '');
      setError('');
      setSubmitting(false);
      if (campamentoId) {
        fetchResponsables(campamentoId).then(setResponsables).catch(console.error);
      }
    }
  }, [isOpen, comida, slotHora, racionesDefault, campamentoId]);

  if (!isOpen) return null;

  const esNueva = !comida;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!menu.trim()) {
      setError('El menú es obligatorio');
      return;
    }

    if (!bebida.trim()) {
      setError('La bebida es obligatoria');
      return;
    }

    if (!hora) {
      setError('La hora de servicio es obligatoria');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        menu: menu.trim(),
        bebida: bebida.trim(),
        hora_servicio: hora,
        raciones: Number(raciones) || 0,
        responsable: responsable.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la comida');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!comida) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta comida?')) return;
    try {
      await onDelete(comida.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar la comida');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {esNueva ? 'Nueva Comida' : 'Editar Comida'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {NOMBRE_TIPO_COMIDA[tipo]} ·{' '}
              <span className="font-semibold text-caracas-red">
                {dayjs(fecha).format('DD/MM/YYYY')}
              </span>
            </p>
            {campamentoNombre && (
              <p className="text-xs text-gray-400 mt-0.5">
                Campamento: <span className="font-semibold">{campamentoNombre}</span>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Menú <span className="text-caracas-red">*</span>
            </label>
            <textarea
              value={menu}
              onChange={(e) => setMenu(e.target.value)}
              rows={3}
              disabled={soloLectura}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all resize-none disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Describe qué se va a servir"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bebida <span className="text-caracas-red">*</span>
            </label>
            <textarea
              value={bebida}
              onChange={(e) => setBebida(e.target.value)}
              rows={2}
              disabled={soloLectura}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all resize-none disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Qué se va a tomar (ej. Jugo de piña con pepino, café y agua)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora de servicio <span className="text-caracas-red">*</span>
              </label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                disabled={soloLectura}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raciones</label>
              <input
                type="number"
                min={0}
                value={raciones}
                onChange={(e) => setRaciones(Number(e.target.value))}
                disabled={soloLectura}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsable <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              list="sugerencia-responsables"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              disabled={soloLectura}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Nombre de quien prepara/sirve"
            />
            <datalist id="sugerencia-responsables">
              {responsables.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            {!esNueva && puedeEliminar && !soloLectura && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-red-600 font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Trash2 size={18} />
                Eliminar
              </button>
            )}
            {soloLectura ? (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-caracas-red hover:bg-red-800 text-white font-medium transition-colors shadow-md"
              >
                Cerrar
              </button>
            ) : (
              <>
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
                  {submitting ? 'Guardando...' : esNueva ? 'Guardar' : 'Guardar cambios'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
