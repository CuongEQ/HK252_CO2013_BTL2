import { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const pushToast = (type, message) => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts((prev) => [...prev, { id, type, message }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((item) => item.id !== id));
        }, 3200);
    };

    const value = useMemo(
        () => ({
            success: (message) => pushToast('success', message),
            error: (message) => pushToast('error', message),
            info: (message) => pushToast('info', message)
        }),
        []
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="fixed right-4 top-4 z-50 space-y-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`min-w-64 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${toast.type === 'success'
                                ? 'bg-emerald-600'
                                : toast.type === 'error'
                                    ? 'bg-rose-600'
                                    : 'bg-slate-700'
                            }`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}
