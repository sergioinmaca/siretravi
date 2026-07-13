import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [clave, setClave] = useState('');
  const [showClave, setShowClave] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim() || !clave.trim()) {
      setError('Debes ingresar nickname y clave');
      return;
    }

    setCargando(true);
    const resultado = await login(nickname.trim(), clave);
    setCargando(false);

    if (resultado.exito) {
      navigate('/');
    } else {
      setError(resultado.error || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-caracas-red/5 via-caracas-light to-caracas-blue/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Header con branding */}
          <div className="bg-gradient-to-r from-caracas-red to-red-700 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />

            <div className="relative z-10">
              <div className="w-40 h-30 mx-auto mb-6 rounded-2xl overflow-visible">
                <img src="/logovere.svg" alt="Logo" className="w-full h-full object-fit" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Gestión de Campamentos</h1>
              <p className="text-sm text-white/70 mt-1">Sistema de Registro Unificado de Campamentos</p>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800 text-center">Iniciar Sesión</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                placeholder="Ej. master"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clave</label>
              <div className="relative">
                <input
                  type={showClave ? 'text' : 'password'}
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all pr-12"
                  placeholder="Ingrese su clave"
                />
                <button
                  type="button"
                  onClick={() => setShowClave(!showClave)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showClave ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 bg-caracas-red hover:bg-red-800 text-white py-3 rounded-xl font-medium transition-all shadow-lg shadow-caracas-red/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn size={20} />
              {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-gray-400">
              Alcaldía de Caracas · Inmobiliaria Municipal Caribe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}