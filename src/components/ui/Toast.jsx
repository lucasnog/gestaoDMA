import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../stores/ui.store';

const Toast = () => {
    const { notifications, markAsRead } = useUIStore();
    const activeToasts = notifications.filter(n => !n.read).slice(0, 3);

    return (
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4">
            {activeToasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={() => markAsRead(toast.id)} />
            ))}
        </div>
    );
};

const ToastItem = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const icons = {
        success: <CheckCircle className="text-emerald-500" size={20} />,
        warning: <AlertCircle className="text-orange-500" size={20} />,
        danger: <XCircle className="text-rose-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />
    };

    const bgColors = {
        success: 'bg-emerald-50 border-emerald-100',
        warning: 'bg-orange-50 border-orange-100',
        danger: 'bg-rose-50 border-rose-100',
        info: 'bg-blue-50 border-blue-100'
    };

    return (
        <div className={`flex items-center gap-4 p-5 rounded-[1.5rem] border shadow-2xl animate-in slide-in-from-right duration-500 min-w-[320px] ${bgColors[toast.type || 'info']}`}>
            <div className="shrink-0">{icons[toast.type || 'info']}</div>
            <div className="flex-1">
                <p className="text-sm font-black text-slate-900 leading-none mb-1">{toast.title}</p>
                <p className="text-[11px] font-bold text-slate-500 line-clamp-2">{toast.message}</p>
            </div>
            <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
            </button>
        </div>
    );
};

export default Toast;
