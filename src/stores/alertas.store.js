import { create } from 'zustand';

export const useAlertasStore = create((set, get) => ({
    alertas: [],
    loading: false,

    setAlertas: (alertas) => set({ alertas, loading: false }),

    addAlerta: (alerta) => set((state) => ({
        alertas: [alerta, ...state.alertas]
    })),

    setLoading: (loading) => set({ loading }),

    getAlertasCriticos: () => get().alertas.filter(a => a.nivel === 'critico')
}));
