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
    company?: string;
    nip?: string;
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
  updateProfile: (profileData: any) => Promise<{ success: boolean; message: string; customer?: any }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  clearError: () => void;
  
  // Token management
  setToken: (token: string) => void;
  clearToken: () => void;
  
  // User data
  fetchUserProfile: () => Promise<void>;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  nip?: string;
  marketingConsent?: boolean;
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
          const response = await wooCommerceService.loginUser(email, password);
          
          if (!response.success || !response.user) {
            throw new Error('Błąd logowania');
          }
          
          const userData = response.user;
          
          // Transform WooCommerce user data to our format
          const user: User = {
            id: userData.id,
            email: userData.email,
            firstName: (userData as any).first_name || userData.name?.split(' ')[0] || '',
            lastName: (userData as any).last_name || userData.name?.split(' ').slice(1).join(' ') || '',
            role: 'customer',
            billing: {
              address: (userData as any).billing?.address_1 || '',
              city: (userData as any).billing?.city || '',
              postcode: (userData as any).billing?.postcode || '',
              country: (userData as any).billing?.country || 'PL',
              phone: (userData as any).billing?.phone || '',
              company: (userData as any).billing?.company || '',
              nip: (userData as any).billing?.nip || ''
            },
            shipping: {
              address: (userData as any).shipping?.address_1 || '',
              city: (userData as any).shipping?.city || '',
              postcode: (userData as any).shipping?.postcode || '',
              country: (userData as any).shipping?.country || 'PL'
            }
          };
          
          const token = userData.token;
          
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
          console.log('🔍 Auth store register data:', userData);
          
          // Real WooCommerce API call
          const response = await wooCommerceService.registerUser({
            username: userData.email, // Keep for compatibility but not used in payload
            email: userData.email,
            password: userData.password,
            first_name: '', // Will be filled later during checkout
            last_name: ''   // Will be filled later during checkout
          });
          
          // If marketing consent is given, subscribe to newsletter
          if (userData.marketingConsent) {
            try {
              await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: userData.email,
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  consent: true,
                  source: 'registration'
                }),
              });
              console.log('✅ User subscribed to newsletter with 10% discount');
            } catch (error) {
              console.error('❌ Newsletter subscription error:', error);
              // Don't fail registration if newsletter fails
            }
          }
          
          if (!response.success || !response.user) {
            throw new Error('Błąd rejestracji');
          }
          
          const newUser = response.user;
          
          // Transform WooCommerce user data to our format
          const user: User = {
            id: newUser.id,
            email: newUser.email,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            role: 'customer',
            billing: {
              address: '',
              city: '',
              postcode: '',
              country: 'PL',
              phone: userData.phone || ''
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
          
          // Check if it's an email already exists error
          let errorMessage = 'Błąd rejestracji. Spróbuj ponownie.';
          if (error instanceof Error) {
            if (error.message.includes('registration-error-email-exists') || error.message.includes('Email już istnieje')) {
              errorMessage = 'Ten adres email jest już zarejestrowany. Zaloguj się lub użyj innego adresu.';
            } else if (error.message.includes('400')) {
              errorMessage = 'Błąd rejestracji. Sprawdź wprowadzone dane i spróbuj ponownie.';
            } else {
              errorMessage = error.message;
            }
          }
          
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

      updateProfile: async (profileData: any) => {
        const { user } = get();
        if (!user?.id) {
          return { success: false, message: 'Użytkownik nie jest zalogowany' };
        }

        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/woocommerce?endpoint=customer/update-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customer_id: user.id,
              profile_data: profileData
            }),
          });

          const data = await response.json();

          if (data.success) {
            // Update local user data
            const { updateUser } = get();
            updateUser(data.customer);
            
            set({ isLoading: false, error: null });
            return { success: true, message: data.message, customer: data.customer };
          } else {
            throw new Error(data.error || 'Nie udało się zaktualizować profilu');
          }
        } catch (err: any) {
          set({ isLoading: false, error: err.message || 'Wystąpił błąd podczas aktualizacji profilu' });
          return { success: false, message: err.message || 'Wystąpił błąd podczas aktualizacji profilu' };
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        const { user } = get();
        if (!user?.id) {
          return { success: false, message: 'Użytkownik nie jest zalogowany' };
        }

        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/woocommerce?endpoint=customer/change-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customer_id: user.id,
              current_password: currentPassword,
              new_password: newPassword
            }),
          });

          const data = await response.json();

          if (data.success) {
            set({ isLoading: false, error: null });
            return { success: true, message: data.message };
          } else {
            throw new Error(data.error || 'Nie udało się zmienić hasła');
          }
        } catch (err: any) {
          set({ isLoading: false, error: err.message || 'Wystąpił błąd podczas zmiany hasła' });
          return { success: false, message: err.message || 'Wystąpił błąd podczas zmiany hasła' };
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
      },
      
      // Fetch user profile from WooCommerce
      fetchUserProfile: async () => {
        const { token, user } = get();
        if (!token || !user) return;
        
        try {
          console.log('🔄 Fetching user profile from WooCommerce...');
          const response = await fetch('/api/woocommerce?endpoint=customers/' + user.id, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch user profile');
          }
          
          const customerData = await response.json();
          console.log('📋 Customer data from WooCommerce:', customerData);
          
          // Extract NIP from meta_data
          const nipMeta = customerData.meta_data?.find((meta: any) => meta.key === 'billing_nip');
          const nipValue = nipMeta?.value || '';
          
          console.log('🔍 NIP extraction:', { 
            nipMeta, 
            nipValue, 
            billingNip: customerData.billing?.nip,
            metaDataLength: customerData.meta_data?.length 
          });
          
          // Update user data with full WooCommerce customer data
          const updatedUser: User = {
            id: customerData.id,
            email: customerData.email,
            firstName: customerData.first_name || '',
            lastName: customerData.last_name || '',
            role: 'customer',
            billing: {
              address: customerData.billing?.address_1 || '',
              city: customerData.billing?.city || '',
              postcode: customerData.billing?.postcode || '',
              country: customerData.billing?.country || 'PL',
              phone: customerData.billing?.phone || '',
              company: customerData.billing?.company || '',
              nip: nipValue
            },
            shipping: {
              address: customerData.shipping?.address_1 || '',
              city: customerData.shipping?.city || '',
              postcode: customerData.shipping?.postcode || '',
              country: customerData.shipping?.country || 'PL'
            }
          };
          
          set({ user: updatedUser });
          console.log('✅ User profile updated:', updatedUser);
          
        } catch (error) {
          console.error('❌ Error fetching user profile:', error);
        }
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
