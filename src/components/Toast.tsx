/**
 * Toast Notification System
 * Simple, lightweight toast notifications
 */

import { useState, useEffect } from 'react';

// ============================================
// Types
// ============================================

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

// ============================================
// Global State
// ============================================

let toastId = 0;
const toasts: Toast[] = [];
const listeners: Array<() => void> = [];

// ============================================
// API
// ============================================

export function showToast(
  message: string,
  type: Toast['type'] = 'info',
  duration = 3000
) {
  const id = `toast-${toastId++}`;
  toasts.push({ id, message, type, duration });
  listeners.forEach(listener => listener());
  
  // Auto remove
  setTimeout(() => {
    const index = toasts.findIndex(t => t.id === id);
    if (index > -1) {
      toasts.splice(index, 1);
      listeners.forEach(listener => listener());
    }
  }, duration);
  
  return id;
}

export function hideToast(id: string) {
  const index = toasts.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.splice(index, 1);
    listeners.forEach(listener => listener());
  }
}

export function clearToasts() {
  toasts.length = 0;
  listeners.forEach(listener => listener());
}

// ============================================
// Component
// ============================================

export function ToastContainer() {
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    listeners.push(listener);
    
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => hideToast(toast.id)}
        >
          <span className="toast-icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'warning' && '⚠'}
            {toast.type === 'info' && 'ℹ'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

