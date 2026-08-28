import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Contratos from './pages/Contratos';
import Medicoes from './pages/Medicoes';
import Empresas from './pages/Empresas';
import Relatorios from './pages/Relatorios';
import Aditivos from './pages/Aditivos';
import Apostilas from './pages/Apostilas';
import OrdensServico from './pages/OrdensServico';
import Empenhos from './pages/Empenhos';
import Documentos from './pages/Documentos';
import Gestores from './pages/Gestores';
import About from './pages/About';
import Login from './pages/Login';
import PendingApproval from './pages/PendingApproval';
import Admin from './pages/Admin';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Toast from './components/ui/Toast';
import { RouteErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore } from './stores/auth.store';
import { setAuthToken } from './services/api.service';

const router = createBrowserRouter([
  // Rotas publicas
  { path: "/login", element: <Login />, errorElement: <RouteErrorBoundary /> },
  { path: "/pending", element: <PendingApproval />, errorElement: <RouteErrorBoundary /> },

  // Rotas protegidas — exigem autenticacao
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "contratos", element: <Contratos /> },
      { path: "medicoes", element: <Medicoes /> },
      { path: "empresas", element: <Empresas /> },
      // { path: "relatorios", element: <Relatorios /> },
      { path: "aditivos", element: <Aditivos /> },
      { path: "apostilas", element: <Apostilas /> },
      { path: "os", element: <OrdensServico /> },
      { path: "empenhos", element: <Empenhos /> },
      { path: "gestores", element: <Gestores /> },
      { path: "admin", element: <Admin /> },
      { path: "sobre", element: <About /> },
    ],
  },
  // Qualquer rota desconhecida → login
  { path: "*", element: <Navigate to="/login" replace />, errorElement: <RouteErrorBoundary /> },
]);

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const checkSession = useAuthStore((s) => s.checkSession);
  const logout = useAuthStore((s) => s.logout);

  // Na inicialização, tenta restaurar sessão via cookie HttpOnly
  useEffect(() => {
    checkSession();
  }, []);

  // Sincroniza token com axios sempre que mudar
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  // Sessão expirada (401 / token inválido): faz logout e navega suavemente
  // para o login em vez de `window.location.href` (que causava o crash
  // "insertBefore" ao derrubar a árvore DOM no meio de um commit do React).
  useEffect(() => {
    const onSessionExpired = () => {
      logout();
      router.navigate('/login', { replace: true });
    };
    window.addEventListener('auth:session-expired', onSessionExpired);
    return () => window.removeEventListener('auth:session-expired', onSessionExpired);
  }, [logout]);

  return (
    <>
      <RouterProvider router={router} />
      <Toast />
    </>
  );
}

export default App;
