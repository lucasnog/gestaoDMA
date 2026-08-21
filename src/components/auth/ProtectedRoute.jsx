import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const isPendingFn = useAuthStore((s) => s.isPending);
  const hydrating = useAuthStore((s) => s._hydrating);
  const location = useLocation();

  // ─── Guarda 1: Hidratação/verificação ainda em andamento ──────
  // O Zustand persist restaurou o token do localStorage, mas ainda
  // estamos verificando se ele é válido junto ao backend.
  // Mostra loading até saber se a sessão é válida ou não.
  if (hydrating) {
    return (
      <div className="h-screen flex items-center justify-center bg-emerald-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <p className="text-sm text-slate-400">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  // ─── Guarda 2: Sem token → vai pro login ──────────────────────
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ─── Guarda 3: Token presente mas não autenticado (expirado?) ─
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-emerald-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <p className="text-sm text-slate-400">Restaurando sessão...</p>
        </div>
      </div>
    );
  }

  // ─── Guarda 4: Usuário pendente de aprovação ──────────────────
  if (isPendingFn() && location.pathname !== '/pending') {
    return <Navigate to="/pending" replace />;
  }

  return children;
};

export default ProtectedRoute;
