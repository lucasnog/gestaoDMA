import { create } from 'zustand';

export const useUIStore = create((set) => ({
    isSidebarOpen: true,
    activeTab: 'dashboard',
    notifications: [],
    
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    
    setActiveTab: (tab) => set({ activeTab: tab }),
    
    addNotification: (notification) => set((state) => ({
        notifications: [
            { id: Date.now(), ...notification, read: false },
            ...state.notifications
        ].slice(0, 50) // Mantém as últimas 50
    })),
    
    markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => 
            n.id === id ? { ...n, read: true } : n
        )
    })),
    
    clearNotifications: () => set({ notifications: [] })
}));
