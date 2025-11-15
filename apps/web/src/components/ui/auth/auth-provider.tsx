'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// 🚀 Bundle Optimization: Dynamic imports dla modali (tylko gdy używane)
const LoginModal = dynamic(() => import('./login-modal'), { ssr: false });
const RegisterModal = dynamic(() => import('./register-modal'), { ssr: false });

export default function AuthProvider() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const openLogin = () => {
    setShowLogin(true);
    setShowRegister(false);
  };

  const openRegister = () => {
    setShowRegister(true);
    setShowLogin(false);
  };

  // Event listeners for opening modals
  useEffect(() => {
    const handleOpenLogin = () => openLogin();
    const handleOpenRegister = () => openRegister();

    window.addEventListener('openLogin', handleOpenLogin);
    window.addEventListener('openRegister', handleOpenRegister);

    return () => {
      window.removeEventListener('openLogin', handleOpenLogin);
      window.removeEventListener('openRegister', handleOpenRegister);
    };
  }, []);

  const closeLogin = () => {
    setShowLogin(false);
  };

  const closeRegister = () => {
    setShowRegister(false);
  };

  const switchToRegister = () => {
    setShowLogin(false);
    setShowRegister(true);
  };

  const switchToLogin = () => {
    setShowRegister(false);
    setShowLogin(true);
  };

  return (
    <>
      <LoginModal
        isOpen={showLogin}
        onClose={closeLogin}
        onSwitchToRegister={switchToRegister}
      />
      <RegisterModal
        isOpen={showRegister}
        onClose={closeRegister}
        onSwitchToLogin={switchToLogin}
      />
    </>
  );
}

// Export functions to be used in other components
export const useAuthModals = () => {
  // This will be used by components to open modals
  // For now, we'll use a simple approach with window events
  return {
    openLogin: () => window.dispatchEvent(new CustomEvent('openLogin')),
    openRegister: () => window.dispatchEvent(new CustomEvent('openRegister')),
  };
};
