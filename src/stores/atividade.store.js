import { create } from 'zustand';
import { verificarAcessoAtividade } from '../services/api.service';

/**
 * Acesso ao dashboard de auditoria de atividade.
 *
 * A allowlist (AUDIT_DASHBOARD_EMAILS) vive só no backend — o frontend
 * pergunta para a API e, para quem não pode, recebe 404 (a rota não existe).
 * Por isso `permitido` nunca aparece como "negado" na UI: o menu e a rota
 * simplesmente não existem para o usuário comum.
 *
 * Hoje a allowlist é: englucasnog@gmail.com e lucas.nlopes04@gmail.com.
 */
export const useAtividadeStore = create((set, get) => ({
    permitido: false,
    verificado: false,
    _email: null,

    /**
     * Consulta o backend (uma vez por e-mail) e guarda o resultado.
     * @param {string} email - e-mail do usuário autenticado
     */
    verificar: async (email) => {
        if (!email) {
            set({ permitido: false, verificado: true, _email: null });
            return false;
        }
        if (get().verificado && get()._email === email) return get().permitido;

        const permitido = await verificarAcessoAtividade();
        set({ permitido, verificado: true, _email: email });
        return permitido;
    },

    reset: () => set({ permitido: false, verificado: false, _email: null }),
}));

export default useAtividadeStore;
