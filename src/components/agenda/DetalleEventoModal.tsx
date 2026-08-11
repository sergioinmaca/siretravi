import { useState, useEffect } from 'react';
import { X, Save, Trash2, Edit, User, Clock, CalendarDays } from 'lucide-react';
import dayjs from '../../lib/dayjs';
import SelectorCategoria from './SelectorCategoria';
import DateInput from '../ui/DateInput';
import { actualizarEvento, eliminarEvento, crearCategoria, actualizarCategoria } from '../../lib/eventos';
import { formatTime12h, addOneHour } from '../../lib/formatTime';
import type { EventoOcurrencia, CategoriaEvento } from '../../types';

interface DetalleEventoModalProps {
  isOpen: boolean;
  onClose: () => void;
  evento: EventoOcurrencia | null;
  categorias: CategoriaEvento[];
  campamentoNombre?: string;
  tienePermisoEditar?: boolean;
  onEventoUpdated: () => void;
}

export default function DetalleEventoModal({
  isOpen,
  onClose,
  evento,
  categorias: categoriasProp,
  campamentoNombre,
  tienePermisoEditar,
  onEventoUpdated,
}: DetalleEventoModalProps) {
  const [modo, setModo] = useState<'ver' | 'editar'>('ver');
  const [categorias, setCategorias] = useState<CategoriaEvento[]>([]);

  const [titulo, setTitulo] = useState('');
  const [categoriaId, setCategoriaId] = useState<string | undefined>();
  const [responsable, setResponsable] = useState('');
  const [tipo, setTipo] = useState<'unico' | 'permanente'>('unico');
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCategorias(categoriasProp);
    }
  }, [isOpen, categoriasProp]);

  useEffect(() => {
    if (isOpen && evento) {
      setTitulo(evento.titulo);
      setCategoriaId(evento.categoria_id || undefined);
      setResponsable(evento.responsable || '');
      setTipo(evento.tipo);
      setFecha(evento.fecha_inicio);
      setHoraInicio(evento.hora_inicio);
      setHoraFin(evento.hora_fin || '');
      setDescripcion(evento.descripcion || '');
      setModo('ver');
      setError('');
      setSaving(false);
      setDeleting(false);
    }
  }, [isOpen, evento]);

  if (!isOpen || !evento) return null;

  const getCategoriaColor = (categoriaId?: string, tipoEvento?: string): string => {
    if (categoriaId) {
      const cat = categorias.find(c => c.id === categoriaId);
      if (cat) return cat.color;
    }
    return tipoEvento === 'permanente' ? '#A855F7' : '#3B82F6';
  };

  const colorCategoria = getCategoriaColor(categoriaId, tipo);
  const categoriaSeleccionada = categorias.find(c => c.id === categoriaId);

  const handleGuardar = async () => {
    if (!evento) return;
    setError('');

    if (!titulo.trim()) {
      setError('El título es obligatorio');
      return;
    }

    if (!responsable.trim()) {
      setError('El responsable es obligatorio');
      return;
    }

    if (horaFin && horaInicio >= horaFin) {
      setError('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }

    const fechaFin = tipo === 'permanente'
      ? dayjs(fecha).endOf('month').format('YYYY-MM-DD')
      : undefined;

    setSaving(true);
    try {
      await actualizarEvento(evento.id, {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        fecha_inicio: fecha,
        fecha_fin: fechaFin,
        hora_inicio: horaInicio,
        hora_fin: horaFin || addOneHour(horaInicio),
        tipo,
        categoria_id: categoriaId || undefined,
        responsable: responsable.trim() || undefined,
      });
      onEventoUpdated();
      setModo('ver');
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar el evento');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!evento) return;
    if (!confirm('¿Estás seguro de eliminar este evento?')) return;

    setDeleting(true);
    try {
      await eliminarEvento(evento.id);
      onEventoUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el evento');
    } finally {
      setDeleting(false);
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

  const formatFecha = (fechaStr: string): string => {
    return dayjs(fechaStr).format('DD/MM/YYYY');
  };

  const formatHorario = (): string => {
    if (horaFin) {
      return `${formatTime12h(horaInicio)} - ${formatTime12h(horaFin)}`;
    }
    return formatTime12h(horaInicio);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up border-4"
        style={{ borderColor: colorCategoria }}
      >
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {modo === 'ver' ? 'Detalle del Evento' : 'Editar Evento'}
            </h2>
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

        {modo === 'ver' ? (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: colorCategoria }}
              >
                {categoriaSeleccionada ? categoriaSeleccionada.nombre : 'SIN CATEGORÍA'}
              </span>
              {responsable && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                  <User size={15} className="text-gray-400" />
                  {responsable}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-800 uppercase leading-snug">{titulo}</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <p className="text-xs font-medium text-gray-400 mb-0.5">Tipo</p>
                <p className="text-sm font-semibold text-gray-700">
                  {tipo === 'permanente' ? 'Permanente' : 'Único'}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <p className="text-xs font-medium text-gray-400 mb-0.5 flex items-center gap-1">
                  <CalendarDays size={12} /> Fecha
                </p>
                <p className="text-sm font-semibold text-gray-700">{formatFecha(fecha)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 col-span-2">
                <p className="text-xs font-medium text-gray-400 mb-0.5 flex items-center gap-1">
                  <Clock size={12} /> Horario
                </p>
                <p className="text-sm font-semibold text-gray-700">{formatHorario()}</p>
              </div>
            </div>

            {descripcion && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Descripción</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{descripcion}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-5">
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

            <SelectorCategoria
              categorias={categorias}
              selectedId={categoriaId}
              onSelect={setCategoriaId}
              onCreateCategoria={handleCrearCategoria}
              onUpdateCategoria={handleUpdateCategoria}
              puedeCrear={!!tienePermisoEditar}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsable <span className="text-caracas-red">*</span></label>
              <input
                type="text"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                placeholder="Nombre y apellido del responsable"
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
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {modo === 'ver' ? (
            <div className="flex gap-3 justify-end w-full">
              {tienePermisoEditar && (
                <button
                  type="button"
                  onClick={() => setModo('editar')}
                  className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-md"
                >
                  <Edit size={18} />
                  Editar
                </button>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleEliminar}
                disabled={deleting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-red-600 font-medium hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0 whitespace-nowrap"
              >
                <Trash2 size={18} />
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setError(''); setModo('ver'); }}
                  className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors shrink-0 whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGuardar}
                  disabled={saving}
                  className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
                >
                  <Save size={18} />
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
