import { useEffect } from 'react';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useAuthStore } from '@/stores/auth-store';

export const useFavoritesSync = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { loadFromAPI, syncWithAPI, lastSyncTime } = useFavoritesStore();

  useEffect(() => {
    const syncFavorites = async () => {
      if (isAuthenticated && user) {
        // Load favorites from API when user logs in
        await loadFromAPI();
      } else if (!isAuthenticated) {
        // Sync local favorites to API when user logs out (for anonymous user)
        await syncWithAPI();
      }
    };

    syncFavorites();
  }, [isAuthenticated, user, loadFromAPI, syncWithAPI]);

  // Auto-sync every 5 minutes if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (!lastSyncTime || now - lastSyncTime > fiveMinutes) {
        await syncWithAPI();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, lastSyncTime, syncWithAPI]);

  // Sync on page visibility change (when user comes back to tab)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        await syncWithAPI();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, syncWithAPI]);
};
