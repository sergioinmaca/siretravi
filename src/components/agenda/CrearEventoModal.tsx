import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import dayjs from '../../lib/dayjs';
import SelectorCategoria from './SelectorCategoria';
import DateInput from '../ui/DateInput';
import { fetchCategorias, crearCategoria, actualizarCategoria } from '../../lib/eventos';
import { addOneHour } from '../../lib/formatTime';
import type { CategoriaEvento } from '../../types';

interface CrearEventoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    titulo: string;
    fecha_inicio: string;
    hora_inicio: string;
    hora_fin?: string;
    descripcion?: string;
    tipo: 'permanente' | 'unico';
    fecha_fin?: string;
    categoria_id?: string;
  }) => Promise<void>;
  selectedDate?: dayjs.Dayjs;
  campamentoNombre?: string;
  tienePermisoCrear?: boolean;
}

export default function CrearEventoModal({ isOpen, onClose, onSave, selectedDate, campamentoNombre, tienePermisoCrear }: CrearEventoModalProps) {
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<'unico' | 'permanente'>('unico');
  const [categoriaId, setCategoriaId] = useState<string | undefined>();
  const [categorias, setCategorias] = useState<CategoriaEvento[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFecha(selectedDate ? selectedDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
      setTitulo('');
      setHoraInicio('08:00');
      setHoraFin('');
      setDescripcion('');
      setTipo('unico');
      setCategoriaId(undefined);
      setError('');
      fetchCategorias().then(setCategorias).catch(console.error);
    }
  }, [isOpen, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!titulo.trim()) {
      setError('El título es obligatorio');
      return;
    }

    if (horaFin && horaInicio >= horaFin) {
      setError('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }

    const fechaFin = tipo === 'permanente'
      ? dayjs(fecha).endOf('month').format('YYYY-MM-DD')
      : undefined;

    setSubmitting(true);
    try {
      await onSave({
        titulo: titulo.trim(),
        fecha_inicio: fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin || addOneHour(horaInicio),
        descripcion: descripcion.trim() || undefined,
        tipo,
        fecha_fin: fechaFin,
        categoria_id: categoriaId || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al crear el evento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCrearCategoria = async (nombre: string, color: string) => {
    const nueva = await crearCategoria({ nombre, color });
    setCategorias(prev => [...prev, nueva]);
    setCategoriaId(nueva.id);
  };

  const handleUpdateCategoria = async (id: string, nombre: string, color: string) => {
    const actualizada = await actualizarCategoria(id, { nombre, color });
    setCategorias(prev => prev.map(c => c.id === id ? actualizada : c));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Nuevo Evento</h2>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-caracas-red">*</span></label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
              placeholder="Nombre del evento"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de evento</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipo('unico')}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                  tipo === 'unico'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Único
              </button>
              <button
                type="button"
                onClick={() => setTipo('permanente')}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                  tipo === 'permanente'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Permanente
              </button>
            </div>
            {tipo === 'permanente' && (
              <p className="text-xs text-gray-500 mt-2">
                Se repetirá diariamente desde la fecha seleccionada hasta el final del mes ({fecha ? dayjs(fecha).endOf('month').format('DD/MM/YYYY') : ''}).
              </p>
            )}
          </div>

          <DateInput
            label="Fecha"
            value={fecha}
            onChange={(v) => setFecha(v)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
              />
            </div>
          </div>

          <SelectorCategoria
            categorias={categorias}
            selectedId={categoriaId}
            onSelect={setCategoriaId}
            onCreateCategoria={handleCrearCategoria}
            onUpdateCategoria={handleUpdateCategoria}
            puedeCrear={!!tienePermisoCrear}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value.toUpperCase())}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all resize-none uppercase"
              placeholder="Descripción del evento"
            />
          </div>

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
