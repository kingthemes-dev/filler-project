import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';
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
  updateProfile: (
    profileData: ProfileUpdatePayload
  ) => Promise<{ success: boolean; message: string; customer?: Partial<User> }>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message: string }>;
  clearError: () => void;

  // Token management
  setToken: (token: string) => void;
  clearToken: () => void;

  // User data
  fetchUserProfile: () => Promise<void>;

  // GDPR/RODO
  exportData: (format?: 'json' | 'csv') => Promise<{ success: boolean; data?: unknown; error?: string }>;
  deleteData: (email: string, reason?: string) => Promise<{ success: boolean; message: string; error?: string }>;
  portability: (format?: 'json' | 'csv') => Promise<{ success: boolean; data?: unknown; error?: string }>;
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

const mapWooAddress = (
  address?: WooAddressPayload
): Required<User>['billing'] => ({
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

const mapWooUserToState = (
  userData: WooAuthUserPayload,
  fallback?: Partial<RegisterData>
): User => {
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
      }
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
            error: null,
          });

          logger.info('AuthStore: User logged in via WooCommerce', {
            userId: user.id,
          });
          return true;
        } catch (error) {
          logger.error('AuthStore: Login error', { error });
          set({
            error: 'Błąd logowania. Sprawdź email i hasło.',
            isLoading: false,
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
            last_name: '', // Will be filled later during checkout
          });

          // If marketing consent is given, subscribe to newsletter
          if (userData.marketingConsent) {
            logger.info('AuthStore: Marketing consent given, subscribing to newsletter', {
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
            });
            try {
              // Combine firstName and lastName into name for newsletter schema
              const fullName = [userData.firstName, userData.lastName]
                .filter(Boolean)
                .join(' ')
                .trim() || undefined;

              const newsletterResponse = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: userData.email,
                  name: fullName, // Schema expects 'name', not 'firstName'/'lastName'
                  consent: true,
                  source: 'registration',
                }),
              });

              if (newsletterResponse.ok) {
                logger.info(
                  'AuthStore: User subscribed to newsletter after registration',
                  { email: userData.email }
                );
              } else if (newsletterResponse.status === 409) {
                // Email already exists in Brevo - this is OK, user already has discount code
                // Don't show error to user, just log it
                logger.info(
                  'AuthStore: User email already exists in newsletter - discount code already sent previously',
                  { email: userData.email }
                );
                // Silently continue - registration is successful
              } else {
                const errorData = await newsletterResponse.json().catch(() => ({}));
                logger.warn('AuthStore: Newsletter subscription error', {
                  error: errorData,
                  email: userData.email,
                  status: newsletterResponse.status,
                });
                // Don't fail registration if newsletter fails
              }
            } catch (error) {
              logger.warn('AuthStore: Newsletter subscription error', {
                error,
                email: userData.email,
              });
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
            userData
          );

          const token = 'woo-user-token-' + newUser.id;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          logger.info('AuthStore: User registered via WooCommerce', {
            userId: user.id,
          });
          return true;
        } catch (error) {
          logger.error('AuthStore: Registration error', { error });

          // Check if it's an email already exists error
          let errorMessage = 'Błąd rejestracji. Spróbuj ponownie.';
          if (error instanceof Error) {
            if (
              error.message.includes('registration-error-email-exists') ||
              error.message.includes('Email już istnieje')
            ) {
              errorMessage =
                'Ten adres email jest już zarejestrowany. Zaloguj się lub użyj innego adresu.';
            } else if (error.message.includes('400')) {
              errorMessage =
                'Błąd rejestracji. Sprawdź wprowadzone dane i spróbuj ponownie.';
            } else {
              errorMessage = error.message;
            }
          }

          set({
            error: errorMessage,
            isLoading: false,
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
          error: null,
        });
        logger.info('AuthStore: User logged out', {
          userId: user?.id ?? 'anonymous',
        });
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
            error: null,
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
          logger.debug('AuthStore: User updated locally', {
            userId: updatedUser.id,
          });
        }
      },

      updateProfile: async (profileData: ProfileUpdatePayload) => {
        const { user } = get();
        if (!user?.id) {
          return { success: false, message: 'Użytkownik nie jest zalogowany' };
        }

        set({ isLoading: true, error: null });
        try {
          const response = await fetch(
            '/api/woocommerce?endpoint=customer/update-profile',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                customer_id: user.id,
                profile_data: profileData,
              }),
            }
          );

          const data = (await response.json()) as {
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
            return {
              success: true,
              message: data.message,
              customer: data.customer,
            };
          } else {
            throw new Error(
              data.error || 'Nie udało się zaktualizować profilu'
            );
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Wystąpił błąd podczas aktualizacji profilu';
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
          const response = await fetch(
            '/api/woocommerce?endpoint=customer/change-password',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                customer_id: user.id,
                current_password: currentPassword,
                new_password: newPassword,
              }),
            }
          );

          const data = (await response.json()) as {
            success: boolean;
            message: string;
            error?: string;
          };

          if (data.success) {
            set({ isLoading: false, error: null });
            return { success: true, message: data.message };
          } else {
            throw new Error(data.error || 'Nie udało się zmienić hasła');
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Wystąpił błąd podczas zmiany hasła';
          set({ isLoading: false, error: message });
          logger.error('AuthStore: Change password error', {
            error,
            userId: user.id,
          });
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
        if (lastProfileFetchAt && Date.now() - lastProfileFetchAt < 15000)
          return;

        // If user already has basic billing data, avoid unnecessary fetches
        const hasBasicBilling = Boolean(
          user.billing &&
            (user.billing.address ||
              user.billing.city ||
              user.billing.postcode ||
              user.billing.phone)
        );
        if (
          hasBasicBilling &&
          lastProfileFetchAt &&
          Date.now() - lastProfileFetchAt < 5 * 60_000
        ) {
          return;
        }

        try {
          logger.debug('AuthStore: Fetching user profile from WooCommerce', {
            userId: user.id,
          });
          set({ isFetchingProfile: true });
          const response = await fetch(
            '/api/woocommerce?endpoint=customers/' + user.id,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error('Failed to fetch user profile');
          }

          const customerData = (await response.json()) as WooCustomer;
          logger.debug('AuthStore: Customer data fetched', {
            userId: customerData.id,
            hasMeta:
              Array.isArray(customerData.meta_data) &&
              customerData.meta_data.length > 0,
          });

          // Extract NIP from meta_data or billing
          const nipMeta = customerData.meta_data?.find(
            meta => meta.key === 'billing_nip' || meta.key === '_billing_nip'
          );
          const billingExtras = customerData.billing as unknown as
            | WooAddressPayload
            | undefined;
          const rawNipValue = nipMeta?.value ?? billingExtras?.nip ?? '';
          const nipValue =
            typeof rawNipValue === 'string'
              ? rawNipValue
              : String(rawNipValue ?? '');

          // Extract invoiceRequest from meta_data or billing
          const invoiceReqMeta = customerData.meta_data?.find(
            meta => meta.key === '_invoice_request'
          );
          const invoiceReqValue =
            invoiceReqMeta?.value === 'yes' ||
            billingExtras?.invoiceRequest === true ||
            billingExtras?.invoiceRequest === 'yes';

          // Auto-set invoiceRequest to true if NIP is provided but invoiceRequest is not explicitly set
          const finalInvoiceRequest =
            invoiceReqValue || (nipValue ? true : false);

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
              invoiceRequest: finalInvoiceRequest,
            },
            shipping: {
              address: customerData.shipping?.address_1 || '',
              city: customerData.shipping?.city || '',
              postcode: customerData.shipping?.postcode || '',
              country: customerData.shipping?.country || 'PL',
            },
          };

          // Only update if data actually changed to prevent render loops
          const current = get().user;
          const changed =
            JSON.stringify(current) !== JSON.stringify(updatedUser);
          if (changed) {
            set({ user: updatedUser });
          }
          set({ lastProfileFetchAt: Date.now() });
          if (changed) {
            logger.info('AuthStore: User profile updated', {
              userId: updatedUser.id,
            });
          } else {
            logger.debug('AuthStore: User profile unchanged', {
              userId: user.id,
            });
          }
        } catch (error) {
          logger.error('AuthStore: Error fetching user profile', {
            error,
            userId: user.id,
          });
        } finally {
          set({ isFetchingProfile: false });
        }
      },

      // GDPR/RODO - Export data
      exportData: async (format: 'json' | 'csv' = 'json') => {
        const { token, user } = get();
        if (!token || !user) {
          return {
            success: false,
            error: 'Użytkownik nie jest zalogowany',
          };
        }

        try {
          let response: Response;
          if (format === 'json') {
            response = await fetch(`/api/gdpr/export?format=json`, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
          } else {
            response = await fetch('/api/gdpr/portability', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ format: 'csv' }),
            });
          }

          if (!response.ok) {
            const errorData = (await response.json()) as {
              error?: string;
              message?: string;
            };
            throw new Error(errorData.message || errorData.error || 'Błąd eksportu danych');
          }

          if (format === 'csv') {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `moje-dane-${user.id}-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            return { success: true };
          } else {
            const data = (await response.json()) as {
              success: boolean;
              data?: unknown;
              message?: string;
            };

            const blob = new Blob([JSON.stringify(data.data, null, 2)], {
              type: 'application/json',
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `moje-dane-${user.id}-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            return {
              success: true,
              data: data.data,
            };
          }
        } catch (error) {
          logger.error('Error exporting data', { error });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Wystąpił błąd podczas eksportu danych',
          };
        }
      },

      // GDPR/RODO - Delete data
      deleteData: async (email: string, reason?: string) => {
        const { token, user, logout } = get();
        if (!token || !user) {
          return {
            success: false,
            message: 'Użytkownik nie jest zalogowany',
            error: 'Użytkownik nie jest zalogowany',
          };
        }

        if (email !== user.email) {
          return {
            success: false,
            message: 'Email musi odpowiadać adresowi konta',
            error: 'Email musi odpowiadać adresowi konta',
          };
        }

        try {
          const response = await fetch('/api/gdpr/delete', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              confirmation: true,
              reason,
            }),
          });

          if (!response.ok) {
            const errorData = (await response.json()) as {
              error?: string;
              message?: string;
            };
            throw new Error(errorData.message || errorData.error || 'Błąd usuwania danych');
          }

          const data = (await response.json()) as {
            success: boolean;
            message: string;
          };

          // Logout user after data deletion
          logout();

          return {
            success: true,
            message: data.message || 'Twoje dane zostały usunięte',
          };
        } catch (error) {
          logger.error('Error deleting data', { error });
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Wystąpił błąd podczas usuwania danych',
            error: error instanceof Error ? error.message : 'Wystąpił błąd podczas usuwania danych',
          };
        }
      },

      // GDPR/RODO - Portability
      portability: async (format: 'json' | 'csv' = 'json') => {
        const { token, user } = get();
        if (!token || !user) {
          return {
            success: false,
            error: 'Użytkownik nie jest zalogowany',
          };
        }

        try {
          const response = await fetch('/api/gdpr/portability', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ format }),
          });

          if (!response.ok) {
            const errorData = (await response.json()) as {
              error?: string;
              message?: string;
            };
            throw new Error(errorData.message || errorData.error || 'Błąd przenoszenia danych');
          }

          if (format === 'csv') {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `moje-dane-przenoszenie-${user.id}-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            return { success: true };
          } else {
            const data = (await response.json()) as {
              success: boolean;
              data?: unknown;
              message?: string;
            };

            const blob = new Blob([JSON.stringify(data.data, null, 2)], {
              type: 'application/json',
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `moje-dane-przenoszenie-${user.id}-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            return {
              success: true,
              data: data.data,
            };
          }
        } catch (error) {
          logger.error('Error portability', { error });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Wystąpił błąd podczas przenoszenia danych',
          };
        }
      },
    }),
    {
      name: 'filler-auth-storage',
      partialize: state => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors for optimized subscriptions
export const useAuthUser = () => useAuthStore(state => state.user);
export const useAuthToken = () => useAuthStore(state => state.token);
export const useAuthIsAuthenticated = () =>
  useAuthStore(state => state.isAuthenticated);
export const useAuthIsLoading = () => useAuthStore(state => state.isLoading);
export const useAuthError = () => useAuthStore(state => state.error);

// Memoized selectors for actions to prevent re-renders
export const useAuthActions = () => {
  const login = useAuthStore(state => state.login);
  const register = useAuthStore(state => state.register);
  const logout = useAuthStore(state => state.logout);
  const refreshToken = useAuthStore(state => state.refreshToken);
  const updateUser = useAuthStore(state => state.updateUser);
  const updateProfile = useAuthStore(state => state.updateProfile);
  const changePassword = useAuthStore(state => state.changePassword);
  const clearError = useAuthStore(state => state.clearError);
  const setToken = useAuthStore(state => state.setToken);
  const clearToken = useAuthStore(state => state.clearToken);
  const fetchUserProfile = useAuthStore(state => state.fetchUserProfile);
  const exportData = useAuthStore(state => state.exportData);
  const deleteData = useAuthStore(state => state.deleteData);
  const portability = useAuthStore(state => state.portability);

  return useMemo(
    () => ({
      login,
      register,
      logout,
      refreshToken,
      updateUser,
      updateProfile,
      changePassword,
      clearError,
      setToken,
      clearToken,
      fetchUserProfile,
      exportData,
      deleteData,
      portability,
    }),
    [
      login,
      register,
      logout,
      refreshToken,
      updateUser,
      updateProfile,
      changePassword,
      clearError,
      setToken,
      clearToken,
      fetchUserProfile,
      exportData,
      deleteData,
      portability,
    ]
  );
};

export const useAuthState = () => {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const error = useAuthStore(state => state.error);

  return useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      isLoading,
      error,
    }),
    [user, token, isAuthenticated, isLoading, error]
  );
};
