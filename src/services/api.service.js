import axios from 'axios';
import { API_URL } from '../config/constants';
import { auth } from './firebase';

const api = axios.create({
    baseURL: API_URL
});

// ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
// AUTENTICA├ç├âO COM O BACKEND
// ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
// Injeta o token JWT (do Firebase ou do login local) em todas as
// requisi├º├Áes para a API. Se n├úo houver token, a requisi├º├úo ser├í
// rejeitada com 401 pelo backend.
// ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

let _authToken = null;

/**
 * Define o token de autentica├º├úo para as chamadas da API
 */
export function setAuthToken(token) {
    _authToken = token;
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
}

/**
 * Remove o token de autentica├º├úo
 */
export function clearAuthToken() {
    _authToken = null;
    delete api.defaults.headers.common['Authorization'];
}

/**
 * Login contra o backend local (usu├írio/senha do .env)
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{token: string, user: object}>}
 */
export async function loginBackend(username, password) {
    const response = await api.post('/auth/login', { username, password });
    const data = response.data;
    setAuthToken(data.token);
    return data;
}

/**
 * Login com Firebase ID token contra o backend
 * @param {string} idToken - ID token do Firebase Auth
 * @returns {Promise<{token: string, user: object}>}
 */
export async function loginFirebaseBackend(idToken) {
    const response = await api.post('/auth/firebase', { idToken });
    const data = response.data;
    setAuthToken(data.token);
    return data;
}

/**
 * Verifica se a sess├úo atual (cookie ou Bearer) ainda ├® v├ílida
 * O backend valida a assinatura e retorna o tipo real (admin/user)
 * @returns {Promise<{valid: boolean, tipo?: string, email?: string, exp?: number}>}
 */
/**
 * Aguarda o Firebase Auth restaurar a sessão (evita corrida no F5 onde
 * auth.currentUser ainda é null e o X-Firebase-Token não é enviado).
 * Resolve em até ~3s mesmo sem usuário.
 */
function aguardarFirebaseAuth(timeoutMs = 3000) {
    return new Promise((resolve) => {
        if (auth.currentUser) return resolve(auth.currentUser);
        const timer = setTimeout(() => resolve(auth.currentUser || null), timeoutMs);
        auth.onAuthStateChanged((user) => {
            clearTimeout(timer);
            resolve(user);
        });
    });
}

export async function verifyToken() {
    try {
        let headers = {};
        try {
            const user = await aguardarFirebaseAuth();
            if (user) {
                const fbToken = await user.getIdToken();
                headers['X-Firebase-Token'] = fbToken;
            }
        } catch (_) {}
        const response = await api.get('/auth/verify', { headers });
        return response.data;
    } catch (err) {
        return { valid: false };
    }
}

/**
 * Logout no backend ÔÇö limpa o cookie HttpOnly de sess├úo
 */
export async function logoutBackend() {
    try {
        await api.post('/auth/logout');
    } catch (err) {
        // Ignora erro ÔÇö cookie pode j├í estar limpo
    }
}

// Interceptor: em caso de 401, limpa token e redireciona pra login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn('[API] Token expirado');
            clearAuthToken();
            // Evita loop se ja estiver na pagina de login
            if (window.location.pathname !== '/login') {
                localStorage.removeItem("sider-auth-storage");
                // Navegação suave via router (App.jsx) em vez de `window.location.href`,
                // que derrubava a árvore DOM no meio do commit do React (crash "insertBefore").
                window.dispatchEvent(new CustomEvent('auth:session-expired'));
            }
        }
        return Promise.reject(error);
    }
);

// ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
// FUN├ç├âO LEGADO ÔÇö mantida para compatibilidade com About.jsx
// O manifesto JSON n├úo ├® mais usado; retorna null.
// ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

/**
 * Carrega um arquivo JSON ÔÇö legado. Sempre retorna null agora,
 * pois os dados v├¬m exclusivamente da API.
 * @param {string} _name - Nome do arquivo (ignorado)
 * @returns {Promise<null>}
 */
export async function loadDataFile(_name) {
    return null;
}

// ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
// API FUNCTIONS ÔÇô chamadas diretas ao backend
// ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

// ÔöÇÔöÇÔöÇ CONTRATOS ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

export const getContratos = async (params = {}, signal) => {
    const response = await api.get('/contratos', { params, signal });
    return Array.isArray(response.data) ? response.data : [];
};

export const getContratoDetails = async (id) => {
    const response = await api.get(`/contratos/${encodeURIComponent(id)}/detalhes`);
    return response.data;
};

export const getBlocoStats = async ({ search, bloco, status } = {}, signal) => {
    const response = await api.get('/stats/bloco', { params: { search, bloco, status }, signal });
    return response.data;
};

// ÔöÇÔöÇÔöÇ DASHBOARD ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

export const getDashboardStats = async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
};

export const getDashboardCharts = async () => {
    const response = await api.get('/dashboard/charts');
    return response.data;
};

export const getDashboardFinanceiro = async () => {
    const response = await api.get('/dashboard/financeiro');
    return response.data;
};

// ÔöÇÔöÇÔöÇ MEDICOES ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

export const getMonthlyMedicoes = async (bloco, dataRef) => {
    const response = await api.get('/medicoes/mensal', { params: { bloco, dataRef } });
    return response.data;
};

export const getMonthlyMedicoesDetail = async (bloco, periodo, dataRef) => {
    const response = await api.get('/medicoes/mensal/detalhe', { params: { bloco, periodo, dataRef } });
    return response.data;
};

export const getContratosByMes = async (mes, bloco) => {
    const response = await api.get('/medicoes/contratos', { params: { mes, bloco } });
    return response.data;
};

// ════════════════ MEDIÇÕES (ARQUIVOS .xls) ═════════════════════════

export const getMedicoesArquivos = async () => {
    const response = await api.get('/medicoes/arquivos');
    return response.data;
};

export const getMedicoesPubToken = async (relPath) => {
    const response = await api.get('/medicoes/pub/token', { params: { path: relPath } });
    return response.data;
};

export const downloadMedicaoArquivo = async (relPath) => {
    const response = await api.get('/medicoes/download', { params: { path: relPath }, responseType: 'blob' });
    return response.data;
};

// ════════════════ DOCUMENTOS DO CONTRATO (PDFs) ════════════════════

export const getDocumentosContrato = async () => {
    const response = await api.get('/documentos-contrato/arquivos');
    return response.data;
};

export const getDocumentoPubToken = async (relPath) => {
    const response = await api.get('/documentos-contrato/pub/token', { params: { path: relPath } });
    return response.data;
};

export const downloadDocumentoContrato = async (relPath) => {
    const response = await api.get('/documentos-contrato/download', { params: { path: relPath }, responseType: 'blob' });
    return response.data;
};

// ============ GESTÃO DMA (Controle de Pagamentos) ============

export const getControlePagamentos = async (params = {}) => {
    const response = await api.get('/gestaodma/controle-pagamento', { params });
    return response.data;
};

export const getControlePagamentoResumo = async () => {
    const response = await api.get('/gestaodma/controle-pagamento/resumo');
    return response.data;
};

export const getControlePagamentoTotais = async () => {
    const response = await api.get('/gestaodma/controle-pagamento/totais');
    return response.data;
};

// ÔöÇÔöÇÔöÇ GEMOCDOCS ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

export const getGemocdocsTables = async () => {
    const response = await api.get('/gemocdocs/tables');
    return response.data;
};

export const getGemocdocsBlocos = async () => {
    const response = await api.get('/gemocdocs/blocos');
    return response.data;
};

export const getGemocdocsTableData = async (tableName, params = {}) => {
    const response = await api.get(`/gemocdocs/${tableName}`, { params });
    return response.data;
};

export const getGemocdocsTableInfo = async (tableName) => {
    const response = await api.get(`/gemocdocs/${tableName}/info`);
    return response.data;
};

export const getGemocdocsByContrato = async (tableName, contrato) => {
    const response = await api.get(`/gemocdocs/${tableName}/contrato`, { params: { contrato } });
    return response.data;
};

// ÔöÇÔöÇÔöÇ ADITIVOS ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

export const getAditivos = async (params = {}) => {
    const response = await api.get('/aditivos', { params });
    return response.data;
};

export const getAditivoStats = async (params = {}) => {
    const response = await api.get('/aditivos/stats', { params });
    return response.data;
};

export const getAditivosByContrato = async (contrato) => {
    const response = await api.get(`/aditivos/contrato/${encodeURIComponent(contrato)}`);
    return response.data;
};

// ÔöÇÔöÇÔöÇ OS (Ordens de Servi├ºo) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

export const getOrdensServico = async (params = {}) => {
    const response = await api.get('/os', { params });
    return response.data;
};

export const getOrdensServicoStats = async (params = {}) => {
    const response = await api.get('/os/stats', { params });
    return response.data;
};

export const getOsChartData = async (params = {}) => {
    const response = await api.get('/os/chart', { params });
    return response.data;
};

export const getOrdensByContrato = async (contrato) => {
    const response = await api.get(`/os/contrato/${encodeURIComponent(contrato)}`);
    return response.data;
};

// ÔöÇÔöÇÔöÇ DEPLOY ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

/**
 * Chama o deploy no servidor de produ├º├úo (git pull + docker rebuild).
 * Em local dev: passa pelo backend local (que faz proxy para produ├º├úo).
 * Em produ├º├úo:  chama a API de produ├º├úo diretamente.
 * @param {string} token - JWT do admin autenticado
 * @returns {Promise<{success: boolean, message: string, output?: string}>}
 */
export const triggerDeploy = async (token) => {
    const response = await api.post('/deploy/pull', {}, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

// ÔöÇÔöÇÔöÇ PORTFOLIO ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

export const getPortfolio = async (params = {}) => {
    const response = await api.get('/portfolio', { params });
    return response.data;
};

export const getPortfolioSegmentos = async () => {
    const response = await api.get('/portfolio/segmentos');
    return response.data;
};

export const getPortfolioBlocos = async () => {
    const response = await api.get('/portfolio/blocos');
    return response.data;
};

export const downloadPortfolio = async () => {
    const response = await api.get('/portfolio/download', { responseType: 'blob' });
    return response.data;
};

export async function compararPortfolio() {
    const { data } = await api.get('/portfolio/comparar');
    return data;
}

// ÔöÇÔöÇÔöÇ Corre├º├Áes do Portfolio (salvas no localStorage) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

const CORRECOES_KEY = 'gemoc-portfolio-correcoes';

export async function getPortfolioCorrecoes() {
    try {
        const raw = localStorage.getItem(CORRECOES_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export async function savePortfolioCorrecoes(correcoes) {
    // Merge com corre├º├Áes existentes
    const existing = await getPortfolioCorrecoes();
    const merged = { ...existing };
    for (const [contrato, vals] of Object.entries(correcoes)) {
        if (!merged[contrato]) merged[contrato] = {};
        if (vals.status !== undefined) merged[contrato].status = vals.status;
        if (vals.valor !== undefined) merged[contrato].valor = vals.valor;
    }
    localStorage.setItem(CORRECOES_KEY, JSON.stringify(merged));
    return merged;
}

// ÔöÇÔöÇÔöÇ FICHAS (Fichas Resumo de Contratos) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

export const getFichas = async () => {
    const response = await api.get('/fichas');
    return response.data;
};

export const getFichasMatch = async () => {
    const response = await api.get('/fichas/match');
    return response.data;
};

export const viewFicha = async (path) => {
    const response = await api.get('/fichas/view', { params: { path } });
    return response.data;
};

export const downloadFicha = async (path) => {
    const response = await api.get('/fichas/download', { params: { path }, responseType: 'blob' });
    return response.data;
};

export const gerarFicha = async (contratoId) => {
    const response = await api.get(`/fichas/gerar/${contratoId}`);
    return response.data;
};

export const popularFicha = async (contratoId) => {
    const response = await api.get(`/fichas/popular/${contratoId}`);
    return response.data;
};

export const downloadFichaPopulada = async (contratoId) => {
    const response = await api.get(`/fichas/download-populada/${contratoId}`, { responseType: 'blob' });
    return response.data;
};

// ÔöÇÔöÇÔöÇ DOCUMENTOS ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

export const listarDocumentos = async (params = {}) => {
    const response = await api.get('/documentos', { params });
    return response.data;
};

export const uploadDocumentos = async (arquivos) => {
    const response = await api.post('/documentos/upload', { arquivos });
    return response.data;
};

export const deletarDocumento = async (id) => {
    const response = await api.delete(`/documentos/${id}`);
    return response.data;
};

export const getDocumentosPorContrato = async (contratoId) => {
    const response = await api.get(`/documentos/contrato/${encodeURIComponent(contratoId)}`);
    return response.data;
};

// ════════════════ EXPORT ═══════════════════════════════════════════

export const getMedicoesPorSegmento = async (agregacao = 'ano', filtros = {}) => {
  const params = { agregacao };
  if (filtros.bloco) params.bloco = filtros.bloco;
  if (filtros.segmento) params.segmento = filtros.segmento;
  const response = await api.get('/export/medicoes-por-segmento', { params });
  return response.data;
};

export const downloadMedicoesPorSegmento = async (filtros = {}) => {
  const params = {};
  if (filtros.bloco) params.bloco = filtros.bloco;
  if (filtros.segmento) params.segmento = filtros.segmento;
  const response = await api.get('/export/medicoes-por-segmento/download', { params, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medicoes_por_segmento.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

// ════════════════ CONTRATOS ANA LUISA ═══════════════════════════════════════════

export const getContratacoesAnaLuisa = async () => {
  const response = await api.get('/contratos-ana');
  return response.data;
};

export const getRelatoriosAnaLuisa = async () => {
  const response = await api.get('/contratos-ana/relatorios');
  return response.data;
};

export const getDatabaseUpdatedAt = async () => {
  const response = await api.get('/database/updated-at');
  return response.data.updatedAt;
};

export const getSectionStats = async (params = {}) => {
  const response = await api.get('/dashboard/sections', { params });
  return response.data;
};

export const getGestores = async (params = {}) => {
  const response = await api.get('/gestores', { params });
  return response.data;
};

export const getGestoresTipos = async () => {
  const response = await api.get('/gestores/tipos');
  return response.data;
};

export const getGestoresStats = async (params = {}) => {
  const response = await api.get('/gestores/stats', { params });
  return response.data;
};

export const getGestoresPorContrato = async (params = {}) => {
  const response = await api.get('/gestores/por-contrato', { params });
  return response.data;
};

export const getGestoresHistoricoContrato = async (contrato) => {
  const response = await api.get('/gestores/historico', { params: { contrato } });
  return response.data;
};

// ════════════════ CONFERÊNCIA EPS ═══════════════════════════════════════════

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const listarRelatoriosEPS = async () => {
  const response = await api.get('/eps/conferencia/relatorios');
  return response.data;
};

export const conferirEPS = async (oldFile, newFile) => {
  const payload = {};
  if (oldFile?.semana_id) {
    payload.old = { semana_id: oldFile.semana_id };
  } else {
    payload.old = { nome: oldFile.name, base64: await fileToBase64(oldFile) };
  }
  if (newFile?.semana_id) {
    payload.new = { semana_id: newFile.semana_id };
  } else {
    payload.new = { nome: newFile.name, base64: await fileToBase64(newFile) };
  }
  const response = await api.post('/eps/conferencia', payload);
  return response.data;
};

export const downloadConferenciaEPS = async (oldFile, newFile, fileName) => {
  const payload = {};
  if (oldFile?.semana_id) {
    payload.old = { semana_id: oldFile.semana_id };
  } else {
    payload.old = { nome: oldFile.name, base64: await fileToBase64(oldFile) };
  }
  if (newFile?.semana_id) {
    payload.new = { semana_id: newFile.semana_id };
  } else {
    payload.new = { nome: newFile.name, base64: await fileToBase64(newFile) };
  }
  const response = await api.post('/eps/conferencia?format=docx', payload, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'conferencia_eps.docx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

// ════════════════ CONFERÊNCIA FUNDO PROTEGE ═════════════════════════════════

export const listarRelatoriosFundoProtege = async () => {
  const response = await api.get('/fundo-protege/conferencia/relatorios');
  return response.data;
};

export const conferirFundoProtege = async (oldFile, newFile) => {
  const payload = {};
  if (oldFile?.semana_id) {
    payload.old = { semana_id: oldFile.semana_id };
  } else {
    payload.old = { nome: oldFile.name, base64: await fileToBase64(oldFile) };
  }
  if (newFile?.semana_id) {
    payload.new = { semana_id: newFile.semana_id };
  } else {
    payload.new = { nome: newFile.name, base64: await fileToBase64(newFile) };
  }
  const response = await api.post('/fundo-protege/conferencia', payload);
  return response.data;
};

export const downloadConferenciaFundoProtege = async (oldFile, newFile, fileName) => {
  const payload = {};
  if (oldFile?.semana_id) {
    payload.old = { semana_id: oldFile.semana_id };
  } else {
    payload.old = { nome: oldFile.name, base64: await fileToBase64(oldFile) };
  }
  if (newFile?.semana_id) {
    payload.new = { semana_id: newFile.semana_id };
  } else {
    payload.new = { nome: newFile.name, base64: await fileToBase64(newFile) };
  }
  const response = await api.post('/fundo-protege/conferencia?format=docx', payload, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'conferencia_fundo_protege.docx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export default api;
