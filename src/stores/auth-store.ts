import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import wooCommerceService from '@/services/woocommerce-optimized';

// Types
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  billing?: {
    address: string;
    city: string;
    postcode: string;
    country: string;
    phone: string;
  };
  shipping?: {
    address: string;
    city: string;
    postcode: string;
    country: string;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  // Authentication
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  
  // User management
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
  
  // Token management
  setToken: (token: string) => void;
  clearToken: () => void;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export type AuthStore = AuthState & AuthActions;

// Auth Store
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Real WooCommerce API call
          const userData = await wooCommerceService.loginUser(email, password);
          
          // Transform WooCommerce user data to our format
          const user: User = {
            id: userData.id,
            email: userData.email,
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            role: 'customer',
            billing: {
              address: userData.billing?.address_1 || '',
              city: userData.billing?.city || '',
              postcode: userData.billing?.postcode || '',
              country: userData.billing?.country || '',
              phone: userData.billing?.phone || ''
            },
            shipping: {
              address: userData.shipping?.address_1 || '',
              city: userData.shipping?.city || '',
              postcode: userData.shipping?.postcode || '',
              country: userData.shipping?.country || ''
            }
          };
          
          const token = 'woo-user-token-' + userData.id;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          console.log('🔐 User logged in via WooCommerce:', user);
          return true
          
        } catch (error) {
          console.error('Login error:', error);
          set({
            error: 'Błąd logowania. Sprawdź email i hasło.',
            isLoading: false
          });
          return false;
        }
      },

      register: async (userData: RegisterData) => {
        set({ isLoading: true, error: null });
        
        try {
          // Real WooCommerce API call
          const newUser = await wooCommerceService.registerUser(userData);
          
          // Transform WooCommerce user data to our format
          const user: User = {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.first_name || userData.firstName,
            lastName: newUser.last_name || userData.lastName,
            role: 'customer',
            billing: {
              address: '',
              city: '',
              postcode: '',
              country: 'PL',
              phone: userData.phone
            },
            shipping: {
              address: '',
              city: '',
              postcode: '',
              country: 'PL'
            }
          };
          
          const token = 'woo-user-token-' + newUser.id;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          console.log('🔐 User registered via WooCommerce:', user);
          return true;
          
        } catch (error) {
          console.error('Registration error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Błąd rejestracji. Spróbuj ponownie.';
          set({
            error: errorMessage,
            isLoading: false
          });
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        });
        console.log('🔐 User logged out');
      },

      refreshToken: async () => {
        // TODO: Implement JWT refresh logic
        const { token } = get();
        if (!token) return false;
        
        try {
          // Simulate token refresh
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log('🔐 Token refreshed');
          return true;
        } catch (error) {
          console.error('Token refresh error:', error);
          get().logout();
          return false;
        }
      },

      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          const updatedUser = { ...user, ...userData };
          set({ user: updatedUser });
          console.log('🔐 User updated:', updatedUser);
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setToken: (token: string) => {
        set({ token, isAuthenticated: true });
      },

      clearToken: () => {
        set({ token: null, isAuthenticated: false });
      }
    }),
    {
      name: 'filler-auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
