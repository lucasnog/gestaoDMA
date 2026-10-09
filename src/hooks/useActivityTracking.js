import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { API_URL } from '../config/constants';

/**
 * Registra cada troca de rota do SPA (navegação client-side não gera
 * requisição HTTP, então o middleware do backend não a enxerga).
 * O backend completa o evento com usuário (do JWT) e IP.
 *
 * Só metadados: o caminho da página e a query da URL, sanitizada no backend.
 */
export function useActivityTracking() {
    const location = useLocation();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const token = useAuthStore((s) => s.token);
    const ultimoEnviado = useRef(null);

    useEffect(() => {
        if (!isAuthenticated) {
            ultimoEnviado.current = null;
            return;
        }

        const path = location.pathname;
        const search = location.search || '';
        // Evita registrar de novo a mesma página+query (re-render/refresh da store)
        const assinatura = `${path}${search}`;
        if (!path || assinatura === ultimoEnviado.current) return;
        ultimoEnviado.current = assinatura;

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            // fetch com keepalive em vez de navigator.sendBeacon:
            // o sendBeacon não permite enviar o header Authorization.
            fetch(`${API_URL}/atividade/pageview`, {
                method: 'POST',
                keepalive: true,
                credentials: 'include',
                headers,
                body: JSON.stringify({ path, query: search.replace(/^\?/, '') }),
            }).catch(() => {});
        } catch {
            // Tracing nunca pode atrapalhar a navegação do usuário
        }
    }, [location.pathname, location.search, isAuthenticated, token]);
}

export default useActivityTracking;
