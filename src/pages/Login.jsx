import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

const Login = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const loginGoogle = useAuthStore((s) => s.loginGoogle);
  const loginGoogleRedirect = useAuthStore((s) => s.loginGoogleRedirect);
  const clearError = useAuthStore((s) => s.clearError);
  const navigate = useNavigate();
  // Garante que a navegação pós-login aconteça só uma vez (evita a corrida
  // entre checkRedirectResult e o efeito de isAuthenticated, que causava o
  // crash "insertBefore" do React).
  const navigatedRef = useRef(false);

  const goHome = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    navigate('/', { replace: true });
  }, [navigate]);

  // Verifica resultado de redirect (login alternativo) na montagem
  const checkRedirectResult = useAuthStore((s) => s.checkRedirectResult);
  useEffect(() => {
    checkRedirectResult().then((result) => {
      if (result) goHome();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Se ja estiver logado, redireciona pro dashboard
  useEffect(() => {
    if (isAuthenticated) goHome();
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navegação determinística: o clique navega assim que o login conclui,
  // sem depender apenas do efeito reativo (que às vezes não disparava).
  const handleGoogleLogin = async () => {
    try {
      const result = await loginGoogle();
      if (result) goHome();
    } catch (err) {
      // Erro já é tratado/exibido pelo store (state.error)
    }
  };

  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-700 to-slate-900">
      <div className="relative h-full w-full px-4 flex flex-col items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-2xl border border-emerald-100/50 overflow-hidden w-full max-w-md">
          {/* Header */}
          <div className="px-5 sm:px-8 pt-2 sm:pt-3 pb-3 sm:pb-4 text-center">
            <img
              src="/Logo de gestão financeira..png"
              alt="Logo Gestão DMA"
              className="mx-auto w-48 sm:w-64 h-auto object-contain"
              style={{
                filter: 'drop-shadow(0 0 1.5px #ffffff) drop-shadow(0 0 1.5px #ffffff) drop-shadow(0 0 1.5px #ffffff)',
              }}
            />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 -mt-2 sm:-mt-3">Gestão DMA Analytics</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Sistema de Monitoramento de Contratos
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-emerald-100/50" />

          {/* Body */}
          <div className="px-5 sm:px-8 py-4 sm:py-6">
            <p className="text-xs text-slate-400 text-center mb-4 sm:mb-6">
              Faça login com sua conta do Google
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 text-center" onClick={clearError}>
                {error}
              </div>
            )}

            {/* Google Login Button (popup) — padrão, funciona melhor */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`
                w-full flex items-center justify-center gap-3 px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl font-semibold text-sm
                transition-all duration-200 touch-manipulation
                ${loading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-md active:scale-[0.98]'
                }
              `}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-slate-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Entrando...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="whitespace-nowrap">Entrar com Google</span>
                </>
              )}
            </button>

            {/* Fallback: redirect (caso popup seja bloqueado) */}
            {error && error.includes('Popup bloqueado') && (
              <button
                onClick={loginGoogleRedirect}
                disabled={loading}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-semibold text-xs text-slate-500 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all touch-manipulation"
              >
                Login alternativo (redirecionamento)
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-8 py-3 sm:py-4 bg-emerald-50/30 border-t border-emerald-100/30 text-center">
            <p className="text-[10px] text-slate-400">
               &copy; {new Date().getFullYear()} Gestão DMA Analytics
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
