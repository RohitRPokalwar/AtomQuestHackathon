import { useState, useEffect, createContext, useContext } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;
let addToastFn = null;

// global toast function — can be called from anywhere
export function showToast(message, type = 'info') {
    if (addToastFn) addToastFn({ id: ++toastIdCounter, message, type });
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        addToastFn = (toast) => {
            setToasts(prev => [...prev, toast]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, 4000);
        };
        return () => { addToastFn = null; };
    }, []);

    return (
        <div className="toast-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast toast-${t.type}`}>
                    {t.message}
                </div>
            ))}
        </div>
    );
}
