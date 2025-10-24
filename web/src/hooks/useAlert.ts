import { useState, useCallback } from 'react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertState {
  show: boolean;
  message: string;
  type: AlertType;
}

export function useAlert() {
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    message: '',
    type: 'info'
  });

  const showAlert = useCallback((message: string, type: AlertType = 'info') => {
    setAlert({
      show: true,
      message,
      type
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, show: false }));
  }, []);

  const success = useCallback((message: string) => {
    showAlert(message, 'success');
  }, [showAlert]);

  const error = useCallback((message: string) => {
    showAlert(message, 'error');
  }, [showAlert]);

  const warning = useCallback((message: string) => {
    showAlert(message, 'warning');
  }, [showAlert]);

  const info = useCallback((message: string) => {
    showAlert(message, 'info');
  }, [showAlert]);

  return {
    alert,
    showAlert,
    hideAlert,
    success,
    error,
    warning,
    info
  };
}

