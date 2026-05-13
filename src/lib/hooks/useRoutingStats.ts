/**
 * useRoutingStats Hook
 * 路由统计数据实时刷新（SWR）
 */

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface RoutingStats {
  totalRouted: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgRoutingTime: number;
  byDomain: Record<string, { count: number; success: number; failed: number }>;
  recentRoutes: Array<{
    taskId: string;
    agentId: string;
    domain: string;
    success: boolean;
    duration: number;
    timestamp: number;
  }>;
}

export function useRoutingStats(refreshInterval: number = 5000) {
  const { data, error, isLoading, mutate } = useSWR<RoutingStats>(
    '/api/monitoring/routing/stats',
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      fallbackData: {
        totalRouted: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgRoutingTime: 0,
        byDomain: {},
        recentRoutes: []
      }
    }
  );

  return {
    stats: data,
    isLoading,
    isError: !!error,
    refresh: () => mutate()
  };
}
