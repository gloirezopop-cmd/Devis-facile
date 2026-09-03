import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Icone from '../components/ui/Icone.jsx';

const ToastContext = createContext(null);

/** `const toast = useToast(); toast('Devis enregistré.')` — ou `toast(msg, 'erreur')`. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() doit être utilisé sous <ToastProvider>.');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const compteur = useRef(0);

  const toast = useCallback((message, type = 'succes') => {
    const id = ++compteur.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-20 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13.5px] font-bold text-white shadow-lg ${
              t.type === 'erreur' ? 'bg-red-600' : 'bg-brand-primary'
            }`}
          >
            <Icone nom={t.type === 'erreur' ? 'x' : 'check-square'} size={15} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
