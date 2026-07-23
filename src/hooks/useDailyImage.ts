import { useMemo } from 'react';

export function useDailyImage(pool: string[]): string | null {
  return useMemo(() => {
    if (!pool || pool.length === 0) return null;
    const index = new Date().getDate() % pool.length;
    return pool[index] || null;
  }, [pool]);
}
