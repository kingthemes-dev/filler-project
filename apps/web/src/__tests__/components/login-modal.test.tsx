import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginModal from '@/components/ui/auth/login-modal';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    push: jest.fn(),
  }),
}));

// Mock stores
const mockLogin = jest.fn();
const mockIsLoading = false;
const mockError = null;
const mockIsAuthenticated = false;

jest.mock('@/stores/auth-store', () => ({
  useAuthIsAuthenticated: () => mockIsAuthenticated,
  useAuthIsLoading: () => mockIsLoading,
  useAuthError: () => mockError,
  useAuthActions: () => ({
    login: mockLogin,
  }),
}));

// Mock hooks
jest.mock('@/hooks/use-viewport-height-var', () => ({
  useViewportHeightVar: jest.fn(),
}));

// Mock utils
jest.mock('@/utils/lock-body-scroll', () => ({
  lockBodyScroll: jest.fn(),
  unlockBodyScroll: jest.fn(),
}));

// Mock ForgotPasswordModal
jest.mock('@/components/ui/auth/forgot-password-modal', () => {
  return function ForgotPasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
      <div data-testid="forgot-password-modal">
        <button onClick={onClose}>Zamknij</button>
      </div>
    );
  };
});

// Mock ModalCloseButton
jest.mock('@/components/ui/modal-close-button', () => {
  return function ModalCloseButton({ onClick, ariaLabel }: { onClick: () => void; ariaLabel: string }) {
    return (
      <button onClick={onClick} aria-label={ariaLabel}>
        ×
      </button>
    );
  };
});

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

describe('LoginModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSwitchToRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(
      <LoginModal
        isOpen={false}
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    expect(screen.queryByText('Zaloguj się')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <LoginModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    expect(screen.getByText('Zaloguj się')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasło')).toBeInTheDocument();
  });

  it('should validate email field', async () => {
    render(
      <LoginModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Hasło');
    const submitButton = screen.getByRole('button', { name: /zaloguj się/i });

    // Try to submit without email
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email jest wymagany/i)).toBeInTheDocument();
    });

    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nieprawidłowy format email/i)).toBeInTheDocument();
    });
  });

  it('should validate password field', async () => {
    render(
      <LoginModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Hasło');
    const submitButton = screen.getByRole('button', { name: /zaloguj się/i });

    // Enter email but no password
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/hasło jest wymagane/i)).toBeInTheDocument();
    });

    // Enter short password
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/hasło musi mieć co najmniej 6 znaków/i)).toBeInTheDocument();
    });
  });

  it('should call login on form submit with valid data', async () => {
    mockLogin.mockResolvedValue(true);

    render(
      <LoginModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Hasło');
    const submitButton = screen.getByRole('button', { name: /zaloguj się/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should toggle password visibility', () => {
    render(
      <LoginModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const passwordInput = screen.getByLabelText('Hasło') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleButton = screen.getByRole('button', { name: '' });
    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe('text');
  });

  it('should close modal when backdrop is clicked', () => {
    render(
      <LoginModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const backdrop = screen.getByRole('button', { name: '' }).closest('.fixed.inset-0');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should switch to register modal', () => {
    render(
      <LoginModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const switchButton = screen.getByText(/zarejestruj się/i);
    fireEvent.click(switchButton);

    expect(mockOnSwitchToRegister).toHaveBeenCalled();
  });

  it('should show forgot password modal', async () => {
    render(
      <LoginModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const forgotPasswordButton = screen.getByText(/zapomniałeś hasła/i);
    fireEvent.click(forgotPasswordButton);

    await waitFor(() => {
      expect(screen.getByTestId('forgot-password-modal')).toBeInTheDocument();
    });
  });

  it('should display error message from store', () => {
    jest.doMock('@/stores/auth-store', () => ({
      useAuthIsAuthenticated: () => false,
      useAuthIsLoading: () => false,
      useAuthError: () => 'Błąd logowania',
      useAuthActions: () => ({
        login: mockLogin,
      }),
    }));

    render(
      <LoginModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    // Error should be displayed
    expect(screen.getByText(/błąd logowania/i)).toBeInTheDocument();
  });

  it('should close modal after successful authentication', async () => {
    jest.doMock('@/stores/auth-store', () => ({
      useAuthIsAuthenticated: () => true,
      useAuthIsLoading: () => false,
      useAuthError: () => null,
      useAuthActions: () => ({
        login: mockLogin,
      }),
    }));

    render(
      <LoginModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should disable submit button when loading', () => {
    jest.doMock('@/stores/auth-store', () => ({
      useAuthIsAuthenticated: () => false,
      useAuthIsLoading: () => true,
      useAuthError: () => null,
      useAuthActions: () => ({
        login: mockLogin,
      }),
    }));

    render(
      <LoginModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const submitButton = screen.getByRole('button', { name: /zaloguj się/i });
    expect(submitButton).toBeDisabled();
  });
});

