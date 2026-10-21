'use client';

import type { ReactNode } from 'react';
import { CloseIcon } from './icons';

interface ModalProps {
  open: boolean;
  title?: string;
  onClose?: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2, 6, 23, 0.6)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="safe-area w-full max-w-sm rounded-2xl p-5 shadow-xl"
        style={{ background: 'var(--surface)', color: 'var(--text)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {(title || onClose) && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{title}</h2>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1"
                style={{ color: 'var(--text-muted)' }}
              >
                <CloseIcon />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
