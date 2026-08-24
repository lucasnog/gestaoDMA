import React from 'react';
import { useRouteError } from 'react-router-dom';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';

const FatalScreen = ({ title, message }) => {
  const handleReload = () => window.location.href = '/';
  const handleLogout = async () => {
    try { await useAuthStore.getState().logout(); } catch (e) { /* ignora */ }
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-700 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-emerald-100/50 overflow-hidden">
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/25 mb-4">
            <AlertTriangle size={32} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-400 mt-2">
            Ocorreu um erro inesperado no aplicativo. Tente recarregar a página ou volte ao login.
          </p>
        </div>

        <div className="border-t border-emerald-100/50" />

        <div className="px-8 py-6 space-y-3">
          {message && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100">
              <p className="text-[11px] text-red-600 break-words font-mono">{message}</p>
            </div>
          )}

          <button
            onClick={handleReload}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors"
          >
            <RefreshCw size={16} />
            Recarregar página
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-red-100 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
            Sair e voltar ao login
          </button>
        </div>

        <div className="px-8 py-4 bg-emerald-50/30 border-t border-emerald-100/30 text-center">
          <p className="text-[10px] text-slate-400">&copy; 2026 Gestão DMA Analytics</p>
        </div>
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Erro inesperado no aplicativo:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <FatalScreen title="Algo deu errado" message={this.state.message} />;
    }
    return this.props.children;
  }
}

const RouteErrorBoundary = () => {
  const error = useRouteError();
  console.error('[RouteErrorBoundary] Erro na rota:', error);
  return <FatalScreen title="Algo deu errado" message={error?.message || String(error)} />;
};

export default ErrorBoundary;
export { RouteErrorBoundary };
