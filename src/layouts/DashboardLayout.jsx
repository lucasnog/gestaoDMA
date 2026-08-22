import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { useDashboard } from '../hooks/useDashboard';
import { getDatabaseUpdatedAt } from '../services/api.service';

const DashboardContext = createContext(null);
export const useDashboardContext = () => useContext(DashboardContext);

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dbUpdatedAt, setDbUpdatedAt] = useState(null);

  useEffect(() => {
    getDatabaseUpdatedAt()
      .then(d => setDbUpdatedAt(d))
      .catch(() => {});
  }, []);

  const { contratos, stats, loading, search, setSearch, contratoAlvo } = useDashboard();

  const contratosFiltrados = useMemo(() => contratos, [contratos]);

  const [loadError, setLoadError] = useState(false);
  const wasLoading = useRef(true);

  useEffect(() => {
    if (wasLoading.current && !loading) {
      if (contratos.length === 0 && stats === null && !search) {
        setLoadError(true);
      } else {
        setLoadError(false);
      }
    }
    wasLoading.current = loading;
  }, [loading, contratos, stats, search]);

  return (
    <DashboardContext.Provider value={{
      contratos: contratosFiltrados,
      contratosRaw: contratos,
      stats,
      loading,
      search,
      contratoAlvo,
    }}>
      {loadError ? (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-700 to-slate-900">
          <div className="flex flex-col items-center gap-5 max-w-sm text-center px-6">
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-emerald-100 text-lg font-medium">Erro ao carregar</p>
              <p className="text-emerald-300/60 text-sm leading-relaxed">
                Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.
              </p>
            </div>
            <button onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/30">
              <RefreshCw size={16} />
              Tentar novamente
            </button>
          </div>
        </div>
      ) : (
        <div className="flex h-screen bg-emerald-50 text-slate-800 overflow-hidden w-full">
<Sidebar
              contractsAlertCount={contratos?.length || 0}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />

          <div className="flex-1 flex flex-col min-w-0">
            <div className="relative z-[100] bg-white/80 backdrop-blur-sm border-b border-emerald-100/50 pl-4 sm:pl-6 lg:pl-6 pr-4 sm:pr-6 lg:pr-8 py-3 sm:py-4 shrink-0">
              <Header
                onMenuToggle={() => setSidebarOpen(true)}
                contratoAlvo={contratoAlvo}
              />
            </div>

            {loading && (
              <div className="h-1 bg-emerald-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full animate-loading-bar" />
              </div>
            )}

            <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
              <div className="max-w-7xl mx-auto min-w-0">
                <Outlet />
              </div>
            </main>

            <div className="bg-white/50 border-t border-emerald-100/30 px-4 sm:px-6 lg:px-8 py-2 sm:py-3 shrink-0">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
                <span>Gestão DMA Analytics &copy; 2026</span>
                <span className="flex items-center gap-2 sm:gap-4">
                  {dbUpdatedAt && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span className="inline">
                        Atualizado em: {new Date(dbUpdatedAt + 'Z').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                      </span>
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardContext.Provider>
  );
};

export default DashboardLayout;