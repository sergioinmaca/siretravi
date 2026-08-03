import { useState, useEffect } from 'react';
import { X, Save, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCampamento } from '../../context/CampamentoContext';
import type { Usuario, ModuloSistema, Accion } from '../../types';

interface PermisoConfig {
  acciones: string[];
  campamentos: string[] | null;
}

interface UsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioToEdit?: Usuario | null;
  onSaved: () => void;
  campamentoInicial?: string | null;
  esMasterInicial?: boolean;
  esGlobalInicial?: boolean;
}

export default function UsuarioModal({ isOpen, onClose, usuarioToEdit, onSaved, campamentoInicial = null, esMasterInicial = false, esGlobalInicial = false }: UsuarioModalProps) {
  const isEditing = !!usuarioToEdit;
  const { campamentos } = useCampamento();
  const [nickname, setNickname] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [clave, setClave] = useState('');
  const [showClave, setShowClave] = useState(false);
  const [esGlobal, setEsGlobal] = useState(false);
  const [campamentoHogar, setCampamentoHogar] = useState<string | null>(null);
  const [modulos, setModulos] = useState<ModuloSistema[]>([]);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [selectedModulos, setSelectedModulos] = useState<Record<string, PermisoConfig>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const esMaster = isEditing ? (usuarioToEdit?.es_master ?? false) : esMasterInicial;

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setErrorMsg(null);
      const [{ data: modData }, { data: accData }] = await Promise.all([
        supabase.from('modulos').select('*').order('created_at'),
        supabase.from('acciones').select('*, modulos!inner(nombre)').order('nombre'),
      ]);
      setModulos((modData || []) as ModuloSistema[]);
      setAcciones((accData || []) as Accion[]);

      if (usuarioToEdit) {
        setNickname(usuarioToEdit.nickname);
        setNombres(usuarioToEdit.nombres);
        setApellidos(usuarioToEdit.apellidos);
        setClave('');
        setEsGlobal(usuarioToEdit.es_global ?? false);
        setCampamentoHogar(usuarioToEdit.campamento_hogar || null);

        const { data: permData } = await supabase
          .from('permisos')
          .select('modulo_id, acciones, campamentos')
          .eq('usuario_id', usuarioToEdit.id);

        if (permData) {
          const selected: Record<string, PermisoConfig> = {};
          permData.forEach((p: Record<string, unknown>) => {
            selected[p.modulo_id as string] = {
              acciones: p.acciones as string[],
              campamentos: p.campamentos as string[] | null,
            };
          });
          setSelectedModulos(selected);
        }
      } else {
        setNickname('');
        setNombres('');
        setApellidos('');
        setClave('');
        setEsGlobal(esGlobalInicial);
        setCampamentoHogar(esMasterInicial ? null : campamentoInicial);
        setSelectedModulos({});
      }
    };
    load();
  }, [isOpen, usuarioToEdit, esMasterInicial, esGlobalInicial, campamentoInicial]);

  const toggleModulo = (moduloId: string) => {
    setSelectedModulos(prev => {
      if (prev[moduloId]) {
        const next = { ...prev };
        delete next[moduloId];
        return next;
      }
      const accionesDelModulo = acciones.filter(a => a.modulo_id === moduloId);
      const tieneVer = accionesDelModulo.some(a => a.nombre === 'Ver');
      return { ...prev, [moduloId]: { acciones: tieneVer ? ['Ver'] : [], campamentos: null } };
    });
  };

  const toggleAccion = (moduloId: string, accionNombre: string) => {
    setSelectedModulos(prev => {
      const current = prev[moduloId];
      if (!current) return prev;
      const next = current.acciones.includes(accionNombre)
        ? current.acciones.filter(a => a !== accionNombre)
        : [...current.acciones, accionNombre];
      return { ...prev, [moduloId]: { ...current, acciones: next } };
    });
  };

  const setCampamentosMode = (moduloId: string, mode: 'all' | 'specific') => {
    setSelectedModulos(prev => {
      const current = prev[moduloId];
      if (!current) return prev;
      return {
        ...prev,
        [moduloId]: {
          ...current,
          campamentos: mode === 'all' ? null : [],
        },
      };
    });
  };

  const toggleCampamento = (moduloId: string, campamentoId: string) => {
    setSelectedModulos(prev => {
      const current = prev[moduloId];
      if (!current || current.campamentos === null) return prev;
      const next = current.campamentos.includes(campamentoId)
        ? current.campamentos.filter(c => c !== campamentoId)
        : [...current.campamentos, campamentoId];
      return { ...prev, [moduloId]: { ...current, campamentos: next } };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nickname.trim() || !nombres.trim() || !apellidos.trim()) return;
    if (!isEditing && !clave.trim()) return;
    if (!esMaster && !campamentoHogar) return;
    if (clave.trim() && clave.trim().length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);

    try {
      let usuarioId = usuarioToEdit?.id;
      let authId: string | undefined;

      if (isEditing && usuarioId) {
        const updates: Record<string, unknown> = {
          nickname: nickname.trim().toLowerCase(),
          nombres: nombres.trim().toUpperCase(),
          apellidos: apellidos.trim().toUpperCase(),
          es_master: esMaster,
          es_global: esMaster ? false : esGlobal,
          campamento_hogar: esMaster ? null : campamentoHogar,
        };

        const { error: updateError } = await supabase
          .from('usuarios')
          .update(updates)
          .eq('id', usuarioId);

        if (updateError) {
          if (updateError.message?.includes('duplicate') && updateError.message?.includes('nickname')) {
            setErrorMsg('Este nickname ya está en uso');
          } else {
            setErrorMsg('Error al actualizar usuario: ' + updateError.message);
          }
          setIsSubmitting(false);
          return;
        }

        if (clave.trim()) {
          console.log('[DEBUG] Cambiando contraseña - usuarioId:', usuarioId);

          const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('auth_id')
            .eq('id', usuarioId)
            .single();

          console.log('[DEBUG] userData:', userData, 'userError:', userError);
          authId = (userData as Record<string, unknown>)?.auth_id as string | undefined;
          console.log('[DEBUG] auth_id obtenido:', authId);

          const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string | undefined;
          console.log('[DEBUG] serviceKey disponible:', !!serviceKey, 'longitud:', serviceKey?.length);

          if (authId && serviceKey) {
            const { createClient } = await import('@supabase/supabase-js');
            const adminClient = createClient(
              import.meta.env.VITE_SUPABASE_URL as string,
              serviceKey,
              { auth: { persistSession: false, autoRefreshToken: false } }
            );
            const { error: pwdError } = await adminClient.auth.admin.updateUserById(authId, { password: clave });
            console.log('[DEBUG] admin.updateUserById - error:', pwdError);
          } else {
            console.warn('[DEBUG] No se cambió contraseña — falta authId o serviceKey');
          }
        }
      } else {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const { createClient } = await import('@supabase/supabase-js');
        const secondaryClient = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });

        const email = `${nickname.trim().toLowerCase()}@siretravi.local`;
        const { data: authData, error: authError } = await secondaryClient.auth.signUp({
          email,
          password: clave
        });

        if (authError || !authData.user) {
          const msg = authError?.message || 'Error desconocido';
          if (msg.includes('already registered') || msg.includes('already exists')) {
            setErrorMsg('Este nickname ya está en uso');
          } else {
            setErrorMsg('Error al crear usuario: ' + msg);
          }
          setIsSubmitting(false);
          return;
        }

        const { data: newUser, error: insertError } = await supabase.from('usuarios').insert({
          auth_id: authData.user.id,
          nickname: nickname.trim().toLowerCase(),
          nombres: nombres.trim().toUpperCase(),
          apellidos: apellidos.trim().toUpperCase(),
          es_master: esMaster,
          activo: true,
          es_global: esMaster ? false : esGlobal,
          campamento_hogar: esMaster ? null : campamentoHogar,
        }).select().single();

        if (insertError) {
          console.error('Supabase INSERT error:', insertError);
          if (insertError.message?.includes('duplicate') && insertError.message?.includes('nickname')) {
            setErrorMsg('Este nickname ya está en uso');
          } else {
            setErrorMsg('Error al guardar datos del usuario: ' + insertError.message);
          }
          setIsSubmitting(false);
          return;
        }
        usuarioId = (newUser as Record<string, unknown>)?.id as string;
      }

      if (usuarioId) {
        await supabase.from('permisos').delete().eq('usuario_id', usuarioId);

        const permisosToInsert = Object.entries(selectedModulos)
          .filter(([, config]) => config.acciones.length > 0)
          .map(([moduloId, config]) => ({
            usuario_id: usuarioId,
            modulo_id: moduloId,
            acciones: config.acciones,
            campamentos: config.campamentos,
          }));

        if (permisosToInsert.length > 0) {
          await supabase.from('permisos').insert(permisosToInsert);
        }
      }

      setIsSubmitting(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSaved();
        onClose();
      }, 1000);
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const accionesPorModulo: Record<string, Accion[]> = {};
  acciones.forEach(a => {
    if (!accionesPorModulo[a.modulo_id]) accionesPorModulo[a.modulo_id] = [];
    accionesPorModulo[a.modulo_id].push(a);
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {isEditing ? 'Modificar Usuario' : 'Crear Nuevo Usuario'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isEditing ? 'Actualiza los datos y permisos del usuario' : 'Define los datos y permisos del nuevo usuario'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30">
          {showSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <p className="font-medium">{isEditing ? 'Usuario modificado exitosamente' : 'Usuario creado exitosamente'}</p>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <p className="font-medium text-sm">{errorMsg}</p>
            </div>
          )}

          <form id="usuario-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4">
                <h3 className="font-semibold text-gray-800">Datos del Usuario</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nickname <span className="text-caracas-red">*</span></label>
                  <input required type="text" value={nickname} onChange={e => setNickname(e.target.value.toLowerCase())} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all lowercase" placeholder="Ej. operador1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña {!isEditing && <span className="text-caracas-red">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showClave ? 'text' : 'password'}
                      value={clave}
                      onChange={e => setClave(e.target.value)}
                      required={!isEditing}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all pr-12"
                      placeholder={isEditing ? 'Dejar vacío para mantener la actual' : 'Clave de acceso'}
                    />
                    <button type="button" onClick={() => setShowClave(!showClave)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showClave ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombres <span className="text-caracas-red">*</span></label>
                  <input required type="text" value={nombres} onChange={e => setNombres(e.target.value.toUpperCase())} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase" placeholder="Ej. JUAN CARLOS" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos <span className="text-caracas-red">*</span></label>
                  <input required type="text" value={apellidos} onChange={e => setApellidos(e.target.value.toUpperCase())} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase" placeholder="Ej. PÉREZ GONZÁLEZ" />
                </div>
              </div>

              <div className="px-6 pb-4 space-y-4">
                {!esMaster && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={esGlobal}
                      onChange={e => setEsGlobal(e.target.checked)}
                      className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                    />
                    <span className="font-medium text-gray-700">Usuario Global (acceso a todos los campamentos)</span>
                  </label>
                )}

                {!esMaster && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Campamento Hogar <span className="text-caracas-red">*</span>
                    </label>
                    <select
                      value={campamentoHogar || ''}
                      onChange={e => setCampamentoHogar(e.target.value || null)}
                      required={!esMaster}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all bg-white text-gray-700"
                    >
                      <option value="">Seleccionar campamento...</option>
                      {campamentos.filter(c => c.estado === 'activo').map(camp => (
                        <option key={camp.id} value={camp.id}>{camp.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4">
                <h3 className="font-semibold text-gray-800">Permisos por Módulo</h3>
                <p className="text-xs text-gray-500 mt-1">Selecciona los módulos y acciones a los que tendrá acceso el usuario</p>
              </div>
              <div className="p-6 space-y-3">
                {modulos.map(mod => {
                  const isChecked = !!selectedModulos[mod.id];
                  const modAcciones = accionesPorModulo[mod.id] || [];
                  const modConfig = selectedModulos[mod.id];
                  return (
                    <div key={mod.id} className="border border-gray-100 rounded-xl overflow-hidden">
                      <label className="flex items-center gap-3 px-4 py-3 bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleModulo(mod.id)}
                          className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                        />
                        <span className="font-medium text-gray-700">{mod.nombre}</span>
                      </label>
                      {isChecked && modAcciones.length > 0 && (
                        <div className="px-4 py-3 pl-12 flex flex-wrap gap-3 bg-white">
                          {modAcciones.map(accion => (
                            <label key={accion.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={modConfig?.acciones.includes(accion.nombre) || false}
                                onChange={() => toggleAccion(mod.id, accion.nombre)}
                                className="w-4 h-4 text-caracas-red focus:ring-caracas-red rounded"
                              />
                              <span className="text-sm text-gray-600">{accion.nombre}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {isChecked && mod.nombre !== 'Usuarios' && (
                        <div className="px-4 py-3 pl-12 border-t border-gray-50 bg-gray-50/50">
                          <div className="flex items-center gap-4 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input
                                type="radio"
                                name={`camp-mode-${mod.id}`}
                                checked={modConfig?.campamentos === null}
                                onChange={() => setCampamentosMode(mod.id, 'all')}
                                className="w-4 h-4 text-caracas-red focus:ring-caracas-red"
                              />
                              <span className="text-gray-700">Todos los campamentos</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input
                                type="radio"
                                name={`camp-mode-${mod.id}`}
                                checked={modConfig?.campamentos !== null}
                                onChange={() => setCampamentosMode(mod.id, 'specific')}
                                className="w-4 h-4 text-caracas-red focus:ring-caracas-red"
                              />
                              <span className="text-gray-700">Campamentos específicos</span>
                            </label>
                          </div>
                          {modConfig?.campamentos !== null && campamentos.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {campamentos.map(camp => (
                                <label key={camp.id} className="flex items-center gap-2 cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    checked={modConfig?.campamentos?.includes(camp.id) || false}
                                    onChange={() => toggleCampamento(mod.id, camp.id)}
                                    className="w-4 h-4 text-caracas-red focus:ring-caracas-red rounded"
                                  />
                                  <span className="text-gray-600">{camp.nombre}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} type="button" className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            form="usuario-form"
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-8 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}
