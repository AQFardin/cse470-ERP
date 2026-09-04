import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X, ShieldAlert } from 'lucide-react';
import type { ToastMessage } from '../context/AppContext';

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function Toast({ toasts, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.15 } }}
            className="pointer-events-auto flex items-start gap-3 p-4 bg-[#18181b] text-white rounded-xl shadow-2xl border border-[#27272a] text-xs font-semibold leading-relaxed"
          >
            {/* Icons */}
            {toast.type === 'success' && (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'info' && (
              <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'warning' && (
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            
            <div className="flex-1">
              <p className="text-[#fafafa] font-bold">System Alert</p>
              <p className="text-[#a1a1aa] font-medium mt-0.5 leading-snug">{toast.message}</p>
            </div>
            
            <button
              onClick={() => onClose(toast.id)}
              className="text-[#a1a1aa] hover:text-[#fafafa] transition-colors p-1 rounded-lg hover:bg-[#27272a] cursor-pointer shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
