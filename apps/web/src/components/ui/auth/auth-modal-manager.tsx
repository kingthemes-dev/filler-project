'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// 🚀 Bundle Optimization: Dynamic imports dla modali (tylko gdy używane)
const LoginModal = dynamic(() => import('./login-modal'), { ssr: false });
const RegisterModal = dynamic(() => import('./register-modal'), { ssr: false });

export default function AuthModalManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentModal, setCurrentModal] = useState<'login' | 'register'>('login');

  // Listen for custom events to open modals
  useEffect(() => {
    const handleOpenLogin = () => {
      console.log('[AuthModalManager] openLogin received');
      setCurrentModal('login');
      setIsOpen(true);
    };

    const handleOpenRegister = () => {
      console.log('[AuthModalManager] openRegister received');
      setCurrentModal('register');
      setIsOpen(true);
    };

    // Window listeners (primary)
    window.addEventListener('openLogin', handleOpenLogin);
    window.addEventListener('openRegister', handleOpenRegister);
    // Document listeners (fallback)
    if (typeof document !== 'undefined') {
      document.addEventListener('openLogin' as keyof DocumentEventMap, handleOpenLogin as EventListener);
      document.addEventListener('openRegister' as keyof DocumentEventMap, handleOpenRegister as EventListener);
      // Alternate event names fallback
      document.addEventListener('open-login' as keyof DocumentEventMap, handleOpenLogin as EventListener);
      document.addEventListener('open-register' as keyof DocumentEventMap, handleOpenRegister as EventListener);
    }

    // Expose imperative helpers (last-resort fallback)
    (window as unknown as { openLogin: () => void; openRegister: () => void }).openLogin = handleOpenLogin;
    (window as unknown as { openLogin: () => void; openRegister: () => void }).openRegister = handleOpenRegister;

    return () => {
      window.removeEventListener('openLogin', handleOpenLogin);
      window.removeEventListener('openRegister', handleOpenRegister);
      if (typeof document !== 'undefined') {
        document.removeEventListener('openLogin' as keyof DocumentEventMap, handleOpenLogin as EventListener);
        document.removeEventListener('openRegister' as keyof DocumentEventMap, handleOpenRegister as EventListener);
        document.removeEventListener('open-login' as keyof DocumentEventMap, handleOpenLogin as EventListener);
        document.removeEventListener('open-register' as keyof DocumentEventMap, handleOpenRegister as EventListener);
      }
      delete (window as unknown as { openLogin?: () => void; openRegister?: () => void }).openLogin;
      delete (window as unknown as { openLogin?: () => void; openRegister?: () => void }).openRegister;
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const switchToLogin = () => {
    setCurrentModal('login');
  };

  const switchToRegister = () => {
    setCurrentModal('register');
  };

  if (!isOpen) return null;

  return (
    <>
      {currentModal === 'login' && (
        <LoginModal
          isOpen={isOpen}
          onClose={handleClose}
          onSwitchToRegister={switchToRegister}
        />
      )}
      
      {currentModal === 'register' && (
        <RegisterModal
          isOpen={isOpen}
          onClose={handleClose}
          onSwitchToLogin={switchToLogin}
        />
      )}
    </>
  );
}
