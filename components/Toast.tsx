import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-5 duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
        type === 'success' 
          ? 'bg-green-500 text-white' 
          : 'bg-red-500 text-white'
      }`}>
        {type === 'success' ? (
          <CheckCircle size={20} />
        ) : (
          <AlertCircle size={20} />
        )}
        <p className="text-sm font-semibold">{message}</p>
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
