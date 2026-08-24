import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { doc, getDoc, db } from '../services/firebase';

const PendingApproval = () => {
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  // Guards contra corridas: impede chamadas duplicadas de checkStatus,
  // setState após desmontagem e navegação no mesmo tick do updateUser
  // (que causavam o crash "insertBefore" do React).
  const mountedRef = useRef(true);
  const checkingRef = useRef(false);

  // Quando montar, tenta verificar o status real no Firestore
  useEffect(() => {
    mountedRef.current = true;
    checkStatus();
    return () => { mountedRef.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkStatus = async () => {
    if (!user?.uid || checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    try {
      const userRef = doc(db, 'usuarios', user.uid);
      const snap = await getDoc(userRef);
      if (!mountedRef.current) return;
      if (snap.exists()) {
        const data = snap.data();
        if (data.status === 'ativo') {
          // Foi aprovado! Atualiza store e redireciona
          updateUser({ status: 'ativo', tipo: data.tipo || 'user' });
          // Adia a navegação para o próximo tick, evitando que o store update
          // e o router commit disputem o mesmo DOM no mesmo frame.
          setTimeout(() => {
            if (mountedRef.current) navigate('/', { replace: true });
          }, 0);
          return;
        }
      }
      setChecked(true);
    } catch (err) {
      console.warn('[Pending] Erro ao verificar status:', err.message);
    } finally {
      if (mountedRef.current) setChecking(false);
      checkingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-700 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-emerald-100/50 overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 mb-4">
              <Clock size={32} className="text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Aguardando Aprovação</h1>
            <p className="text-sm text-slate-400 mt-2">
              Sua conta foi criada com sucesso, mas ainda não foi liberada.
            </p>
          </div>

          <div className="border-t border-emerald-100/50" />

          <div className="px-8 py-6 space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-xs text-slate-600">
                <strong className="text-slate-800">{user?.email}</strong>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Um administrador precisa liberar seu acesso antes de você visualizar os dados.
              </p>
            </div>

            {checked && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-xs text-blue-700 text-center">
                  Você ainda está como pendente no Firestore.
                  {checking ? ' Verificando...' : ''}
                </p>
              </div>
            )}

            <p className="text-xs text-slate-400 text-center">
              Tente novamente mais tarde ou entre em contato com o administrador.
            </p>

            {/* Botao de verificar novamente */}
            <button
              onClick={checkStatus}
              disabled={checking}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors disabled:opacity-50"
            >
              {checking ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              {checking ? 'Verificando...' : 'Verificar novamente'}
            </button>

            <button
              onClick={() => { logout(); navigate('/login', { replace: true }); }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-red-100 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              Sair e voltar ao login
            </button>
          </div>

          <div className="px-8 py-4 bg-emerald-50/30 border-t border-emerald-100/30 text-center">
            <p className="text-[10px] text-slate-400"> &copy; 2026 Gestão DMA Analytics</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
