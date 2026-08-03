import { ChevronDown, ChevronRight, Pencil, Trash2, ShieldCheck, UserPlus } from 'lucide-react';
import type { Usuario } from '../../types';

interface AcordeonUsuariosProps {
  titulo: string;
  usuarios: Usuario[];
  esMaster: boolean;
  campamentoId: string | null;
  onNuevoUsuario: (campamentoId: string | null) => void;
  onModificar: (usuario: Usuario) => void;
  onEliminar: (id: string) => void;
  terminoBusqueda: string;
  expandido: boolean;
  onToggle: () => void;
  usuarioActualId: string;
}

function resaltarTexto(texto: string, termino: string) {
  if (!termino) return texto;
  const idx = texto.toLowerCase().indexOf(termino.toLowerCase());
  if (idx === -1) return texto;
  return (
    <>
      {texto.slice(0, idx)}
      <span className="font-bold text-caracas-red bg-red-50 rounded">{texto.slice(idx, idx + termino.length)}</span>
      {texto.slice(idx + termino.length)}
    </>
  );
}

export default function AcordeonUsuarios({
  titulo,
  usuarios,
  esMaster,
  campamentoId,
  onNuevoUsuario,
  onModificar,
  onEliminar,
  terminoBusqueda,
  expandido,
  onToggle,
  usuarioActualId,
}: AcordeonUsuariosProps) {
  const usuariosFiltrados = terminoBusqueda
    ? usuarios.filter(u =>
        u.nickname.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        u.nombres.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        u.apellidos.toLowerCase().includes(terminoBusqueda.toLowerCase())
      )
    : usuarios;

  const sinResultados = terminoBusqueda && usuarios.length > 0 && usuariosFiltrados.length === 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="w-full flex items-center justify-between px-6 py-4 bg-caracas-red hover:bg-red-800 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          {expandido ? (
            <ChevronDown size={20} className="text-white/80" />
          ) : (
            <ChevronRight size={20} className="text-white/80" />
          )}
          <span className="font-semibold text-white">{titulo}</span>
          <span className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
            {usuarios.length}
          </span>
        </div>
        <button
          onClick={e => {
            e.stopPropagation();
            onNuevoUsuario(campamentoId);
          }}
          className="flex items-center gap-1.5 text-xs font-medium bg-white text-caracas-red hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <UserPlus size={14} />
          Nuevo Usuario{esMaster ? ' Master' : ''}
        </button>
      </div>

      {expandido && (
        <div className="border-t border-gray-100">
          {sinResultados ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              Sin resultados para &ldquo;{terminoBusqueda}&rdquo; en {titulo}
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              Sin usuarios en este{esMaster ? ' grupo' : ' campamento'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="py-3 px-6 font-semibold text-sm text-gray-500">Nickname</th>
                    <th className="py-3 px-6 font-semibold text-sm text-gray-500">Nombres</th>
                    <th className="py-3 px-6 font-semibold text-sm text-gray-500">Apellidos</th>
                    <th className="py-3 px-6 font-semibold text-sm text-gray-500 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map(usuario => (
                    <tr key={usuario.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-medium text-gray-700">
                            {typeof resaltarTexto(usuario.nickname, terminoBusqueda) === 'string'
                              ? resaltarTexto(usuario.nickname, terminoBusqueda) as string
                              : usuario.nickname}
                          </span>
                          {usuario.es_master && (
                          <span title="MASTER"><ShieldCheck size={16} className="text-caracas-red" /></span>
                        )}
                        </div>
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-700">
                        {resaltarTexto(usuario.nombres, terminoBusqueda)}
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-700">
                        {resaltarTexto(usuario.apellidos, terminoBusqueda)}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onModificar(usuario)}
                            className="p-2 text-caracas-blue hover:text-caracas-blue hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modificar"
                          >
                            <Pencil size={16} />
                          </button>
                          {usuario.id !== usuarioActualId && (
                            <button
                              onClick={() => onEliminar(usuario.id)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
