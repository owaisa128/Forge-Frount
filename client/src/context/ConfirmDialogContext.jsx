import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui';

const ConfirmDialogContext = createContext(null);

export function ConfirmDialogProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolveRequest = useRef(null);

  const finish = useCallback((confirmed) => {
    const resolve = resolveRequest.current;
    resolveRequest.current = null;
    setRequest(null);
    resolve?.(confirmed);
  }, []);

  const confirm = useCallback((options) => {
    resolveRequest.current?.(false);
    return new Promise((resolve) => {
      resolveRequest.current = resolve;
      setRequest({
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel || 'Continue',
        cancelLabel: options.cancelLabel || 'Cancel',
        destructive: options.destructive || false,
      });
    });
  }, []);

  useEffect(
    () => () => {
      resolveRequest.current?.(false);
    },
    []
  );

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={Boolean(request)}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{request?.title}</AlertDialogTitle>
            <AlertDialogDescription>{request?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{request?.cancelLabel || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              variant={request?.destructive ? 'destructive' : 'default'}
              onClick={(event) => {
                event.preventDefault();
                finish(true);
              }}
            >
              {request?.confirmLabel || 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmDialogContext);
  if (!confirm) throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  return confirm;
}
