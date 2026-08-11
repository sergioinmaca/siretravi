import { useState, useMemo, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Grid,
  BarChart2,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ChevronDown,
  Heart,
  LogOut,
  UserCircle,
  HeartPulse,
  Calendar,
  FileText,
  UtensilsCrossed,
  Loader2,
  X,
  RefreshCw,
} from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

const menuItems = [
  { path: '/', icon: Home, label: 'Inicio' },
  { path: '/refugiados', icon: Users, label: 'Integrantes' },
  { path: '/familias', icon: Heart, label: 'Familias' },
  { path: '/constructor', icon: Grid, label: 'Constructor' },
  { path: '/salud', icon: HeartPulse, label: 'Salud' },
  { path: '/reportes', icon: BarChart2, label: 'Reportes' },
  { path: '/usuarios', icon: Settings, label: 'Usuarios' },
  { path: '/agenda', icon: Calendar, label: 'Agenda' },
  { path: '/cocina', icon: UtensilsCrossed, label: 'Cocina' },
  { path: '/actas', icon: FileText, label: 'Actas' },
];

const pathToModulo: Record<string, string> = {
  '/': 'Inicio',
  '/refugiados': 'Integrantes',
  '/familias': 'Familias',
  '/constructor': 'Constructor',
  '/salud': 'Salud',
  '/reportes': 'Reportes',
  '/usuarios': 'Usuarios',
  '/agenda': 'Agenda',
  '/cocina': 'Cocina',
  '/actas': 'Actas',
};


export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCampamentoDropdownOpen, setIsCampamentoDropdownOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const [showSidebarText, setShowSidebarText] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { campamentos, campamentoSeleccionado, seleccionarCampamento, loading, errorCarga } = useCampamento();
  const { usuarioActual, tienePermiso, obtenerCampamentosPermitidos, logout } = useAuth();
  const isMobile = useIsMobile();
  const prevMobile = useRef(isMobile);
  const campamentoDropdownRef = useRef<HTMLDivElement>(null);

  const menuItemsFiltrados = useMemo(() =>
    usuarioActual?.es_master
      ? menuItems
      : menuItems.filter(item => tienePermiso(item.label, 'Ver')),
    [usuarioActual?.es_master, tienePermiso]
  );

  const moduloActual = pathToModulo[location.pathname]
    || (location.pathname.startsWith('/salud') ? 'Salud' : 'Inicio');

  const campamentosPermitidos = useMemo(() => {
    if (!usuarioActual || usuarioActual.es_master) return campamentos;
    const permitidos = obtenerCampamentosPermitidos(moduloActual);
    if (permitidos === null) return campamentos;
    return campamentos.filter(c => permitidos.includes(c.id));
  }, [usuarioActual, obtenerCampamentosPermitidos, moduloActual, campamentos]);

  const todosLosCampamentosPermitidos = useMemo(() => {
    if (!usuarioActual || usuarioActual.es_master) return campamentos;
    const permitidos = obtenerCampamentosPermitidos(moduloActual);
    if (permitidos === null) return campamentos;
    return campamentos.filter(c => permitidos.includes(c.id));
  }, [usuarioActual, obtenerCampamentosPermitidos, moduloActual, campamentos]);

  useEffect(() => {
    if (campamentoSeleccionado && campamentosPermitidos.length > 0) {
      const siguePermitido = campamentosPermitidos.some(c => c.id === campamentoSeleccionado.id);
      if (!siguePermitido) {
        seleccionarCampamento(campamentosPermitidos[0].id);
      }
    }
  }, [campamentosPermitidos, campamentoSeleccionado, seleccionarCampamento]);

  const maxCarouselIndex = Math.max(0, menuItemsFiltrados.length - 3);
  const showCarouselArrows = menuItemsFiltrados.length > 3;

  const handleCarouselPrev = () => {
    setCarouselIndex(prev => Math.max(0, prev - 1));
  };

  const handleCarouselNext = () => {
    const maxIdx = Math.max(0, menuItemsFiltrados.length - 3);
    setCarouselIndex(prev => Math.min(maxIdx, prev + 1));
  };

  useEffect(() => {
    if (prevMobile.current !== isMobile) {
      setShowTransition(true);
      const timer = setTimeout(() => setShowTransition(false), 250);
      prevMobile.current = isMobile;
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  useEffect(() => {
    const timer = setTimeout(() => setShowGreeting(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (campamentoDropdownRef.current && !campamentoDropdownRef.current.contains(e.target as Node)) {
        setIsCampamentoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const activeIdx = menuItemsFiltrados.findIndex(item =>
      item.path === '/salud'
        ? location.pathname.startsWith('/salud')
        : location.pathname === item.path
    );
    if (activeIdx !== -1) {
      const maxIdx = Math.max(0, menuItemsFiltrados.length - 3);
      setCarouselIndex(prev => {
        if (activeIdx < prev) return activeIdx;
        if (activeIdx > prev + 2) return Math.min(activeIdx - 2, maxIdx);
        return prev;
      });
    }
  }, [location.pathname, isMobile, menuItemsFiltrados]);

  const abreviarNombreCampamento = (nombre: string) =>
    nombre.replace(/Campamento Transitorio\s*/gi, 'C.T. ').trim();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const hardRefresh = () => {
    window.location.reload();
  };

  useEffect(() => {
    if (isSidebarOpen) {
      const timer = setTimeout(() => setShowSidebarText(true), 150);
      return () => clearTimeout(timer);
    }
    setShowSidebarText(false);
  }, [isSidebarOpen]);


  if (loading || errorCarga) {
    return (
      <div className="flex h-screen items-center justify-center bg-caracas-light">
        <div className="text-center">
          {loading && (
            <>
              <Loader2 className="animate-spin text-caracas-red mx-auto" size={48} />
              <p className="mt-4 text-gray-500 font-medium">Cargando datos...</p>
            </>
          )}
          {errorCarga && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-md">
              <p className="font-semibold text-lg mb-1">Error al cargar datos</p>
              <p className="text-sm">{errorCarga}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-caracas-red text-white rounded-lg text-sm font-medium hover:bg-red-800 transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-caracas-light overflow-hidden">
      {showTransition && (
        <div className="fixed inset-0 z-50 bg-caracas-light flex items-center justify-center">
          <div className="w-10 h-10 border-[3px] border-gray-200 border-t-caracas-red rounded-full animate-spin" />
        </div>
      )}

      {/* Sidebar — Desktop */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-20'
          } hidden md:flex fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-[width] duration-300 ease-in-out flex-col shadow-sm z-40 overflow-hidden`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
          <span className="text-caracas-red font-bold text-md truncate ml-2 transition-opacity duration-150" style={{ opacity: showSidebarText ? 1 : 0 }}>
            GESTIÓN DE CAMPAMENTOS
          </span>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors mx-auto"
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto overflow-x-hidden">
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
                <span className="font-medium whitespace-nowrap transition-opacity duration-150" style={{ opacity: showSidebarText ? 1 : 0 }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 px-3 py-4 shrink-0">
          {usuarioActual && (
            <div className="flex items-center gap-3 px-3 mb-3 transition-opacity duration-150" style={{ opacity: showSidebarText ? 1 : 0 }}>
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
          <div className="flex flex-col gap-2">
            <button
              onClick={hardRefresh}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#2596be] text-white hover:brightness-110 transition-colors"
              title={!isSidebarOpen ? 'Refrescar' : undefined}
            >
              <RefreshCw size={20} className="shrink-0" />
              <span className={`overflow-hidden transition-all duration-150 ${showSidebarText ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0'}`}>
                <span className="font-medium leading-none whitespace-nowrap">Refrescar</span>
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-caracas-red text-white hover:bg-red-800 transition-colors"
              title={!isSidebarOpen ? 'Cerrar Sesión' : undefined}
            >
              <LogOut size={20} className="shrink-0" />
              <span className={`overflow-hidden transition-all duration-150 ${showSidebarText ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0'}`}>
                <span className="font-medium leading-none whitespace-nowrap">Cerrar Sesión</span>
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 min-w-0 relative">
        {/* Desktop Header */}
        <header className="relative hidden md:flex h-16 bg-white border-b border-gray-200 items-center justify-between px-8 shadow-sm shrink-0 ml-20">
          <h1 className="text-xl font-semibold text-gray-800">Panel de Control</h1>

          <div className="relative" ref={campamentoDropdownRef}>
            <div
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setIsCampamentoDropdownOpen(!isCampamentoDropdownOpen)}
            >
              <MapPin size={18} className="text-caracas-red" />
              <span className="font-medium text-gray-700">
                {campamentoSeleccionado?.nombre || 'Seleccione Campamento'}
              </span>
              <ChevronDown size={16} className={`text-gray-400 ml-2 transition-transform ${isCampamentoDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {isCampamentoDropdownOpen && (
              <div className="absolute right-0 mt-2 min-w-[498px] bg-white border border-gray-100 rounded-xl shadow-lg transition-all duration-200 overflow-hidden z-50">
                <div className="p-2">
                  <p className="text-xs font-semibold text-caracas-red uppercase px-3 mb-2 mt-1 text-right">Sedes Activas</p>
                    {campamentosPermitidos.length > 0 ? (
                      campamentosPermitidos.map((camp, idx) => (
                        <button
                          key={camp.id}
                          onClick={() => {
                            seleccionarCampamento(camp.id);
                            setIsCampamentoDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-end gap-2 ${camp.id === campamentoSeleccionado?.id
                            ? 'bg-caracas-red/10 text-caracas-red font-medium'
                            : `text-gray-600 hover:bg-gray-200 ${idx % 2 === 0 ? 'bg-gray-100' : ''}`
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
            )}
          </div>
        </header>

        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 w-full flex md:hidden h-14 bg-white border-b border-gray-200 items-center justify-between px-4 shadow-sm z-30">
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="text-[21px] font-semibold text-gray-800 leading-tight">{moduloActual}</span>
            {campamentoSeleccionado && (
              <span className="text-xs text-gray-400 leading-tight truncate">{campamentoSeleccionado.nombre}</span>
            )}
          </div>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors shrink-0 ml-2"
          >
            <Menu size={22} />
          </button>
        </header>

        {/* Content */}
        <div className={`flex-1 min-h-0 min-w-0 overflow-y-auto bg-caracas-light z-0 ${isMobile ? 'p-4 pt-14 pb-[72px]' : 'p-8 md:ml-20'}`}>
          <div className={location.pathname === '/agenda' || location.pathname === '/cocina' ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'max-w-7xl mx-auto'}>
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <div className="flex md:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-[#ffb41d] border-t border-[#e6a61a] z-40 flex-col px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div
          className="flex-1 flex items-center"
        >
          {showCarouselArrows && (
            <button
              onClick={handleCarouselPrev}
              disabled={carouselIndex === 0}
              className={`p-3 h-full flex items-center justify-center shrink-0 ${carouselIndex === 0 ? 'opacity-30' : 'text-[#28307d] hover:opacity-70'}`}
            >
              <ChevronLeft size={18} strokeWidth={3} />
            </button>
          )}

          <div className="flex-1 flex items-center justify-around overflow-hidden">
            {menuItemsFiltrados.slice(carouselIndex, carouselIndex + 3).map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/salud'
                ? location.pathname.startsWith('/salud')
                : location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1"
                >
                  <Icon
                    size={isActive ? 25 : 20}
                    strokeWidth={2}
                    className={`shrink-0 transition-all duration-200 ease-out text-[#28307d] ${isActive ? 'drop-shadow-sm' : 'opacity-70'}`}
                  />
                  <span className={`transition-all duration-200 ease-out truncate max-w-full px-0.5 tracking-wide -mt-0.5 ${isActive ? 'text-[11px] font-semibold text-white' : 'text-[10px] font-medium text-[#28307d]'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="w-4 h-0.5 bg-[#28307d] rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {showCarouselArrows && (
            <button
              onClick={handleCarouselNext}
              disabled={carouselIndex >= maxCarouselIndex}
              className={`p-3 h-full flex items-center justify-center shrink-0 ${carouselIndex >= maxCarouselIndex ? 'opacity-30' : 'text-[#28307d] hover:opacity-70'}`}
            >
              <ChevronRight size={18} strokeWidth={3} />
            </button>
          )}
        </div>

        <div className={`text-xs text-white text-center truncate px-2 pb-1 transition-all duration-150 ${showGreeting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          Hola, {usuarioActual?.nombres || 'Usuario'}
        </div>
      </div>

      {/* Hamburger Drawer */}
      {isDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 md:hidden flex flex-col animate-slide-in">
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
              <span className="font-semibold text-gray-700">Menú</span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-lg bg-caracas-red text-white hover:bg-red-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {usuarioActual && (
              <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-50">
                <UserCircle size={36} className="text-gray-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-gray-700 truncate">
                    {usuarioActual.nombres}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {usuarioActual.apellidos}
                  </p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-2">
              <p className="text-xs font-semibold text-caracas-red uppercase px-4 mb-2 mt-1">Campamentos</p>
              {todosLosCampamentosPermitidos.length > 0 ? (
                todosLosCampamentosPermitidos.map((camp) => (
                  <button
                    key={camp.id}
                    onClick={() => { seleccionarCampamento(camp.id); setIsDrawerOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 transition-colors flex items-center gap-3 ${
                      camp.id === campamentoSeleccionado?.id
                        ? 'bg-caracas-red/10 text-caracas-red font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <MapPin size={16} className={camp.id === campamentoSeleccionado?.id ? 'text-caracas-red' : 'text-gray-400'} />
                    <span className="truncate text-sm">{abreviarNombreCampamento(camp.nombre)}</span>
                  </button>
                ))
              ) : (
                <p className="px-4 py-4 text-center text-sm text-gray-400">Sin acceso a campamentos</p>
              )}
            </div>

            <div className="border-t border-gray-100 p-3 flex justify-between gap-3">
              <button
                onClick={hardRefresh}
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#2596be] text-white hover:brightness-110 transition-colors"
              >
                <RefreshCw size={20} className="shrink-0" />
                <span className="font-medium">Refrescar</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-caracas-red text-white hover:bg-red-800 transition-colors"
              >
                <LogOut size={20} className="shrink-0" />
                <span className="font-medium">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
