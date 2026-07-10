import { useState, useEffect, useRef, useCallback } from 'react';
import { UserPlus, MoreHorizontal, Pencil, Trash2, Search, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Usuario, Permiso, Modulo } from '../types';
import UsuarioModal from '../components/usuarios/UsuarioModal';
import { useAuth } from '../context/AuthContext';

export default function Usuarios() {
  const { usuarioActual } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState<Usuario | null>(null);
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const cargarDatos = useCallback(async () => {
    const [{ data: users }, { data: mods }, { data: perms }] = await Promise.all([
      supabase.from('usuarios').select('*').order('created_at'),
      supabase.from('modulos').select('*').order('created_at'),
      supabase.from('permisos').select('*'),
    ]);
    setUsuarios((users || []) as Usuario[]);
    setModulos((mods || []) as Modulo[]);
    setPermisos((perms || []) as Permiso[]);
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbiertoId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Generar resumen de permisos para mostrar en tabla
  const resumenPermisos = (usuario: Usuario): string => {
    if (usuario.es_master) return 'Acceso total (MASTER)';
    const usuarioPermisos = permisos.filter(p => p.usuario_id === usuario.id);
    return usuarioPermisos.map(p => {
      const modName = modulos.find(m => m.id === p.modulo_id)?.nombre || p.modulo_id;
      return `${modName} (${p.acciones.join(', ')})`;
    }).join(' · ') || 'Sin permisos';
  };

  const handleEliminar = async (id: string) => {
    setMenuAbiertoId(null);
    const usuario = usuarios.find(u => u.id === id);
    if (usuario?.es_master) {
      alert('No se puede eliminar al usuario MASTER');
      return;
    }
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    await supabase.from('usuarios').delete().eq('id', id);
    cargarDatos();
  };

  const handleModificar = (usuario: Usuario) => {
    setMenuAbiertoId(null);
    setEditandoUsuario(usuario);
    setIsModalOpen(true);
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

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h2>
          <p className="text-gray-500">Administra los operadores del sistema y sus permisos</p>
        </div>
        <button
          onClick={() => { setEditandoUsuario(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-caracas-red/20 transform hover:-translate-y-0.5"
        >
          <UserPlus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="py-4 px-6 font-semibold text-sm text-gray-500">Nickname</th>
                <th className="py-4 px-6 font-semibold text-sm text-gray-500">Nombres</th>
                <th className="py-4 px-6 font-semibold text-sm text-gray-500">Apellidos</th>
                <th className="py-4 px-6 font-semibold text-sm text-gray-500">Permisos</th>
                <th className="py-4 px-6 font-semibold text-sm text-gray-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length > 0 ? (
                usuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors group">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium text-gray-700">{usuario.nickname}</span>
                        {usuario.es_master && (
                          <span title="MASTER"><ShieldCheck size={16} className="text-caracas-red" /></span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-700">{usuario.nombres}</td>
                    <td className="py-3 px-6 text-sm text-gray-700">{usuario.apellidos}</td>
                    <td className="py-3 px-6 max-w-xs">
                      <span className="text-xs text-gray-500 line-clamp-2" title={resumenPermisos(usuario)}>
                        {resumenPermisos(usuario)}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right relative">
                      {!usuario.es_master && (
                        <button
                          onClick={() => setMenuAbiertoId(menuAbiertoId === usuario.id ? null : usuario.id)}
                          className="p-2 text-gray-400 hover:text-caracas-red hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      )}

                      {menuAbiertoId === usuario.id && (
                        <div ref={menuRef} className="absolute right-4 top-12 z-50 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden w-44">
                          <button
                            onClick={() => handleModificar(usuario)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-caracas-blue/5 hover:text-caracas-blue transition-colors text-left"
                          >
                            <Pencil size={16} />
                            Modificar
                          </button>
                          <button
                            onClick={() => handleEliminar(usuario.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left border-t border-gray-100"
                          >
                            <Trash2 size={16} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Search size={48} className="text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-600">No hay usuarios registrados</p>
                      <p className="text-sm text-gray-400">Crea el primer usuario con el botón "Nuevo Usuario"</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <UsuarioModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditandoUsuario(null); }}
        usuarioToEdit={editandoUsuario}
        onSaved={cargarDatos}
      />
    </div>
  );
}