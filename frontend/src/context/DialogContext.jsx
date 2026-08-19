import React, { createContext, useContext, useState, useRef } from 'react';
import Button from '../components/foundations/Button.jsx';
import Input from '../components/foundations/Input.jsx';
import { AlertCircle, HelpCircle, CheckCircle2, X } from 'lucide-react';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [promptValue, setPromptValue] = useState('');
  const resolveRef = useRef(null);

  const confirm = ({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger'
  }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        variant
      });
    });
  };

  const prompt = ({
    title = 'Input Required',
    message = '',
    defaultValue = '',
    placeholder = '',
    confirmText = 'Save',
    cancelText = 'Cancel'
  }) => {
    setPromptValue(defaultValue);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({
        type: 'prompt',
        title,
        message,
        placeholder,
        confirmText,
        cancelText
      });
    });
  };

  const alert = ({
    title = 'Notice',
    message = '',
    confirmText = 'OK'
  }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({
        type: 'alert',
        title,
        message,
        confirmText
      });
    });
  };

  const handleClose = (value) => {
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
    setDialog(null);
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt, alert }}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
          onClick={() => handleClose(dialog.type === 'prompt' ? null : false)}
        >
          <div
            className="bg-surface border border-line rounded-card shadow-2xl p-6 w-full max-w-md scale-100 transition-all text-ink"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  dialog.variant === 'danger'
                    ? 'bg-danger/10 text-danger'
                    : dialog.variant === 'success'
                    ? 'bg-success/10 text-success'
                    : 'bg-accent/10 text-accent'
                }`}>
                  {dialog.variant === 'danger' ? <AlertCircle size={20} /> : <HelpCircle size={20} />}
                </div>
                <h3 className="text-base font-semibold">{dialog.title}</h3>
              </div>
              <button
                className="text-ink-muted hover:text-ink p-1 rounded-md transition-colors"
                onClick={() => handleClose(dialog.type === 'prompt' ? null : false)}
              >
                <X size={18} />
              </button>
            </div>

            {dialog.message && (
              <p className="text-[13.5px] text-ink-muted mb-4 leading-relaxed pl-13">
                {dialog.message}
              </p>
            )}

            {dialog.type === 'prompt' && (
              <div className="mb-4">
                <Input
                  autoFocus
                  placeholder={dialog.placeholder}
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleClose(promptValue);
                    if (e.key === 'Escape') handleClose(null);
                  }}
                />
              </div>
            )}

            <div className="flex justify-end gap-2.5 mt-5">
              {dialog.type !== 'alert' && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => handleClose(dialog.type === 'prompt' ? null : false)}
                >
                  {dialog.cancelText || 'Cancel'}
                </Button>
              )}
              <Button
                type="button"
                variant={dialog.variant === 'danger' ? 'primary' : 'primary'}
                className={dialog.variant === 'danger' ? '!bg-danger hover:!bg-danger/90 !text-white' : ''}
                size="md"
                onClick={() => handleClose(dialog.type === 'prompt' ? promptValue : true)}
              >
                {dialog.confirmText || 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
