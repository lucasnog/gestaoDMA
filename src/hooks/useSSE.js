import { useEffect } from 'react';
import { useAlertasStore } from '../stores/alertas.store';
import { useUIStore } from '../stores/ui.store';

/**
 * Hook to consume real-time notifications via SSE
 */
export const useSSE = (url) => {
    const addAlerta = useAlertasStore((state) => state.addAlerta);
    const addNotification = useUIStore((state) => state.addNotification);

    useEffect(() => {
        if (!url) return;

        const eventSource = new EventSource(url, { withCredentials: true });

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Adiciona ao store de alertas técnicos
                addAlerta(data);
                
                // Adiciona à lista de notificações da UI para o badge do sino
                addNotification({
                    title: data.titulo || 'Novo Alerta SIDER',
                    message: data.mensagem,
                    type: data.nivel || 'info'
                });

            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [url, addAlerta, addNotification]);
};
