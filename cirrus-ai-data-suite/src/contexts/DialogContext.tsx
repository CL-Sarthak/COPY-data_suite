'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Dialog, { DialogProps } from '@/components/Dialog';

interface DialogOptions {
  title: string;
  message: string;
  type?: DialogProps['type'];
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextType {
  showAlert: (options: DialogOptions) => Promise<void>;
  showConfirm: (options: DialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialogProps, setDialogProps] = useState<DialogProps | null>(null);

  const closeDialog = useCallback(() => {
    setDialogProps(null);
  }, []);

  const showAlert = useCallback((options: DialogOptions): Promise<void> => {
    return new Promise((resolve) => {
      setDialogProps({
        isOpen: true,
        onClose: () => {
          closeDialog();
          resolve();
        },
        title: options.title,
        message: options.message,
        type: options.type || 'info',
        confirmText: options.confirmText || 'OK',
        onConfirm: () => {
          closeDialog();
          resolve();
        }
      });
    });
  }, [closeDialog]);

  const showConfirm = useCallback((options: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogProps({
        isOpen: true,
        onClose: () => {
          closeDialog();
          resolve(false);
        },
        title: options.title,
        message: options.message,
        type: options.type || 'confirm',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        onConfirm: () => {
          closeDialog();
          resolve(true);
        },
        onCancel: () => {
          closeDialog();
          resolve(false);
        }
      });
    });
  }, [closeDialog]);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {dialogProps && <Dialog {...dialogProps} />}
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