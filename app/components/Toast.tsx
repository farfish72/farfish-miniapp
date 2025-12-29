'use client';

import { useEffect } from 'react';

export interface ToastProps {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  onClose: () => void;
  duration?: number;
}

const toastStyles = {
  error: {
    bg: 'from-red-500/20 to-red-600/20',
    border: 'border-red-400/30',
    text: 'text-red-300',
    icon: '❌'
  },
  success: {
    bg: 'from-green-500/20 to-green-600/20',
    border: 'border-green-400/30',
    text: 'text-green-300',
    icon: '✅'
  },
  warning: {
    bg: 'from-amber-500/20 to-amber-600/20',
    border: 'border-amber-400/30',
    text: 'text-amber-300',
    icon: '⚠️'
  },
  info: {
    bg: 'from-blue-500/20 to-blue-600/20',
    border: 'border-blue-400/30',
    text: 'text-blue-300',
    icon: 'ℹ️'
  }
};

export default function Toast({ type, message, onClose, duration = 4000 }: ToastProps) {
  const styles = toastStyles[type];

  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-[100] animate-in slide-in-from-top-2 duration-300">
      <div className={`
        bg-gradient-to-r ${styles.bg} backdrop-blur-xl border ${styles.border} 
        rounded-2xl p-4 shadow-2xl
      `}>
        <div className="flex items-center gap-3">
          <span className="text-lg flex-shrink-0">{styles.icon}</span>
          <p className={`text-sm font-medium ${styles.text} flex-1`}>
            {message}
          </p>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white/80 transition-colors flex-shrink-0"
          >
            <span className="text-lg">×</span>
          </button>
        </div>
      </div>
    </div>
  );
}