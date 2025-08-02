import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User, AuthTokens, UserLogin, UserRegister } from '@/types';
import { apiClient } from '@/lib/api';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false, // Add hydration state

      login: async (credentials: UserLogin) => {
        set({ isLoading: true });
        try {
          const tokens = await apiClient.login(credentials);
          const user = await apiClient.getProfile();
          
          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
          });

          // Clear courses cache to ensure fresh data for logged in user
          if (typeof window !== 'undefined') {
            const { useCoursesStore } = await import('./courses');
            useCoursesStore.getState().clearCache();
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData: UserRegister) => {
        set({ isLoading: true });
        try {
          await apiClient.register(userData);
          
          // Auto-login after registration
          await get().login({
            email: userData.email,
            password: userData.password,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async (showMessage: boolean = false) => {
        set({ isLoading: true });
        try {
          await apiClient.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
          });

          // Clear courses cache to ensure fresh data for logged out user
          if (typeof window !== 'undefined') {
            const { useCoursesStore } = await import('./courses');
            useCoursesStore.getState().clearCache();
            
            // Show message if requested and redirect
            if (showMessage) {
              // Could add a toast notification here in the future
              console.info('Сессия истекла. Перенаправляем на страницу входа...');
            }
            
            // Smooth redirect to login
            setTimeout(() => {
              if (!window.location.pathname.includes('/auth/')) {
                window.location.href = '/auth/login?message=session_expired';
              }
            }, 100);
          }
        }
      },

      setTokens: (tokens: AuthTokens) => {
        set({ tokens });
      },

      refreshToken: async () => {
        const { tokens } = get();
        if (!tokens?.refresh_token) {
          throw new Error('No refresh token available');
        }

        try {
          const newTokens = await apiClient.refreshToken(tokens.refresh_token);
          set({ tokens: newTokens });
        } catch (error) {
          // If refresh fails, logout user
          get().logout();
          throw error;
        }
      },

      initializeAuth: async () => {
        // Check if we have stored data after hydration
        const { user, tokens, isAuthenticated } = get();
        
        if (tokens && user && isAuthenticated) {
          // We have everything, just mark as hydrated
          set({ isHydrated: true });
        } else if (tokens && !user) {
          // We have tokens but no user data, fetch user profile
          try {
            const user = await apiClient.getProfile();
            set({
              user,
              isAuthenticated: true,
              isHydrated: true
            });
          } catch (error) {
            // Token might be invalid, clear everything
            await get().logout();
            set({ isHydrated: true });
          }
        } else {
          // No valid auth data, mark as not authenticated but hydrated
          set({ 
            isAuthenticated: false,
            isHydrated: true
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Set hydrated to true after rehydration
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);

