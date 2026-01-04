import React, { ReactNode } from 'react';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  title?: string;
}

export function Modal({ children, onClose, title }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

