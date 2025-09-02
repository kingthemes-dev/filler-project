'use client';

import { useState, useEffect } from 'react';
import LoginModal from './login-modal';
import RegisterModal from './register-modal';

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
      document.addEventListener('openLogin' as any, handleOpenLogin as any);
      document.addEventListener('openRegister' as any, handleOpenRegister as any);
      // Alternate event names fallback
      document.addEventListener('open-login' as any, handleOpenLogin as any);
      document.addEventListener('open-register' as any, handleOpenRegister as any);
    }

    // Expose imperative helpers (last-resort fallback)
    (window as any).openLogin = handleOpenLogin;
    (window as any).openRegister = handleOpenRegister;

    return () => {
      window.removeEventListener('openLogin', handleOpenLogin);
      window.removeEventListener('openRegister', handleOpenRegister);
      if (typeof document !== 'undefined') {
        document.removeEventListener('openLogin' as any, handleOpenLogin as any);
        document.removeEventListener('openRegister' as any, handleOpenRegister as any);
        document.removeEventListener('open-login' as any, handleOpenLogin as any);
        document.removeEventListener('open-register' as any, handleOpenRegister as any);
      }
      delete (window as any).openLogin;
      delete (window as any).openRegister;
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
