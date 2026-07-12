import { useState, useEffect, useMemo } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { fetchEventos, expandirPermanentes, agruparPorDia, actualizarEvento, eliminarEvento, fetchCategorias, crearCategoria, actualizarCategoria } from '../../lib/eventos';
import { formatTime12h } from '../../lib/formatTime';
import SelectorCategoria from './SelectorCategoria';
import type { Evento, EventoOcurrencia, CategoriaEvento } from '../../types';

interface EditorEventosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventoUpdated: () => void;
  currentDate: dayjs.Dayjs;
  vista: 'mes' | 'semana';
  campamentoId: string;
  campamentoNombre?: string;
  tienePermisoCrear?: boolean;
}

export default function EditorEventosModal({
  isOpen,
  onClose,
  onEventoUpdated,
  currentDate,
  vista,
  campamentoId,
  campamentoNombre,
  tienePermisoCrear,
}: EditorEventosModalProps) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [ocurrencias, setOcurrencias] = useState<EventoOcurrencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CategoriaEvento[]>([]);

  const [formTitulo, setFormTitulo] = useState('');
  const [formFecha, setFormFecha] = useState('');
  const [formHoraInicio, setFormHoraInicio] = useState('');
  const [formHoraFin, setFormHoraFin] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formTipo, setFormTipo] = useState<'unico' | 'permanente'>('unico');
  const [formCategoriaId, setFormCategoriaId] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rango = useMemo(() => {
    if (vista === 'mes') {
      return {
        start: currentDate.startOf('month').startOf('week'),
        end: currentDate.endOf('month').endOf('week'),
      };
    }
    return {
      start: currentDate.startOf('week'),
      end: currentDate.endOf('week'),
    };
  }, [vista, currentDate]);

  const fechaDesde = rango.start.format('YYYY-MM-DD');
  const fechaHasta = rango.end.format('YYYY-MM-DD');

  useEffect(() => {
    if (!isOpen || !campamentoId) return;
    setLoading(true);
    Promise.all([
      fetchEventos(campamentoId, fechaHasta),
      fetchCategorias(),
    ]).then(([evts, cats]) => {
      setEventos(evts);
      setCategorias(cats);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, campamentoId, fechaHasta]);

  useEffect(() => {
    const occs = expandirPermanentes(eventos, fechaDesde, fechaHasta);
    setOcurrencias(occs);
  }, [eventos, fechaDesde, fechaHasta]);

  const eventosPorDia = useMemo(
    () => agruparPorDia(ocurrencias),
    [ocurrencias]
  );

  const selectedEvento = useMemo(() => {
    return eventos.find(e => e.id === selectedId) || null;
  }, [eventos, selectedId]);

  useEffect(() => {
    if (selectedEvento) {
      setFormTitulo(selectedEvento.titulo);
      setFormFecha(selectedEvento.fecha_inicio);
      setFormHoraInicio(selectedEvento.hora_inicio);
      setFormHoraFin(selectedEvento.hora_fin || '');
      setFormDescripcion(selectedEvento.descripcion || '');
      setFormTipo(selectedEvento.tipo);
      setFormCategoriaId(selectedEvento.categoria_id || undefined);
      setError('');
    }
  }, [selectedEvento]);

  const handleSelectEvento = (evento: EventoOcurrencia) => {
    setSelectedId(evento.id);
  };

  const handleGuardar = async () => {
    if (!selectedEvento) return;
    setError('');

    if (!formTitulo.trim()) {
      setError('El título es obligatorio');
      return;
    }

    if (formHoraFin && formHoraInicio >= formHoraFin) {
      setError('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }

    const fechaFin = formTipo === 'permanente'
      ? dayjs(formFecha).endOf('month').format('YYYY-MM-DD')
      : undefined;

    setSaving(true);
    try {
      await actualizarEvento(selectedEvento.id, {
        titulo: formTitulo.trim(),
        descripcion: formDescripcion.trim() || undefined,
        fecha_inicio: formFecha,
        fecha_fin: fechaFin,
        hora_inicio: formHoraInicio,
        hora_fin: formHoraFin || undefined,
        tipo: formTipo,
        categoria_id: formCategoriaId || undefined,
      });
      const evts = await fetchEventos(campamentoId, fechaHasta);
      setEventos(evts);
      onEventoUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar el evento');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!selectedEvento) return;
    if (!confirm('¿Estás seguro de eliminar este evento?')) return;

    setDeleting(true);
    try {
      await eliminarEvento(selectedEvento.id);
      const evts = await fetchEventos(campamentoId, fechaHasta);
      setEventos(evts);
      setSelectedId(null);
      onEventoUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el evento');
    } finally {
      setDeleting(false);
    }
  };

  const handleCrearCategoria = async (nombre: string, color: string) => {
    const nueva = await crearCategoria({ nombre, color });
    setCategorias(prev => [...prev, nueva]);
    setFormCategoriaId(nueva.id);
  };

  const handleUpdateCategoria = async (id: string, nombre: string, color: string) => {
    const actualizada = await actualizarCategoria(id, { nombre, color });
    setCategorias(prev => prev.map(c => c.id === id ? actualizada : c));
  };

  const getCategoriaColor = (evento: EventoOcurrencia | Evento): string => {
    if (evento.categoria_id) {
      const cat = categorias.find(c => c.id === evento.categoria_id);
      if (cat) return cat.color;
    }
    return evento.tipo === 'permanente' ? '#A855F7' : '#3B82F6';
  };

  const formatHoraRange = (e: EventoOcurrencia): string => {
    if (e.hora_fin) {
      return `${formatTime12h(e.hora_inicio)}-${formatTime12h(e.hora_fin)}`;
    }
    return formatTime12h(e.hora_inicio);
  };

  const diasOrdenados = useMemo(() => {
    return Array.from(eventosPorDia.keys()).sort();
  }, [eventosPorDia]);

  const DIAS_NOMBRES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden animate-fade-in-up flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Editar Eventos</h2>
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

        <div className="flex flex-1 min-h-0">
          <div className="w-80 shrink-0 border-r border-gray-200 overflow-y-auto p-4">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-8">Cargando eventos...</p>
            ) : diasOrdenados.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No hay eventos en este período</p>
            ) : (
              diasOrdenados.map(dateStr => {
                const dia = dayjs(dateStr);
                const evts = eventosPorDia.get(dateStr) || [];
                return (
                  <div key={dateStr} className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1.5 border-b border-gray-100 pb-1">
                      {DIAS_NOMBRES[dia.day()]} {dia.format('D')}
                    </p>
                    {evts.map(evento => (
                      <button
                        key={`${evento.id}-${evento.fecha_ocurrencia}`}
                        onClick={() => handleSelectEvento(evento)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors mb-1 ${
                          selectedId === evento.id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: getCategoriaColor(evento) }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-700 truncate">{evento.titulo}</p>
                          <p className="text-xs text-gray-400">{formatHoraRange(evento)}</p>
                        </div>
                        {evento.tipo === 'permanente' && (
                          <span className="text-xs font-bold text-gray-400 shrink-0">P</span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!selectedEvento ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-sm">Selecciona un evento de la lista</p>
              </div>
            ) : (
              <div className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-caracas-red">*</span></label>
                  <input
                    type="text"
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de evento</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormTipo('unico')}
                      className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                        formTipo === 'unico'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Único
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTipo('permanente')}
                      className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                        formTipo === 'permanente'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Permanente
                    </button>
                  </div>
                  {formTipo === 'permanente' && (
                    <p className="text-xs text-gray-500 mt-2">
                      Se repetirá diariamente hasta el final del mes ({formFecha ? dayjs(formFecha).endOf('month').format('DD/MM/YYYY') : ''}).
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
                    <input
                      type="time"
                      value={formHoraInicio}
                      onChange={(e) => setFormHoraInicio(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input
                      type="time"
                      value={formHoraFin}
                      onChange={(e) => setFormHoraFin(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    />
                  </div>
                </div>

                <SelectorCategoria
                  categorias={categorias}
                  selectedId={formCategoriaId}
                  onSelect={setFormCategoriaId}
                  onCreateCategoria={handleCrearCategoria}
                  onUpdateCategoria={handleUpdateCategoria}
                  puedeCrear={!!tienePermisoCrear}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                  <textarea
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value.toUpperCase())}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all resize-none uppercase"
                    placeholder="Descripción del evento"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleEliminar}
                    disabled={deleting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-red-600 font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                    {deleting ? 'Eliminando...' : 'Eliminar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGuardar}
                    disabled={saving}
                    className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50"
                  >
                    <Save size={18} />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
