import { useState, useEffect, useCallback } from 'react';
import { X, ArrowLeft, Activity, Gift, HeartHandshake, Eye, Pencil, Trash2 } from 'lucide-react';
import type { AtencionMedica } from '../../types';
import { obtenerAtencionesPorRefugiado, eliminarAtencionMedica } from '../../lib/salud';
import { toDisplayDate } from '../../lib/formatDate';
import { PaginationControls } from '../ui/PaginationControls';
import AtencionMedicaModal from './AtencionMedicaModal';

interface HistorialAtencionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  refugiadoId: string;
  refugiadoNombre: string;
  tienePermisoModificar: boolean;
  tienePermisoEliminar: boolean;
}

const TIPO_CONFIG = {
  medica: { icon: Activity, label: 'Atención Médica', color: 'text-caracas-red', bg: 'bg-caracas-red/10' },
  beneficio: { icon: Gift, label: 'Beneficio', color: 'text-green-600', bg: 'bg-green-100' },
  donacion: { icon: HeartHandshake, label: 'Donación', color: 'text-purple-600', bg: 'bg-purple-100' },
};

const PER_PAGE = 5;

export default function HistorialAtencionesModal({
  isOpen,
  onClose,
  refugiadoId,
  refugiadoNombre,
  tienePermisoModificar,
  tienePermisoEliminar,
}: HistorialAtencionesModalProps) {
  const [vista, setVista] = useState<'lista' | 'detalle'>('lista');
  const [atenciones, setAtenciones] = useState<AtencionMedica[]>([]);
  const [atencionSeleccionada, setAtencionSeleccionada] = useState<AtencionMedica | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [atencionEdit, setAtencionEdit] = useState<AtencionMedica | null>(null);

  const loadAtenciones = useCallback(async () => {
    if (!refugiadoId) return;
    setLoading(true);
    try {
      const atts = await obtenerAtencionesPorRefugiado(refugiadoId);
      setAtenciones(atts);
    } catch {
      setAtenciones([]);
    } finally {
      setLoading(false);
    }
  }, [refugiadoId]);

  useEffect(() => {
    if (isOpen) {
      setVista('lista');
      setAtencionSeleccionada(null);
      setPage(1);
      loadAtenciones();
    }
  }, [isOpen, loadAtenciones]);

  const totalPages = Math.ceil(atenciones.length / PER_PAGE);
  const paginated = atenciones.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleVerDetalle = (a: AtencionMedica) => {
    setAtencionSeleccionada(a);
    setVista('detalle');
  };

  const handleVolver = () => {
    setVista('lista');
    setAtencionSeleccionada(null);
  };

  const handleModificar = (a: AtencionMedica) => {
    setAtencionEdit(a);
    setEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setEditModalOpen(false);
    setAtencionEdit(null);
    loadAtenciones();
  };

  const handleEliminar = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este registro?')) return;
    try {
      await eliminarAtencionMedica(id);
      const nuevas = atenciones.filter(a => a.id !== id);
      setAtenciones(nuevas);
      const newTotalPages = Math.ceil(nuevas.length / PER_PAGE);
      if (page > newTotalPages && newTotalPages > 0) {
        setPage(newTotalPages);
      }
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar');
    }
  };

  const handleClose = () => {
    setVista('lista');
    setAtencionSeleccionada(null);
    setPage(1);
    onClose();
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'medica': return <Activity size={16} className="text-caracas-red" />;
      case 'beneficio': return <Gift size={16} className="text-green-600" />;
      case 'donacion': return <HeartHandshake size={16} className="text-purple-600" />;
      default: return null;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'medica': return 'Atención Médica';
      case 'beneficio': return 'Beneficio';
      case 'donacion': return 'Donación';
      default: return tipo;
    }
  };

  const getResumen = (a: AtencionMedica) => {
    if (a.tipo === 'medica') {
      for (let i = 1; i <= 10; i++) {
        const esp = (a as any)[`especialidad_${i}`];
        if (esp) return esp;
      }
      return 'Signos vitales';
    }
    if (a.tipo === 'beneficio' || a.tipo === 'donacion') {
      const prefix = a.tipo === 'beneficio' ? 'beneficio' : 'donacion';
      for (let i = 1; i <= 10; i++) {
        const tipo = (a as any)[`${prefix}_tipo_${i}`];
        if (tipo) return tipo;
      }
      return 'Sin detalle';
    }
    return '';
  };

  const renderEspecialidades = (a: AtencionMedica) => {
    const rows: any[] = [];
    for (let i = 1; i <= 10; i++) {
      const esp = (a as any)[`especialidad_${i}`];
      const diag = (a as any)[`diagnostico_${i}`];
      const trat = (a as any)[`tratamiento_${i}`];
      const resp = (a as any)[`responsable_${i}`];
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

  const renderDetalleDinamico = (a: AtencionMedica) => {
    const prefix = a.tipo === 'beneficio' ? 'beneficio' : 'donacion';
    const rows: any[] = [];
    for (let i = 1; i <= 10; i++) {
      const tipo = (a as any)[`${prefix}_tipo_${i}`];
      const desc = (a as any)[`${prefix}_descripcion_${i}`];
      const entregado = (a as any)[`${prefix}_entregado_por_${i}`];
      if (!tipo) break;
      rows.push(
        <div key={i} className={`${i > 1 ? 'border-t border-gray-100 pt-3 mt-3' : ''} space-y-1`}>
          <p className="text-sm"><span className="font-medium">Tipo:</span> {tipo}</p>
          {desc && <p className="text-sm"><span className="font-medium">Descripción:</span> {desc}</p>}
          {entregado && <p className="text-sm"><span className="font-medium">Entregado por:</span> {entregado}</p>}
        </div>
      );
    }
    return rows;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[550px]">
        {vista === 'lista' ? (
          <>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Activity size={20} className="text-teal-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Historial — {refugiadoNombre}</h2>
              </div>
              <button onClick={handleClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-caracas-red rounded-full" />
                </div>
              ) : atenciones.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Activity size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No hay registros para este integrante</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paginated.map((a) => (
                    <div key={a.id} className="border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 shrink-0">{getTipoIcon(a.tipo)}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-700 uppercase">{getTipoLabel(a.tipo)}</span>
                            <span className="text-xs text-gray-400">
                              {a.fecha_atencion instanceof Date ? toDisplayDate(a.fecha_atencion) : ''}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate max-w-md">{getResumen(a)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleVerDetalle(a)} className="p-2 text-gray-400 hover:text-caracas-blue hover:bg-blue-50 rounded-lg transition-colors" title="Ver detalle">
                          <Eye size={16} />
                        </button>
                        {tienePermisoModificar && (
                          <button onClick={() => handleModificar(a)} className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Modificar">
                            <Pencil size={16} />
                          </button>
                        )}
                        {tienePermisoEliminar && (
                          <button onClick={() => handleEliminar(a.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                loading={loading}
                onChange={setPage}
                isMobile={false}
              />
            )}
          </>
        ) : (
          atencionSeleccionada && (
            <>
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={handleVolver} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors" title="Volver">
                    <ArrowLeft size={20} />
                  </button>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const config = TIPO_CONFIG[atencionSeleccionada.tipo];
                      const Icon = config.icon;
                      return (
                        <div className={`p-2 ${config.bg} rounded-lg`}>
                          <Icon size={20} className={config.color} />
                        </div>
                      );
                    })()}
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{TIPO_CONFIG[atencionSeleccionada.tipo].label} — {getResumen(atencionSeleccionada)}</h2>
                    </div>
                  </div>
                </div>
                <button onClick={handleClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30 space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm">
                    <span className="font-medium text-gray-600">Fecha:</span>{' '}
                    {atencionSeleccionada.fecha_atencion instanceof Date ? toDisplayDate(atencionSeleccionada.fecha_atencion) : ''}
                  </p>
                </div>

                {atencionSeleccionada.tipo === 'medica' && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Signos Vitales</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="font-medium text-gray-500">Presión Arterial:</span> {atencionSeleccionada.presion_arterial || '—'}</div>
                      <div><span className="font-medium text-gray-500">Temperatura:</span> {atencionSeleccionada.temperatura ? `${atencionSeleccionada.temperatura} °C` : '—'}</div>
                      <div><span className="font-medium text-gray-500">Frec. Cardíaca:</span> {atencionSeleccionada.frecuencia_cardiaca ? `${atencionSeleccionada.frecuencia_cardiaca} lpm` : '—'}</div>
                      <div><span className="font-medium text-gray-500">Peso:</span> {atencionSeleccionada.peso ? `${atencionSeleccionada.peso} kg` : '—'}</div>
                      <div><span className="font-medium text-gray-500">Talla:</span> {atencionSeleccionada.talla ? `${atencionSeleccionada.talla} cm` : '—'}</div>
                      <div><span className="font-medium text-gray-500">Sat. O₂:</span> {atencionSeleccionada.saturacion_oxigeno ? `${atencionSeleccionada.saturacion_oxigeno}%` : '—'}</div>
                    </div>
                    {atencionSeleccionada.observaciones && (
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Observaciones</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{atencionSeleccionada.observaciones}</p>
                      </div>
                    )}
                  </div>
                )}

                {atencionSeleccionada.tipo === 'medica' && renderEspecialidades(atencionSeleccionada).length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Especialidades</h3>
                    {renderEspecialidades(atencionSeleccionada)}
                  </div>
                )}

                {(atencionSeleccionada.tipo === 'beneficio' || atencionSeleccionada.tipo === 'donacion') && renderDetalleDinamico(atencionSeleccionada).length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {atencionSeleccionada.tipo === 'beneficio' ? 'Detalle del Beneficio' : 'Detalle de la Donación'}
                    </h3>
                    {renderDetalleDinamico(atencionSeleccionada)}
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>

      <AtencionMedicaModal
        isOpen={editModalOpen}
        onClose={handleCloseEdit}
        historiaClinicaId={atencionEdit?.historia_clinica_id || ''}
        refugiadoNombre={refugiadoNombre}
        atencionToEdit={atencionEdit}
      />
    </div>
  );
}
