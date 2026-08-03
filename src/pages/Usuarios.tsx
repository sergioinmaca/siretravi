import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Usuario } from '../types';
import UsuarioModal from '../components/usuarios/UsuarioModal';
import BuscadorUsuarios from '../components/usuarios/BuscadorUsuarios';
import AcordeonUsuarios from '../components/usuarios/AcordeonUsuarios';
import { useAuth } from '../context/AuthContext';
import { useCampamento } from '../context/CampamentoContext';

interface CampamentoInfo {
  id: string;
  nombre: string;
}

export default function Usuarios() {
  const { usuarioActual } = useAuth();
  const { campamentos: campamentosContext } = useCampamento();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState<Usuario | null>(null);
  const [campamentoInicial, setCampamentoInicial] = useState<string | null>(null);
  const [esMasterInicial, setEsMasterInicial] = useState(false);
  const [esGlobalInicial, setEsGlobalInicial] = useState(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [acordeonesExpandidos, setAcordeonesExpandidos] = useState<Set<string>>(new Set(['master']));
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setErrorCarga(null);
    try {
      const [{ data: users }] = await Promise.all([
        supabase.from('usuarios').select('*').order('created_at'),
      ]);
      setUsuarios((users || []) as Usuario[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setErrorCarga(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const usuariosMaster = usuarios.filter(u => u.es_master);

  const usuariosGlobales = usuarios.filter(
    u => !u.es_master && u.es_global
  );

  const usuariosSinCampamento = usuarios.filter(
    u => !u.es_master && !u.es_global && !u.campamento_hogar
  );

  const campamentosOrdenados: CampamentoInfo[] = campamentosContext
    .filter(c => c.estado === 'activo')
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const usuariosPorCampamento: Record<string, Usuario[]> = {};
  campamentosOrdenados.forEach(camp => {
    usuariosPorCampamento[camp.id] = usuarios.filter(
      u => !u.es_master && !u.es_global && u.campamento_hogar === camp.id
    );
  });

  const handleNuevoMaster = () => {
    setEditandoUsuario(null);
    setCampamentoInicial(null);
    setEsMasterInicial(true);
    setEsGlobalInicial(false);
    setIsModalOpen(true);
  };

  const handleNuevoGlobal = () => {
    setEditandoUsuario(null);
    setCampamentoInicial(null);
    setEsMasterInicial(false);
    setEsGlobalInicial(true);
    setIsModalOpen(true);
  };

  const handleNuevoCamp = (campId: string) => {
    setEditandoUsuario(null);
    setCampamentoInicial(campId);
    setEsMasterInicial(false);
    setEsGlobalInicial(false);
    setIsModalOpen(true);
  };

  const handleNuevoIndefinido = () => {
    setEditandoUsuario(null);
    setCampamentoInicial(null);
    setEsMasterInicial(false);
    setEsGlobalInicial(false);
    setIsModalOpen(true);
  };

  const handleModificar = (usuario: Usuario) => {
    setCampamentoInicial(null);
    setEsMasterInicial(false);
    setEditandoUsuario(usuario);
    setIsModalOpen(true);
  };

  const handleEliminar = async (id: string) => {
    console.log('[DEBUG] handleEliminar - id:', id, 'usuarioActual.id:', usuarioActual?.id);
    if (id === usuarioActual?.id) {
      alert('No puedes eliminar tu propio usuario');
      return;
    }
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    console.log('[DEBUG] delete usuario - error:', error);

    if (error) {
      console.error('[DEBUG] Error al eliminar:', error.message, 'details:', error.details, 'hint:', error.hint);
      alert('Error al eliminar: ' + error.message);
      return;
    }
    console.log('[DEBUG] Usuario eliminado exitosamente');
    cargarDatos();
  };

  const toggleAcordeon = (key: string) => {
    setAcordeonesExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (!usuarioActual?.es_master) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldCheck size={64} className="text-red-500 mb-4 opacity-50" />
        <h2 className="text-2xl font-bold text-gray-800">Acceso Denegado</h2>
        <p className="text-gray-500 mt-2 max-w-md">
          Este módulo es de acceso exclusivo para el Administrador del Sistema (MASTER).
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-64 bg-gray-100 rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 flex items-center gap-3">
              <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-8 bg-gray-100 rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldCheck size={64} className="text-red-500 mb-4 opacity-50" />
        <h2 className="text-2xl font-bold text-gray-800">Error al cargar usuarios</h2>
        <p className="text-gray-500 mt-2 max-w-md mb-6">{errorCarga}</p>
        <button
          onClick={cargarDatos}
          className="bg-caracas-red hover:bg-red-800 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const totalUsuarios = usuarios.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h2>
          <p className="text-gray-500">Administra los operadores del sistema y sus permisos</p>
        </div>
      </div>

      <BuscadorUsuarios onChange={setTerminoBusqueda} />

      <AcordeonUsuarios
        titulo="Usuarios Master"
        usuarios={usuariosMaster}
        esMaster={true}
        campamentoId={null}
        onNuevoUsuario={() => handleNuevoMaster()}
        onModificar={handleModificar}
        onEliminar={handleEliminar}
        terminoBusqueda={terminoBusqueda}
        expandido={acordeonesExpandidos.has('master')}
        onToggle={() => toggleAcordeon('master')}
        usuarioActualId={usuarioActual?.id || ''}
      />

      <AcordeonUsuarios
        titulo="Usuarios Globales"
        usuarios={usuariosGlobales}
        esMaster={false}
        campamentoId={null}
        onNuevoUsuario={() => handleNuevoGlobal()}
        onModificar={handleModificar}
        onEliminar={handleEliminar}
        terminoBusqueda={terminoBusqueda}
        expandido={acordeonesExpandidos.has('globales')}
        onToggle={() => toggleAcordeon('globales')}
        usuarioActualId={usuarioActual?.id || ''}
      />

      {usuariosSinCampamento.length > 0 && (
        <AcordeonUsuarios
          titulo="Sin Campamento Asignado"
          usuarios={usuariosSinCampamento}
          esMaster={false}
          campamentoId={null}
          onNuevoUsuario={() => handleNuevoIndefinido()}
          onModificar={handleModificar}
          onEliminar={handleEliminar}
          terminoBusqueda={terminoBusqueda}
          expandido={acordeonesExpandidos.has('indefinido')}
          onToggle={() => toggleAcordeon('indefinido')}
          usuarioActualId={usuarioActual?.id || ''}
        />
      )}

      {campamentosOrdenados.map(camp => (
        <AcordeonUsuarios
          key={camp.id}
          titulo={camp.nombre}
          usuarios={usuariosPorCampamento[camp.id] || []}
          esMaster={false}
          campamentoId={camp.id}
          onNuevoUsuario={() => handleNuevoCamp(camp.id)}
          onModificar={handleModificar}
          onEliminar={handleEliminar}
          terminoBusqueda={terminoBusqueda}
          expandido={acordeonesExpandidos.has(camp.id)}
          onToggle={() => toggleAcordeon(camp.id)}
          usuarioActualId={usuarioActual?.id || ''}
        />
      ))}

      {totalUsuarios === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <UserPlus size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-600">No hay usuarios registrados</p>
          <p className="text-sm text-gray-400 mt-1">Expande un campamento y crea el primero</p>
        </div>
      )}

      <UsuarioModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditandoUsuario(null); }}
        usuarioToEdit={editandoUsuario}
        onSaved={cargarDatos}
        campamentoInicial={campamentoInicial}
        esMasterInicial={esMasterInicial}
        esGlobalInicial={esGlobalInicial}
      />
    </div>
  );
}
