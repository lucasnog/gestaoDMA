import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { loginWithGoogle, loginWithGoogleRedirect, handleRedirectResult, logoutFirebase, getAllUsers, setUserTipo, setUserStatus, setUserPermissoes } from '../services/firebase';
import { setAuthToken, clearAuthToken, loginFirebaseBackend, verifyToken, logoutBackend } from '../services/api.service';

// Intervalo de verificação de sessão (15 minutos)
const SESSION_VERIFY_INTERVAL = 15 * 60 * 1000;

// ─── Referências para set/get do Zustand ─────────────────────────
// Necessário porque o onRehydrateStorage está FORA do escopo da
// função criadora do store (set/get não estão disponíveis lá).
// Capturamos aqui na primeira execução do state creator.
let _set = null;
let _get = null;

// Intervalo de verificação — mantido FORA do estado Zustand
// para evitar re-renders desnecessários em cada setInterval/set.
let _verifyInterval = null;

// Guarda para evitar duplicar verifySession entre onRehydrateStorage e App.checkSession
let _hydrationVerifyPromise = null;

export const useAuthStore = create(
    persist(
        (set, get) => {
            // Captura as referências para uso no onRehydrateStorage
            _set = set;
            _get = get;
            return {
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                error: null,
                usersList: [],
                _hydrated: false,
                _hydrating: true,

            /**
             * Verifica sessão existente via cookie HttpOnly (chamado na inicialização)
             * Se o backend reconhecer o cookie, restaura a sessão automaticamente
             * sem depender de localStorage.
             */
            checkSession: async () => {
                // Se o onRehydrateStorage já disparou verifySession, não duplica
                if (_hydrationVerifyPromise) {
                    const result = await _hydrationVerifyPromise;
                    return result;
                }
                try {
                    const result = await verifyToken();
                    if (result.valid) {
                        const userData = {
                            uid: result.uid,
                            email: result.email,
                            nome: result.name,
                            tipo: result.tipo || 'user',
                            permissoes: result.permissoes,
                            firebase: true
                        };
                        set({
                            user: userData,
                            isAuthenticated: true,
                            loading: false,
                            error: null
                        });
                        get().startSessionVerification();
                        console.log('[Auth] ✅ Sessão restaurada via cookie para:', result.email);
                        return true;
                    }
                    if (get().token) {
                        console.warn('[Auth] Token inválido/expirado — limpando estado');
                        get().logout();
                        window.dispatchEvent(new CustomEvent('auth:session-expired'));
                    }
                } catch (err) {
                    console.warn('[Auth] checkSession: não foi possível verificar:', err.message);
                }
                return false;
            },

            /**
             * Verifica resultado de redirect (chamar na montagem do App)
             */
            checkRedirectResult: async () => {
                try {
                    const result = await handleRedirectResult();
                    if (result) {
                        const { user, token: firebaseToken } = result;

                        // Tenta trocar Firebase token por JWT do backend
                        let finalToken = firebaseToken;
                        let backendUserData = null;
                        try {
                            const backendAuth = await loginFirebaseBackend(firebaseToken);
                            finalToken = backendAuth.token;
                            backendUserData = backendAuth.user;
                            console.log('[Auth] Token Firebase trocado por JWT do backend');
                        } catch (err) {
                            console.warn('[Auth] Backend não disponível, usando token Firebase:', err.message);
                            setAuthToken(firebaseToken);
                        }

                        // Mescla dados validados pelo backend
                        const mergedUser = backendUserData
                        ? { ...user, tipo: backendUserData.tipo, status: backendUserData.status, permissoes: backendUserData.permissoes }
                        : user;

                        set({
                            user: mergedUser,
                            token: finalToken,
                            isAuthenticated: true,
                            loading: false,
                            error: null
                        });
                        setAuthToken(finalToken);
                        get().startSessionVerification();
                        return { user: mergedUser, token: finalToken };
                    }
                } catch (err) {
                    console.warn('[auth] Redirect result error:', err.message);
                }
                return null;
            },

            loginGoogle: async () => {
                set({ loading: true, error: null });
                try {
                    const { user, token: firebaseToken } = await loginWithGoogle();

                    // PASSO 1: Troca Firebase token por JWT do backend
                    // O backend seta cookie HttpOnly + retorna token no body
                    let finalToken = firebaseToken;
                    let backendUserData = null;
                    try {
                        const backendAuth = await loginFirebaseBackend(firebaseToken);
                        finalToken = backendAuth.token;
                        backendUserData = backendAuth.user; // { uid, email, nome, tipo, status }
                        console.log('[Auth] ✅ Token Firebase trocado por JWT do backend');
                    } catch (err) {
                        // Se o backend não respondeu, tenta usar o Firebase token diretamente
                        console.warn('[Auth] ⚠️ Backend não disponível, usando token Firebase:', err.message);
                        setAuthToken(firebaseToken);
                    }

                    // PASSO 2: Se o backend retornou dados, mescla com user do Firebase
                    // O backend validou a role no Firestore — usamos a versão dele
                    const mergedUser = backendUserData
                        ? { ...user, tipo: backendUserData.tipo, status: backendUserData.status, permissoes: backendUserData.permissoes }
                        : user;

                    // PASSO 3: Salva estado e configura axios com o token final
                    set({
                        user: mergedUser,
                        token: finalToken,
                        isAuthenticated: true,
                        loading: false,
                        error: null
                    });
                    setAuthToken(finalToken);
                    get().startSessionVerification();

                    return { user, token: finalToken };
                } catch (err) {
                    const code = err.code || '';
                    let msg = 'Erro ao fazer login: ' + err.message;

                    if (code === 'auth/popup-closed-by-user') {
                        msg = 'Login cancelado';
                    } else if (code === 'auth/popup-blocked') {
                        msg = 'Popup bloqueado pelo navegador. Tente novamente ou use o login alternativo.';
                    } else if (code === 'auth/unauthorized-domain') {
                        msg = 'Domínio não autorizado. Adicione este domínio no Firebase Console.';
                    } else if (code === 'auth/cancelled-popup-request') {
                        msg = 'Login cancelado';
                    } else if (code === 'auth/operation-not-allowed') {
                        msg = 'Login com Google não habilitado. Ative no Firebase Console > Authentication > Sign-in method.';
                    } else if (err.message?.includes('offline') || err.message?.includes('Failed to get document')) {
                        msg = 'Firestore não configurado. Crie o banco no Firebase Console > Firestore Database > Criar banco.';
                    }

                    set({ loading: false, error: msg });
                    throw err;
                }
            },

            /**
             * Login alternativo via redirect (fallback para popup bloqueado)
             */
            loginGoogleRedirect: async () => {
                set({ loading: true, error: null });
                try {
                    await loginWithGoogleRedirect();
                    // A pagina sera recarregada pelo redirect
                } catch (err) {
                    set({ loading: false, error: 'Erro ao redirecionar: ' + err.message });
                    throw err;
                }
            },

            logout: async () => {
                try { await logoutFirebase(); } catch (e) { console.warn('[auth]', e.message); }
                // Limpa cookie HttpOnly no backend
                try { await logoutBackend(); } catch (e) { /* backend pode estar offline */ }
                clearAuthToken();
                get().stopSessionVerification();
                set({ user: null, token: null, isAuthenticated: false, error: null, usersList: [] });
            },

            clearError: () => set({ error: null }),

            updateUser: (userData) => set((state) => ({
                user: { ...state.user, ...userData }
            })),

            isAdmin: () => get().user?.tipo === 'admin',
            isPending: () => get().user?.status === 'pendente',
            isAtivo: () => get().user?.status === 'ativo',

            loadUsers: async () => {
                try {
                    const users = await getAllUsers();
                    set({ usersList: users });
                } catch (err) {
                    console.warn('[auth] Erro ao carregar usuarios:', err.message);
                }
            },

            updateUserTipo: async (uid, novoTipo) => {
                await setUserTipo(uid, novoTipo);
                const users = get().usersList.map(u =>
                    u.uid === uid ? { ...u, tipo: novoTipo } : u
                );
                set({ usersList: users });
                if (get().user?.uid === uid) {
                    set({ user: { ...get().user, tipo: novoTipo } });
                }
            },

            updateUserStatus: async (uid, novoStatus) => {
                await setUserStatus(uid, novoStatus);
                const users = get().usersList.map(u =>
                    u.uid === uid ? { ...u, status: novoStatus } : u
                );
                set({ usersList: users });
                if (get().user?.uid === uid) {
                    set({ user: { ...get().user, status: novoStatus } });
                }
            },

            updateUserPermissoes: async (uid, novasPermissoes) => {
                await setUserPermissoes(uid, novasPermissoes);
                const users = get().usersList.map(u =>
                    u.uid === uid ? { ...u, permissoes: novasPermissoes } : u
                );
                set({ usersList: users });
                if (get().user?.uid === uid) {
                    set({ user: { ...get().user, permissoes: novasPermissoes } });
                }
            },

            /**
             * Verifica a sessão atual junto ao backend (valida token + role)
             * Se o token expirou ou a role foi revogada (admin → user),
             * atualiza o estado local e faz logout se necessário.
             *
             * Chamado automaticamente a cada 15 minutos via startSessionVerification
             */
            verifySession: async () => {
                const state = get();
                if (!state.token || !state.isAuthenticated) return;

                try {
                    const result = await verifyToken();

                    if (!result.valid) {
                        console.warn('[Auth] ⚠️ Sessão expirou ou token inválido — fazendo logout');
                        get().logout();
                        window.dispatchEvent(new CustomEvent('auth:session-expired'));
                        return;
                    }

                    // Se o backend retornou um tipo diferente do que temos localmente,
                    // significa que a role foi alterada no Firestore (admin → user)
                    const currentTipo = state.user?.tipo;
                    const serverTipo = result.tipo;
                    const serverPermissoes = result.permissoes || [];

                    const needsUpdate = {};
                    if (serverTipo && serverTipo !== currentTipo) {
                        console.warn(
                            '[Auth] ⚠️ Role alterada no servidor:',
                            currentTipo, '→', serverTipo
                        );
                        needsUpdate.tipo = serverTipo;
                    }
                    if (serverPermissoes.length > 0 || result.permissoes !== undefined) {
                        const currentPerms = state.user?.permissoes || [];
                        if (JSON.stringify(currentPerms) !== JSON.stringify(serverPermissoes)) {
                            needsUpdate.permissoes = serverPermissoes;
                        }
                    }

                    if (Object.keys(needsUpdate).length > 0) {
                        set({
                            user: { ...state.user, ...needsUpdate }
                        });
                    }
                } catch (err) {
                    // Se o backend estiver offline, mantém sessão atual
                    console.warn('[Auth] Não foi possível verificar sessão:', err.message);
                }
            },

            /**
             * Inicia verificação periódica da sessão (a cada 15 min)
             * Deve ser chamada após o login bem-sucedido
             */
            startSessionVerification: () => {
                if (_verifyInterval) {
                    clearInterval(_verifyInterval);
                }
                _verifyInterval = setInterval(() => {
                    get().verifySession();
                }, SESSION_VERIFY_INTERVAL);
            },

            /**
             * Para a verificação periódica (chamar no logout)
             */
            stopSessionVerification: () => {
                if (_verifyInterval) {
                    clearInterval(_verifyInterval);
                    _verifyInterval = null;
                }
            },
            };
        },
        {
            name: 'sider-auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
                    // NOTA: _hydrated NÃO é persistido
            }),
            // Quando o store é restaurado do localStorage, recupera o token
            // e verifica se ainda é válido (via verifySession) antes de liberar
            // NOTA: usamos _set/_get capturados do state creator, pois
            // set/get NÃO estão disponíveis no escopo do onRehydrateStorage.
            onRehydrateStorage: () => {
                return (state, error) => {
                    if (state?.token) {
                        setAuthToken(state.token);
                        console.log('[Auth] Token restaurado — verificando...');
                        const store = _get();
                        _hydrationVerifyPromise = store.verifySession?.() || Promise.resolve();
                        _hydrationVerifyPromise.finally(() => {
                            _set({ _hydrating: false, _hydrated: true });
                            _hydrationVerifyPromise = null;
                        });
                    } else {
                        clearAuthToken();
                        _set({ _hydrating: false, _hydrated: true });
                    }
                };
            },
        }
    )
);
