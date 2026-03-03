import React from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string;
  details?: string[];
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  details = []
}) => {
  if (!isOpen) return null;

  const config = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      messageBg: 'bg-red-50',
      messageBorder: 'border-red-200',
      messageText: 'text-red-900',
      detailText: 'text-red-800',
      bulletColor: 'text-red-500',
      confirmBg: 'bg-red-600 hover:bg-red-700',
      confirmText: 'text-white'
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      messageBg: 'bg-orange-50',
      messageBorder: 'border-orange-200',
      messageText: 'text-orange-900',
      detailText: 'text-orange-800',
      bulletColor: 'text-orange-500',
      confirmBg: 'bg-orange-600 hover:bg-orange-700',
      confirmText: 'text-white'
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      messageBg: 'bg-blue-50',
      messageBorder: 'border-blue-200',
      messageText: 'text-blue-900',
      detailText: 'text-blue-800',
      bulletColor: 'text-blue-500',
      confirmBg: 'bg-blue-600 hover:bg-blue-700',
      confirmText: 'text-white'
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      messageBg: 'bg-green-50',
      messageBorder: 'border-green-200',
      messageText: 'text-green-900',
      detailText: 'text-green-800',
      bulletColor: 'text-green-500',
      confirmBg: 'bg-green-600 hover:bg-green-700',
      confirmText: 'text-white'
    }
  };

  const style = config[type];
  const Icon = style.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 ${style.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
            <Icon size={24} className={style.iconColor} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* Message */}
        <div className={`${style.messageBg} border ${style.messageBorder} rounded-xl p-4 mb-6`}>
          <p className={`text-sm font-medium ${style.messageText} mb-3`}>
            {message}
          </p>
          
          {details.length > 0 && (
            <ul className={`space-y-2 text-sm ${style.detailText}`}>
              {details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className={`${style.bulletColor} mt-0.5`}>•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-3 ${style.confirmBg} ${style.confirmText} font-semibold rounded-xl transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
