import { renderHook, waitFor, act } from '@testing-library/react';
import { useFavoritesSync } from '@/hooks/use-favorites-sync';

// Mock stores
const mockLoadFromAPI = jest.fn(() => Promise.resolve());
const mockSyncWithAPI = jest.fn(() => Promise.resolve());

// Create mock implementations that can be changed
let mockIsAuthenticated = false;
let mockUser: { id: number } | null = null;
const mockLastSyncTime = null;

jest.mock('@/stores/favorites-store', () => ({
  useFavoritesActions: jest.fn(() => ({
    loadFromAPI: mockLoadFromAPI,
    syncWithAPI: mockSyncWithAPI,
  })),
  useFavoritesLastSyncTime: () => mockLastSyncTime,
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthIsAuthenticated: jest.fn(() => mockIsAuthenticated),
  useAuthUser: jest.fn(() => mockUser),
}));

describe('useFavoritesSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIsAuthenticated = false;
    mockUser = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should load from API when user is authenticated', async () => {
    mockIsAuthenticated = true;
    mockUser = { id: 1 };

    const { useAuthIsAuthenticated, useAuthUser } = require('@/stores/auth-store');
    useAuthIsAuthenticated.mockReturnValue(true);
    useAuthUser.mockReturnValue({ id: 1 });

    renderHook(() => useFavoritesSync());

    await waitFor(() => {
      expect(mockLoadFromAPI).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('should sync with API when user is not authenticated', async () => {
    mockIsAuthenticated = false;
    mockUser = null;

    const { useAuthIsAuthenticated, useAuthUser } = require('@/stores/auth-store');
    useAuthIsAuthenticated.mockReturnValue(false);
    useAuthUser.mockReturnValue(null);

    renderHook(() => useFavoritesSync());

    await waitFor(() => {
      expect(mockSyncWithAPI).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('should set up auto-sync interval for authenticated users', async () => {
    mockIsAuthenticated = true;
    mockUser = { id: 1 };

    const { useAuthIsAuthenticated, useAuthUser } = require('@/stores/auth-store');
    useAuthIsAuthenticated.mockReturnValue(true);
    useAuthUser.mockReturnValue({ id: 1 });

    renderHook(() => useFavoritesSync());

    // Wait for initial load
    await waitFor(() => {
      expect(mockLoadFromAPI).toHaveBeenCalled();
    });

    // Clear mocks to test interval
    jest.clearAllMocks();

    // Fast-forward 5 minutes
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    await waitFor(() => {
      expect(mockSyncWithAPI).toHaveBeenCalled();
    });
  });

  it('should sync on visibility change', async () => {
    mockIsAuthenticated = true;
    mockUser = { id: 1 };

    const { useAuthIsAuthenticated, useAuthUser } = require('@/stores/auth-store');
    useAuthIsAuthenticated.mockReturnValue(true);
    useAuthUser.mockReturnValue({ id: 1 });

    renderHook(() => useFavoritesSync());

    // Wait for initial load
    await waitFor(() => {
      expect(mockLoadFromAPI).toHaveBeenCalled();
    });

    // Clear mocks
    jest.clearAllMocks();

    // Simulate visibility change
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible',
      configurable: true,
    });

    const event = new Event('visibilitychange');
    document.dispatchEvent(event);

    await waitFor(() => {
      expect(mockSyncWithAPI).toHaveBeenCalled();
    });
  });
});

