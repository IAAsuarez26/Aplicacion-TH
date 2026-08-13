import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="flex flex-col items-center text-center">
        <div className={`p-4 rounded-2xl mb-4 ${variant === 'danger' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
          <AlertTriangle className="w-8 h-8" />
        </div>

        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex items-center justify-center gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg transition-all disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Procesando...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
