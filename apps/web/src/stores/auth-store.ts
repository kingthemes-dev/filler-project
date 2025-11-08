import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import wooCommerceService from '@/services/woocommerce-optimized';
import { logger } from '@/utils/logger';
import type { WooCustomer } from '@/types/woocommerce';

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
    invoiceRequest?: boolean;
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
  // Profile fetch guardrails
  isFetchingProfile?: boolean;
  lastProfileFetchAt?: number;
}

export interface AuthActions {
  // Authentication
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  
  // User management
  updateUser: (userData: Partial<User>) => void;
  updateProfile: (profileData: ProfileUpdatePayload) => Promise<{ success: boolean; message: string; customer?: Partial<User> }>;
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

type WooAddressPayload = {
  address_1?: string;
  city?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  company?: string;
  nip?: string;
  invoiceRequest?: boolean | string;
};

interface WooAuthUserPayload {
  id: number;
  email: string;
  token?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  billing?: WooAddressPayload;
  shipping?: WooAddressPayload;
}

type ProfileUpdatePayload = Record<string, unknown>;

const mapWooAddress = (address?: WooAddressPayload): Required<User>['billing'] => ({
  address: address?.address_1 || '',
  city: address?.city || '',
  postcode: address?.postcode || '',
  country: address?.country || 'PL',
  phone: address?.phone || '',
  company: address?.company || '',
  nip: address?.nip || '',
  invoiceRequest:
    typeof address?.invoiceRequest === 'boolean'
      ? address.invoiceRequest
      : address?.invoiceRequest === 'yes',
});

const mapWooUserToState = (userData: WooAuthUserPayload, fallback?: Partial<RegisterData>): User => {
  const firstName =
    userData.firstName ??
    userData.first_name ??
    fallback?.firstName ??
    userData.name?.split(' ')[0] ??
    '';
  const lastName =
    userData.lastName ??
    userData.last_name ??
    fallback?.lastName ??
    (userData.name ? userData.name.split(' ').slice(1).join(' ') : '') ??
    '';

  return {
    id: userData.id,
    email: userData.email,
    firstName,
    lastName,
    role: 'customer',
    billing: mapWooAddress(
      userData.billing ?? {
        country: 'PL',
        phone: fallback?.phone,
        company: fallback?.company,
        nip: fallback?.nip,
      },
    ),
    shipping: {
      address: userData.shipping?.address_1 || '',
      city: userData.shipping?.city || '',
      postcode: userData.shipping?.postcode || '',
      country: userData.shipping?.country || 'PL',
    },
  };
};

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
      isFetchingProfile: false,
      lastProfileFetchAt: 0,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Real WooCommerce API call
          const response = await wooCommerceService.loginUser(email, password);
          
          if (!response.success || !response.user) {
            throw new Error('Błąd logowania');
          }
          
          const userData = response.user as WooAuthUserPayload;
          
          // Transform WooCommerce user data to our format
          const user = mapWooUserToState(userData);
          
          const token = userData.token;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          logger.info('AuthStore: User logged in via WooCommerce', { userId: user.id });
          return true;
          
        } catch (error) {
          logger.error('AuthStore: Login error', { error });
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
          logger.debug('AuthStore: Register data received', {
            email: userData.email,
            marketingConsent: userData.marketingConsent ?? false,
          });
          
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
              logger.info('AuthStore: User subscribed to newsletter after registration', { email: userData.email });
            } catch (error) {
              logger.warn('AuthStore: Newsletter subscription error', { error, email: userData.email });
              // Don't fail registration if newsletter fails
            }
          }
          
          if (!response.success || !response.user) {
            throw new Error('Błąd rejestracji');
          }
          
          const newUser = response.user;
          
          // Transform WooCommerce user data to our format
          const user = mapWooUserToState(
            {
              id: newUser.id,
              email: newUser.email,
              billing: {
                phone: userData.phone,
                company: userData.company,
                nip: userData.nip,
              },
            },
            userData,
          );
          
          const token = 'woo-user-token-' + newUser.id;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          logger.info('AuthStore: User registered via WooCommerce', { userId: user.id });
          return true;
          
        } catch (error) {
          logger.error('AuthStore: Registration error', { error });
          
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
        const { user } = get();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        });
        logger.info('AuthStore: User logged out', { userId: user?.id ?? 'anonymous' });
      },

      refreshToken: async () => {
        const { token } = get();
        
        if (!token) {
          logger.warn('AuthStore: Refresh token called without token');
          return false;
        }
        
        try {
          const response = await wooCommerceService.refreshJWTToken(token);
          
          if (!response.success || !response.token) {
            throw new Error('Token refresh failed');
          }
          
          set({
            token: response.token,
            error: null
          });
          
          logger.info('AuthStore: Token refreshed successfully');
          return true;
        } catch (error) {
          logger.error('AuthStore: Token refresh error', { error });
          // If refresh fails, logout user
          get().logout();
          return false;
        }
      },

      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          const updatedUser = { ...user, ...userData };
          set({ user: updatedUser });
          logger.debug('AuthStore: User updated locally', { userId: updatedUser.id });
        }
      },

      updateProfile: async (profileData: ProfileUpdatePayload) => {
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

          const data = await response.json() as {
            success: boolean;
            message: string;
            customer?: Partial<User>;
            error?: string;
          };

          if (data.success) {
            // Update local user data
            const { updateUser } = get();
            if (data.customer) {
              updateUser(data.customer);
            }
            
            set({ isLoading: false, error: null });
            logger.info('AuthStore: Profile updated', { userId: user.id });
            return { success: true, message: data.message, customer: data.customer };
          } else {
            throw new Error(data.error || 'Nie udało się zaktualizować profilu');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Wystąpił błąd podczas aktualizacji profilu';
          set({ isLoading: false, error: message });
          return { success: false, message };
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

          const data = await response.json() as { success: boolean; message: string; error?: string };

          if (data.success) {
            set({ isLoading: false, error: null });
            return { success: true, message: data.message };
          } else {
            throw new Error(data.error || 'Nie udało się zmienić hasła');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Wystąpił błąd podczas zmiany hasła';
          set({ isLoading: false, error: message });
          logger.error('AuthStore: Change password error', { error, userId: user.id });
          return { success: false, message };
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
        const { token, user, isFetchingProfile, lastProfileFetchAt } = get();
        if (!token || !user) return;

        // Skip if already fetching or fetched very recently (15s)
        if (isFetchingProfile) return;
        if (lastProfileFetchAt && Date.now() - lastProfileFetchAt < 15000) return;

        // If user already has basic billing data, avoid unnecessary fetches
        const hasBasicBilling = Boolean(
          user.billing &&
          (user.billing.address || user.billing.city || user.billing.postcode || user.billing.phone)
        );
        if (hasBasicBilling && lastProfileFetchAt && Date.now() - lastProfileFetchAt < 5 * 60_000) {
          return;
        }
        
        try {
          logger.debug('AuthStore: Fetching user profile from WooCommerce', { userId: user.id });
          set({ isFetchingProfile: true });
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
          
          const customerData = (await response.json()) as WooCustomer;
          logger.debug('AuthStore: Customer data fetched', {
            userId: customerData.id,
            hasMeta: Array.isArray(customerData.meta_data) && customerData.meta_data.length > 0,
          });
          
          // Extract NIP from meta_data or billing
          const nipMeta = customerData.meta_data?.find((meta) => meta.key === 'billing_nip' || meta.key === '_billing_nip');
          const billingExtras = customerData.billing as unknown as WooAddressPayload | undefined;
          const rawNipValue = nipMeta?.value ?? billingExtras?.nip ?? '';
          const nipValue = typeof rawNipValue === 'string' ? rawNipValue : String(rawNipValue ?? '');
          
          // Extract invoiceRequest from meta_data or billing
          const invoiceReqMeta = customerData.meta_data?.find((meta) => meta.key === '_invoice_request');
          const invoiceReqValue =
            invoiceReqMeta?.value === 'yes' ||
            billingExtras?.invoiceRequest === true ||
            billingExtras?.invoiceRequest === 'yes';
          
          // Auto-set invoiceRequest to true if NIP is provided but invoiceRequest is not explicitly set
          const finalInvoiceRequest = invoiceReqValue || (nipValue ? true : false);
          
          logger.debug('AuthStore: Invoice fields extraction', {
            userId: customerData.id,
            nipValue,
            invoiceReqValue,
            finalInvoiceRequest,
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
              nip: nipValue,
              invoiceRequest: finalInvoiceRequest
            },
            shipping: {
              address: customerData.shipping?.address_1 || '',
              city: customerData.shipping?.city || '',
              postcode: customerData.shipping?.postcode || '',
              country: customerData.shipping?.country || 'PL'
            }
          };
          
          // Only update if data actually changed to prevent render loops
          const current = get().user;
          const changed = JSON.stringify(current) !== JSON.stringify(updatedUser);
          if (changed) {
            set({ user: updatedUser });
          }
          set({ lastProfileFetchAt: Date.now() });
          if (changed) {
            logger.info('AuthStore: User profile updated', { userId: updatedUser.id });
          } else {
            logger.debug('AuthStore: User profile unchanged', { userId: user.id });
          }
          
        } catch (error) {
          logger.error('AuthStore: Error fetching user profile', { error, userId: user.id });
        } finally {
          set({ isFetchingProfile: false });
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
