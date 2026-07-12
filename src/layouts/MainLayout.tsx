import { useState, useMemo, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Grid,
  BarChart2,
  Settings,
  Menu,
  ChevronLeft,
  MapPin,
  ChevronDown,
  Heart,
  LogOut,
  UserCircle,
  HeartPulse,
} from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { path: '/', icon: Home, label: 'Inicio' },
  { path: '/refugiados', icon: Users, label: 'Refugiados' },
  { path: '/familias', icon: Heart, label: 'Familias' },
  { path: '/constructor', icon: Grid, label: 'Constructor' },
  { path: '/salud', icon: HeartPulse, label: 'Salud' },
  { path: '/reportes', icon: BarChart2, label: 'Reportes' },
  { path: '/usuarios', icon: Settings, label: 'Usuarios' },
];

const pathToModulo: Record<string, string> = {
  '/': 'Inicio',
  '/refugiados': 'Refugiados',
  '/familias': 'Familias',
  '/constructor': 'Constructor',
  '/salud': 'Salud',
  '/reportes': 'Reportes',
  '/usuarios': 'Usuarios',
};

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { campamentos, campamentoSeleccionado, seleccionarCampamento } = useCampamento();
  const { usuarioActual, tienePermiso, obtenerCampamentosPermitidos, logout } = useAuth();

  // Filtrar menú según permisos (MASTER ve todo)
  const menuItemsFiltrados = usuarioActual?.es_master
    ? menuItems
    : menuItems.filter(item => tienePermiso(item.label, 'Ver'));

  // Módulo actual según la ruta
  const moduloActual = pathToModulo[location.pathname]
    || (location.pathname.startsWith('/salud') ? 'Salud' : 'Inicio');

  // Campamentos permitidos para el módulo actual
  const campamentosPermitidos = useMemo(() => {
    if (!usuarioActual || usuarioActual.es_master) return campamentos;
    const permitidos = obtenerCampamentosPermitidos(moduloActual);
    if (permitidos === null) return campamentos;
    return campamentos.filter(c => permitidos.includes(c.id));
  }, [usuarioActual, obtenerCampamentosPermitidos, moduloActual, campamentos]);

  // Auto-seleccionar si el actual ya no está permitido
  // Auto-seleccionar si el actual ya no está permitido
  useEffect(() => {
    if (campamentoSeleccionado && campamentosPermitidos.length > 0) {
      const siguePermitido = campamentosPermitidos.some(c => c.id === campamentoSeleccionado.id);
      if (!siguePermitido) {
        seleccionarCampamento(campamentosPermitidos[0].id);
      }
    }
  }, [campamentosPermitidos, campamentoSeleccionado, seleccionarCampamento]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-caracas-light overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-20'
          } bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col relative shadow-sm z-30`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
          {isSidebarOpen && (
            <span className="text-caracas-red font-bold text-md truncate ml-2">
              GESTIÓN DE REFUGIOS
            </span>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors mx-auto"
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto">
          {menuItemsFiltrados.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/salud'
              ? location.pathname.startsWith('/salud')
              : location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-caracas-red text-white shadow-md shadow-caracas-red/20'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-caracas-red'
                  }`}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <Icon size={22} className={`shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-caracas-red'}`} />
                {isSidebarOpen && (
                  <span className="font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer del sidebar — usuario + cerrar sesión */}
        <div className="border-t border-gray-100 px-3 py-4 shrink-0">
          {isSidebarOpen && usuarioActual && (
            <div className="flex items-center gap-3 px-3 mb-3">
              <UserCircle size={32} className="text-gray-400 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-gray-700 truncate leading-tight">
                  {usuarioActual.nombres}
                </p>
                <p className="text-xs text-gray-500 truncate leading-tight">
                  {usuarioActual.apellidos}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            title={!isSidebarOpen ? 'Cerrar Sesión' : undefined}
          >
            <LogOut size={20} className="shrink-0" />
            {isSidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm shrink-0 z-20">
          <h1 className="text-xl font-semibold text-gray-800">Panel de Control</h1>

          {/* Dropdown de Selección de Campamento */}
          <div className="relative group">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <MapPin size={18} className="text-caracas-red" />
              <span className="font-medium text-gray-700">
                {campamentoSeleccionado?.nombre || 'Seleccione Campamento'}
              </span>
              <ChevronDown size={16} className="text-gray-400 ml-2" />
            </div>

            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-400 uppercase px-3 mb-2 mt-1">Sedes Activas</p>
                {campamentosPermitidos.length > 0 ? (
                  campamentosPermitidos.map((camp) => (
                    <button
                      key={camp.id}
                      onClick={() => seleccionarCampamento(camp.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${camp.id === campamentoSeleccionado?.id
                        ? 'bg-caracas-red/10 text-caracas-red font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      <MapPin size={16} className={camp.id === campamentoSeleccionado?.id ? 'text-caracas-red' : 'text-gray-400'} />
                      <span className="truncate">{camp.nombre}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-sm text-gray-400">
                    No tienes acceso a ningún campamento
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-caracas-light">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}