import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Usuario, Permiso } from '../types';

interface AuthContextType {
  usuarioActual: Usuario | null;
  permisos: Permiso[];
  cargando: boolean;
  login: (nickname: string, clave: string) => Promise<{ exito: boolean; error?: string }>;
  logout: () => void;
  tienePermiso: (nombreModulo: string, accion?: string) => boolean;
  tienePermisoPorCampamento: (nombreModulo: string, campamentoId: string, accion?: string) => boolean;
  obtenerCampamentosPermitidos: (nombreModulo: string) => string[] | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache de nombres de módulos (modulo_id -> nombre)
let modulosCache: Record<string, string> | null = null;

async function cargarModulosCache(): Promise<Record<string, string>> {
  if (modulosCache) return modulosCache;
  const { data } = await supabase.from('modulos').select('id, nombre');
  if (data) {
    const map: Record<string, string> = {};
    data.forEach((m: Record<string, unknown>) => { map[m.id as string] = m.nombre as string; });
    modulosCache = map;
  }
  return modulosCache || {};
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_id', session.user.id)
          .single();
          
        if (usuario && usuario.activo) {
          setUsuarioActual(usuario as Usuario);
          const { data: permisosData } = await supabase
            .from('permisos')
            .select('*')
            .eq('usuario_id', usuario.id);
          setPermisos((permisosData || []) as Permiso[]);
        } else {
          await supabase.auth.signOut();
        }
      }
      setCargando(false);
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setUsuarioActual(null);
        setPermisos([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (nickname: string, clave: string): Promise<{ exito: boolean; error?: string }> => {
    try {
      const email = `${nickname.toLowerCase().trim()}@siretravi.local`;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: clave,
      });

      if (authError || !authData.session) {
        return { exito: false, error: 'Credenciales inválidas o usuario inactivo' };
      }

      const userId = authData.session.user.id;

      // Buscar usuario en nuestra tabla interna
      let { data: usuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_id', userId)
        .single();

      if (!usuario) {
        // Auto-vincular usuarios existentes o crear master
        const { data: existingUser } = await supabase
          .from('usuarios')
          .select('*')
          .eq('nickname', nickname.toLowerCase().trim())
          .single();

        if (existingUser) {
          const { data: updatedUser, error: updateError } = await supabase
            .from('usuarios')
            .update({ auth_id: userId })
            .eq('id', existingUser.id)
            .select()
            .single();
          if (updateError) return { exito: false, error: 'Error al vincular cuenta' };
          usuario = updatedUser;
        } else if (nickname.toLowerCase().trim() === 'master') {
          const { data: newUser, error: createError } = await supabase
            .from('usuarios')
            .insert({
              auth_id: userId,
              nickname: 'master',
              nombres: 'ADMINISTRADOR',
              apellidos: 'DEL SISTEMA',
              clave: '***',
              es_master: true,
              activo: true,
            })
            .select()
            .single();
          if (createError) return { exito: false, error: 'Error al crear usuario master interno' };
          usuario = newUser;
        } else {
           await supabase.auth.signOut();
           return { exito: false, error: 'Usuario no registrado en el sistema' };
        }
      }

      if (!usuario.activo) {
        await supabase.auth.signOut();
        return { exito: false, error: 'Usuario inactivo' };
      }

      const { data: permisosData } = await supabase
        .from('permisos')
        .select('*')
        .eq('usuario_id', usuario.id);

      setUsuarioActual(usuario as Usuario);
      setPermisos((permisosData || []) as Permiso[]);
      
      return { exito: true };
    } catch {
      return { exito: false, error: 'Error de conexión con el servidor' };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUsuarioActual(null);
    setPermisos([]);
  }, []);

  const tienePermiso = useCallback((nombreModulo: string, accion?: string): boolean => {
    if (!usuarioActual) return false;
    if (usuarioActual.es_master) return true;

    const moduloEntry = Object.entries(modulosCache || {}).find(
      ([, nombre]) => nombre === nombreModulo
    );
    if (!moduloEntry) return false;

    const permiso = permisos.find(p => p.modulo_id === moduloEntry[0]);
    if (!permiso) return false;

    if (!accion) return true;
    return permiso.acciones.includes(accion);
  }, [usuarioActual, permisos]);

  const tienePermisoPorCampamento = useCallback((nombreModulo: string, campamentoId: string, accion?: string): boolean => {
    if (!usuarioActual) return false;
    if (usuarioActual.es_master) return true;

    const moduloEntry = Object.entries(modulosCache || {}).find(
      ([, nombre]) => nombre === nombreModulo
    );
    if (!moduloEntry) return false;

    const permiso = permisos.find(p => p.modulo_id === moduloEntry[0]);
    if (!permiso) return false;

    if (permiso.campamentos === null) {
      if (!accion) return true;
      return permiso.acciones.includes(accion);
    }

    if (!permiso.campamentos.includes(campamentoId)) return false;

    if (!accion) return true;
    return permiso.acciones.includes(accion);
  }, [usuarioActual, permisos]);

  const obtenerCampamentosPermitidos = useCallback((nombreModulo: string): string[] | null => {
    if (!usuarioActual) return [];
    if (usuarioActual.es_master) return null;

    const moduloEntry = Object.entries(modulosCache || {}).find(
      ([, nombre]) => nombre === nombreModulo
    );
    if (!moduloEntry) return [];

    const permiso = permisos.find(p => p.modulo_id === moduloEntry[0]);
    if (!permiso) return [];

    return permiso.campamentos;
  }, [usuarioActual, permisos]);

  // Precargar cache de módulos al montar
  useEffect(() => { cargarModulosCache(); }, []);

  return (
    <AuthContext.Provider value={{
      usuarioActual, permisos, cargando,
      login, logout, tienePermiso,
      tienePermisoPorCampamento,
      obtenerCampamentosPermitidos,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}