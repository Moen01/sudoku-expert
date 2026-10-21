'use client';

import { Modal } from './Modal';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="mb-5 text-sm" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl py-2.5 font-semibold transition active:scale-95"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-xl py-2.5 font-semibold text-white transition active:scale-95"
          style={{ background: 'var(--accent)' }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
