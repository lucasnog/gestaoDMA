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
import EPS from './pages/EPS';
import Portfolio from './pages/Portfolio';
import Fichas from './pages/Fichas';
import Documentos from './pages/Documentos';
import Municipios from './pages/Municipios';
import SeiProcessos from './pages/SeiProcessos';
import ContratacoesAnaLuisa from './pages/ContratacoesAnaLuisa';
import FundoProtege from './pages/FundoProtege';
import Gestores from './pages/Gestores';
import About from './pages/About';
import Login from './pages/Login';
import PendingApproval from './pages/PendingApproval';
import Admin from './pages/Admin';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Toast from './components/ui/Toast';
import { useAuthStore } from './stores/auth.store';
import { setAuthToken } from './services/api.service';

const router = createBrowserRouter([
  // Rotas publicas
  { path: "/login", element: <Login /> },
  { path: "/pending", element: <PendingApproval /> },

  // Rotas protegidas — exigem autenticacao
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "contratos", element: <Contratos /> },
      { path: "medicoes", element: <Medicoes /> },
      { path: "empresas", element: <Empresas /> },
      // { path: "relatorios", element: <Relatorios /> },
      { path: "aditivos", element: <Aditivos /> },
      { path: "apostilas", element: <Apostilas /> },
      { path: "os", element: <OrdensServico /> },
      { path: "eps", element: <EPS /> },
      { path: "portfolio", element: <Portfolio /> },
      { path: "fichas", element: <Fichas /> },
      { path: "municipios", element: <Municipios /> },
      { path: "sei", element: <SeiProcessos /> },
      { path: "contratacoes", element: <ContratacoesAnaLuisa /> },
      { path: "fundo-protege", element: <FundoProtege /> },
      { path: "gestores", element: <Gestores /> },
      { path: "admin", element: <Admin /> },
      { path: "sobre", element: <About /> },
    ],
  },
  // Qualquer rota desconhecida → login
  { path: "*", element: <Navigate to="/login" replace /> },
]);

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const checkSession = useAuthStore((s) => s.checkSession);

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

  return (
    <>
      <RouterProvider router={router} />
      <Toast />
    </>
  );
}

export default App;
