'use client';

import { useFavoritesSync } from '@/hooks/use-favorites-sync';

export default function FavoritesSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hook handles all the synchronization logic
  useFavoritesSync();

  return <>{children}</>;
}
