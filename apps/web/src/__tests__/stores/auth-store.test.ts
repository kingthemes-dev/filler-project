import { act, renderHook } from '@testing-library/react';
import {
  useAuthStore,
  useAuthUser,
  useAuthToken,
  useAuthIsAuthenticated,
  useAuthIsLoading,
  useAuthError,
  useAuthActions,
  useAuthState,
} from '@/stores/auth-store';

// Mock fetch
global.fetch = jest.fn();

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock woocommerce-optimized service
jest.mock('@/services/woocommerce-optimized', () => {
  return {
    __esModule: true,
    default: {
      loginUser: jest.fn(),
      registerUser: jest.fn(),
      refreshJWTToken: jest.fn(),
    },
  };
});

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isFetchingProfile: false,
      lastProfileFetchAt: 0,
    });

    // Clear localStorage
    localStorage.clear();

    // Reset mocks
    (global.fetch as jest.Mock).mockClear();
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty auth state', () => {
      const { result } = renderHook(() => useAuthStore());
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const { result } = renderHook(() => useAuthActions());

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Jan',
        last_name: 'Kowalski',
        token: 'test-token-123',
        billing: {
          address_1: 'Test Street 1',
          city: 'Warsaw',
          postcode: '00-001',
          country: 'PL',
          phone: '123456789',
        },
      };

      const wooCommerceService = require('@/services/woocommerce-optimized').default;
      wooCommerceService.loginUser.mockResolvedValueOnce({
        success: true,
        user: mockUser,
      });

      await act(async () => {
        const success = await result.current.login('test@example.com', 'password');
        expect(success).toBe(true);
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toMatchObject({
        id: 1,
        email: 'test@example.com',
        firstName: 'Jan',
        lastName: 'Kowalski',
      });
      expect(state.token).toBe('test-token-123');
      expect(state.error).toBeNull();
    });

    it('should handle login failure', async () => {
      const { result } = renderHook(() => useAuthActions());

      const wooCommerceService = require('@/services/woocommerce-optimized').default;
      wooCommerceService.loginUser.mockResolvedValueOnce({
        success: false,
        user: null,
      });

      await act(async () => {
        const success = await result.current.login('test@example.com', 'wrong');
        expect(success).toBe(false);
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      const { result } = renderHook(() => useAuthActions());

      const mockUser = {
        id: 2,
        email: 'new@example.com',
      };

      const wooCommerceService = require('@/services/woocommerce-optimized').default;
      wooCommerceService.registerUser.mockResolvedValueOnce({
        success: true,
        user: mockUser,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        const success = await result.current.register({
          email: 'new@example.com',
          password: 'password123',
          firstName: 'Anna',
          lastName: 'Nowak',
        });
        expect(success).toBe(true);
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('new@example.com');
    });

    it('should handle registration error - email exists', async () => {
      const { result } = renderHook(() => useAuthActions());

      const wooCommerceService = require('@/services/woocommerce-optimized').default;
      wooCommerceService.registerUser.mockRejectedValueOnce(
        new Error('registration-error-email-exists')
      );

      await act(async () => {
        const success = await result.current.register({
          email: 'existing@example.com',
          password: 'password123',
        });
        expect(success).toBe(false);
      });

      const state = useAuthStore.getState();
      expect(state.error).toContain('już zarejestrowany');
    });
  });

  describe('logout', () => {
    it('should logout user and clear state', async () => {
      const { result } = renderHook(() => useAuthActions());

      // First login
      const wooCommerceService = require('@/services/woocommerce-optimized').default;
      wooCommerceService.loginUser.mockResolvedValueOnce({
        success: true,
        user: {
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          token: 'token',
        },
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      // Then logout
      act(() => {
        result.current.logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update user locally', async () => {
      const { result } = renderHook(() => useAuthActions());

      // First login
      const wooCommerceService = require('@/services/woocommerce-optimized').default;
      wooCommerceService.loginUser.mockResolvedValueOnce({
        success: true,
        user: {
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          token: 'token',
        },
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      // Update user
      act(() => {
        result.current.updateUser({ firstName: 'Updated' });
      });

      const state = useAuthStore.getState();
      expect(state.user?.firstName).toBe('Updated');
    });
  });

  describe('setToken / clearToken', () => {
    it('should set token', () => {
      const { result } = renderHook(() => useAuthActions());

      act(() => {
        result.current.setToken('new-token');
      });

      const state = useAuthStore.getState();
      expect(state.token).toBe('new-token');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should clear token', () => {
      const { result } = renderHook(() => useAuthActions());

      // Set token first
      act(() => {
        result.current.setToken('test-token');
      });

      // Clear it
      act(() => {
        result.current.clearToken();
      });

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useAuthActions());

      // Set error first
      useAuthStore.setState({ error: 'Test error' });

      // Clear it
      act(() => {
        result.current.clearError();
      });

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const { result } = renderHook(() => useAuthActions());

      // First login
      const wooCommerceService = require('@/services/woocommerce-optimized').default;
      wooCommerceService.loginUser.mockResolvedValueOnce({
        success: true,
        user: {
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          token: 'token',
        },
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      // Update profile
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Profil zaktualizowany',
          customer: { firstName: 'Updated' },
        }),
      });

      await act(async () => {
        const response = await result.current.updateProfile({
          first_name: 'Updated',
        });
        expect(response.success).toBe(true);
      });
    });

    it('should handle update profile error', async () => {
      const { result } = renderHook(() => useAuthActions());

      // First login
      const wooCommerceService = require('@/services/woocommerce-optimized').default;
      wooCommerceService.loginUser.mockResolvedValueOnce({
        success: true,
        user: {
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          token: 'token',
        },
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      // Update profile with error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Błąd aktualizacji',
        }),
      });

      await act(async () => {
        const response = await result.current.updateProfile({
          first_name: 'Updated',
        });
        expect(response.success).toBe(false);
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const { result } = renderHook(() => useAuthActions());

      // First login
      const wooCommerceService = require('@/services/woocommerce-optimized').default;
      wooCommerceService.loginUser.mockResolvedValueOnce({
        success: true,
        user: {
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          token: 'token',
        },
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      // Change password
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Hasło zostało zmienione',
        }),
      });

      await act(async () => {
        const response = await result.current.changePassword(
          'old-password',
          'new-password'
        );
        expect(response.success).toBe(true);
      });
    });
  });

  describe('Selectors', () => {
    it('useAuthUser should return user', () => {
      useAuthStore.setState({
        user: { id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User', role: 'customer' },
      });

      const { result } = renderHook(() => useAuthUser());
      expect(result.current?.email).toBe('test@example.com');
    });

    it('useAuthToken should return token', () => {
      useAuthStore.setState({ token: 'test-token' });
      const { result } = renderHook(() => useAuthToken());
      expect(result.current).toBe('test-token');
    });

    it('useAuthIsAuthenticated should return auth status', () => {
      useAuthStore.setState({ isAuthenticated: true });
      const { result } = renderHook(() => useAuthIsAuthenticated());
      expect(result.current).toBe(true);
    });

    it('useAuthIsLoading should return loading state', () => {
      useAuthStore.setState({ isLoading: true });
      const { result } = renderHook(() => useAuthIsLoading());
      expect(result.current).toBe(true);
    });

    it('useAuthError should return error', () => {
      useAuthStore.setState({ error: 'Test error' });
      const { result } = renderHook(() => useAuthError());
      expect(result.current).toBe('Test error');
    });

    it('useAuthState should return all state', () => {
      const state = {
        user: { id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User', role: 'customer' },
        token: 'token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
      useAuthStore.setState(state);

      const { result } = renderHook(() => useAuthState());
      expect(result.current.user?.email).toBe('test@example.com');
      expect(result.current.token).toBe('token');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});

