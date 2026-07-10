import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CampamentoProvider } from './context/CampamentoContext';
import MainLayout from './layouts/MainLayout';
import Inicio from './pages/Inicio';
import Refugiados from './pages/Refugiados';
import Constructor from './pages/Constructor';
import Familias from './pages/Familias';
import Usuarios from './pages/Usuarios';
import Login from './pages/Login';
import Reportes from './pages/Reportes';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { usuarioActual, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="h-screen flex items-center justify-center bg-caracas-light">
        <p className="text-gray-400 font-medium">Cargando...</p>
      </div>
    );
  }

  if (!usuarioActual) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}



function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <CampamentoProvider>
            <MainLayout />
          </CampamentoProvider>
        </ProtectedRoute>
      }>
        <Route index element={<Inicio />} />
        <Route path="refugiados" element={<Refugiados />} />
        <Route path="constructor" element={<Constructor />} />
        <Route path="familias" element={<Familias />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;