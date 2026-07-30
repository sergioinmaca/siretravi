import { useState, useMemo } from 'react';
import { Tent, BedDouble, MapPin, Plus, ShieldOff, Trash2, Loader2, CheckCircle2, AlertCircle, Search, User, PawPrint, ImageOff } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import type { Campamento } from '../types';
import CrearRefugioModal from '../components/constructor/CrearRefugioModal';
import { buscarFotosHuerfanas, eliminarFotosHuerfanas } from '../hooks/useFotoUpload';
import type { FotoHuerfana, MotivoHuerfana } from '../hooks/useFotoUpload';

export default function Constructor() {
  const { campamentos } = useCampamento();
  const { tienePermiso, obtenerCampamentosPermitidos, usuarioActual } = useAuth();

  const campamentosPermitidos = useMemo(() => {
    const idsPermitidos = obtenerCampamentosPermitidos('Constructor');
    if (idsPermitidos === null) return campamentos;
    return campamentos.filter(c => idsPermitidos.includes(c.id));
  }, [campamentos, obtenerCampamentosPermitidos]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCamp, setEditingCamp] = useState<Campamento | null>(null);

  const [huerfanas, setHuerfanas] = useState<FotoHuerfana[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [resultadoLimpieza, setResultadoLimpieza] = useState<{
    tipo: 'exito' | 'error';
    mensaje: string;
  } | null>(null);

  const esMaster = usuarioActual?.es_master === true;

  const MOTIVO_LABELS: Record<MotivoHuerfana, { text: string; color: string }> = {
    integrante_eliminado: { text: 'Integrante eliminado sin limpiar fotos', color: 'bg-red-50 text-red-600' },
    foto_removida: { text: 'Foto removida del registro pero no borrada del storage', color: 'bg-amber-50 text-amber-700' },
    foto_reemplazada: { text: 'Foto reemplazada, archivo anterior no eliminado', color: 'bg-blue-50 text-blue-700' },
    desconocido: { text: 'Origen desconocido', color: 'bg-gray-100 text-gray-500' },
  };

  const calcularTotalCamas = (campamento: typeof campamentos[0]) => {
    return campamento.modulos.reduce((total, c) => {
      return total + (c.literas * 2) + c.camas_individuales + (c.camas_duplex * 2);
    }, 0);
  };

  const nombreCampamento = (id: string) => {
    return campamentos.find(c => c.id === id)?.nombre || id;
  };

  const handleBuscarHuerfanas = async () => {
    setBuscando(true);
    setHuerfanas(null);
    setSeleccionados(new Set());
    setResultadoLimpieza(null);
    try {
      const result = await buscarFotosHuerfanas();
      setHuerfanas(result);
    } catch (err) {
      console.error('[Constructor] Error al buscar huérfanas:', err);
      setResultadoLimpieza({
        tipo: 'error',
        mensaje: 'Error al buscar fotos huérfanas. Verifique que la función RPC esté instalada en Supabase.',
      });
    } finally {
      setBuscando(false);
    }
  };

  const handleEliminarSeleccionadas = async () => {
    if (!huerfanas || seleccionados.size === 0) return;
    const seleccionadas = [...seleccionados].map(i => huerfanas[i]);
    const count = seleccionadas.length;
    const confirmar = window.confirm(
      `¿Está seguro de eliminar ${count} foto(s) seleccionada(s)? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    setEliminando(true);
    setResultadoLimpieza(null);
    try {
      const paths = seleccionadas.map(h => h.storage_path);
      const { eliminadas, fallidas } = await eliminarFotosHuerfanas(paths);

      if (fallidas.length > 0) {
        setResultadoLimpieza({
          tipo: 'error',
          mensaje: `Se eliminaron ${eliminadas} de ${count} foto(s). ${fallidas.length} no pudieron eliminarse. Revise la consola.`,
        });
      } else {
        setResultadoLimpieza({
          tipo: 'exito',
          mensaje: `Se eliminaron ${eliminadas} foto(s) correctamente.`,
        });
      }
      setHuerfanas(prev => prev ? prev.filter((_, i) => !seleccionados.has(i)) : null);
      setSeleccionados(new Set());
    } catch (err) {
      console.error('[Constructor] Error al eliminar huérfanas:', err);
      setResultadoLimpieza({
        tipo: 'error',
        mensaje: 'Error al eliminar fotos huérfanas.',
      });
    } finally {
      setEliminando(false);
    }
  };

  const toggleSeleccion = (i: number) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const toggleTodos = () => {
    if (!huerfanas) return;
    if (seleccionados.size === huerfanas.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(huerfanas.map((_, i) => i)));
    }
  };

  return (
    <div className="space-y-6">

      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Constructor de Campamentos</h2>
          <p className="text-gray-500">Gestiona la infraestructura de los campamentos y sus módulos</p>
        </div>
        {tienePermiso('Constructor', 'Crear') && (
          <button
            onClick={() => {
              setEditingCamp(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-caracas-red/20 transform hover:-translate-y-0.5"
          >
            <Plus size={20} />
            Crear Nuevo Campamento
          </button>
        )}
      </div>

      {esMaster && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="bg-amber-50/80 border-b border-amber-100 px-6 py-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Trash2 size={18} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Mantenimiento del Sistema</h3>
              <p className="text-xs text-gray-500">Fotos huérfanas en Storage: archivos sin referencia en la base de datos.</p>
            </div>
          </div>
          <div className="p-6">
            {resultadoLimpieza && (
              <div className={`p-4 rounded-xl flex items-center gap-3 mb-4 ${
                resultadoLimpieza.tipo === 'exito'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {resultadoLimpieza.tipo === 'exito' ? (
                  <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                ) : (
                  <AlertCircle size={20} className="text-red-600 shrink-0" />
                )}
                <p className="font-medium text-sm">{resultadoLimpieza.mensaje}</p>
              </div>
            )}

            {huerfanas === null ? (
              <button
                onClick={handleBuscarHuerfanas}
                disabled={buscando}
                className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buscando ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Escaneando Storage...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Buscar fotos huérfanas
                  </>
                )}
              </button>
            ) : huerfanas.length === 0 ? (
              <div className="p-4 rounded-xl flex items-center gap-3 bg-green-50 border border-green-200 text-green-800">
                <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                <p className="font-medium text-sm">No se encontraron fotos huérfanas. Todo está limpio.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-center py-2 px-1 w-8">
                          <input
                            type="checkbox"
                            checked={huerfanas.length > 0 && seleccionados.size === huerfanas.length}
                            ref={el => {
                              if (el) el.indeterminate = seleccionados.size > 0 && seleccionados.size < huerfanas.length;
                            }}
                            onChange={toggleTodos}
                            className="w-4 h-4 rounded border-gray-300 text-caracas-red focus:ring-caracas-red cursor-pointer"
                          />
                        </th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Foto</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Tipo</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Nombres y Apellidos</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Motivo</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Campamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {huerfanas.map((h, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-1 text-center">
                            <input
                              type="checkbox"
                              checked={seleccionados.has(i)}
                              onChange={() => toggleSeleccion(i)}
                              className="w-4 h-4 rounded border-gray-300 text-caracas-red focus:ring-caracas-red cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                              <img
                                src={h.preview_url}
                                alt={`Foto ${h.tipo}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).parentElement!.classList.add('text-gray-400');
                                }}
                              />
                              <ImageOff size={20} className="hidden" />
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              h.tipo === 'persona'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {h.tipo === 'persona' ? (
                                <User size={12} />
                              ) : (
                                <PawPrint size={12} />
                              )}
                              {h.tipo === 'persona' ? 'Persona' : 'Mascota'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {h.refugiado_nombre ? (
                              <span className="text-gray-800 font-medium">{h.refugiado_nombre}</span>
                            ) : (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {(() => {
                              const { text, color } = MOTIVO_LABELS[h.motivo];
                              return (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
                                  <AlertCircle size={10} />
                                  {text}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-2 px-3 text-gray-600">
                            {nombreCampamento(h.campamento_id)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Se encontraron <span className="font-bold text-gray-800">{huerfanas.length}</span> foto(s) huérfana(s).
                  </p>
                  <button
                    onClick={handleEliminarSeleccionadas}
                    disabled={eliminando || seleccionados.size === 0}
                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {eliminando ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} />
                        Eliminar seleccionadas{seleccionados.size > 0 ? ` (${seleccionados.size})` : ''}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid de Cards */}
      {campamentosPermitidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ShieldOff size={64} className="mb-4 opacity-40" />
          <p className="text-lg font-medium text-gray-500">Sin acceso a campamentos</p>
          <p className="text-sm text-gray-400 mt-1">No tienes permisos para gestionar ningún campamento en el módulo Constructor</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campamentosPermitidos.map((camp) => (
          <div
            key={camp.id}
            onClick={() => {
              setEditingCamp(camp);
              setIsModalOpen(true);
            }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-caracas-red/30 cursor-pointer transition-all duration-300 group"
          >
            {/* Header de la Card */}
            <div className="bg-gradient-to-r from-caracas-red to-red-700 p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
              <h3 className="text-lg font-bold text-white relative z-10 truncate">{camp.nombre}</h3>
              <div className="flex items-center gap-1.5 mt-1.5 relative z-10">
                <MapPin size={14} className="text-white/70" />
                <p className="text-sm text-white/80 truncate">{camp.ubicacion}</p>
              </div>
              <span className={`absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full z-10 ${
                camp.estado === 'activo' ? 'bg-green-400/20 text-green-100' : 'bg-gray-400/20 text-gray-200'
              }`}>
                {camp.estado === 'activo' ? '● Activo' : '○ Inactivo'}
              </span>
            </div>

            {/* Body de la Card */}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl text-center group-hover:bg-caracas-blue/5 transition-colors">
                  <Tent size={24} className="mx-auto mb-1 text-caracas-blue" />
                  <p className="text-2xl font-bold text-gray-800">{camp.modulos.length}</p>
                  <p className="text-xs text-gray-500 font-medium">Módulo{camp.modulos.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl text-center group-hover:bg-caracas-red/5 transition-colors">
                  <BedDouble size={24} className="mx-auto mb-1 text-caracas-red" />
                  <p className="text-2xl font-bold text-gray-800">{calcularTotalCamas(camp)}</p>
                  <p className="text-xs text-gray-500 font-medium">Camas</p>
                </div>
              </div>

              {/* Resumen de modulos */}
              <div className="mt-4 space-y-2">
                {camp.modulos.slice(0, 3).map((modulo) => (
                  <div key={modulo.id} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="font-medium text-gray-700 truncate">{modulo.nombre}</span>
                    <span className="text-xs text-gray-500 shrink-0 ml-2">
                      {modulo.literas}L · {modulo.camas_individuales}I · {modulo.camas_duplex}D
                    </span>
                  </div>
                ))}
                {camp.modulos.length > 3 && (
                  <p className="text-xs text-gray-400 text-center">+{camp.modulos.length - 3} módulo(s) más</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal de Creación / Edición */}
      <CrearRefugioModal
        key={editingCamp?.id || 'create'}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCamp(null);
        }}
        campamentoToEdit={editingCamp}
      />
    </div>
  );
}
