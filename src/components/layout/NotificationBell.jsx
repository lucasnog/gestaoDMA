import React, { useState } from 'react';
import { Bell, X, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { useUIStore } from '../../stores/ui.store';

const NotificationBell = () => {
    const { notifications, markAsRead, clearNotifications } = useUIStore();
    const [isOpen, setIsOpen] = useState(false);
    
    const unreadCount = notifications.filter(n => !n.read).length;

    const icons = {
        success: <CheckCircle className="text-emerald-500" size={16} />,
        warning: <AlertTriangle className="text-orange-500" size={16} />,
        danger: <X size={16} className="text-rose-500" />,
        info: <Info className="text-blue-500" size={16} />
    };

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-3 rounded-full bg-white shadow-premium border border-emerald-50/50 text-slate-400 hover:text-emerald-600 hover:shadow-emerald-500/10 transition-all duration-300"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-4 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-white rounded-[2.5rem] shadow-2xl border border-emerald-50/50 z-50 overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-emerald-50/50 flex items-center justify-between bg-emerald-50/20">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Notificações</h3>
                            <button onClick={clearNotifications} className="text-[9px] font-black text-emerald-600 hover:text-emerald-800 uppercase tracking-widest">Limpar Tudo</button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Bell size={32} className="mx-auto text-emerald-100 mb-4" />
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma notificação</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div 
                                        key={n.id} 
                                        onClick={() => markAsRead(n.id)}
                                        className={`p-6 border-b border-emerald-50/30 flex gap-4 hover:bg-emerald-50/20 transition-colors cursor-pointer ${!n.read ? 'bg-emerald-50/10' : 'opacity-60'}`}
                                    >
                                        <div className="shrink-0 mt-1">{icons[n.type || 'info']}</div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900 mb-1">{n.title}</p>
                                            <p className="text-[10px] font-bold text-slate-400 line-clamp-2 leading-relaxed">{n.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;
