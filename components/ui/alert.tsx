'use client';

import { ReactNode } from 'react';

export type AlertVariant = 'error' | 'warning' | 'info' | 'success';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, {
  container: string;
  icon: string;
  title: string;
  text: string;
  closeButton: string;
}> = {
  error: {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
    title: 'text-red-800',
    text: 'text-red-700',
    closeButton: 'text-red-500 hover:bg-red-100',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-500',
    title: 'text-amber-800',
    text: 'text-amber-700',
    closeButton: 'text-amber-500 hover:bg-amber-100',
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-800',
    text: 'text-blue-700',
    closeButton: 'text-blue-500 hover:bg-blue-100',
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200',
    icon: 'text-emerald-500',
    title: 'text-emerald-800',
    text: 'text-emerald-700',
    closeButton: 'text-emerald-500 hover:bg-emerald-100',
  },
};

// SVG иконки
const icons: Record<AlertVariant, ReactNode> = {
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function Alert({ 
  variant = 'info', 
  title, 
  children, 
  onClose,
  className = '' 
}: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div 
      className={`
        relative rounded-xl border-2 p-4 
        ${styles.container}
        animate-fade-in
        ${className}
      `}
      role="alert"
    >
      <div className="flex gap-3">
        {/* Иконка */}
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {icons[variant]}
        </div>
        
        {/* Контент */}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`font-semibold text-sm mb-1 ${styles.title}`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${styles.text}`}>
            {children}
          </div>
        </div>

        {/* Кнопка закрытия */}
        {onClose && (
          <button
            onClick={onClose}
            className={`
              flex-shrink-0 rounded-lg p-1.5 
              transition-colors duration-200
              ${styles.closeButton}
            `}
            aria-label="Закрыть"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Специализированный компонент для ошибок
interface ErrorAlertProps {
  title?: string;
  message: string;
  onClose?: () => void;
  onRetry?: () => void;
}

export function ErrorAlert({ 
  title = 'Ошибка', 
  message, 
  onClose,
  onRetry 
}: ErrorAlertProps) {
  return (
    <Alert variant="error" title={title} onClose={onClose}>
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors duration-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Попробовать снова
        </button>
      )}
    </Alert>
  );
}

