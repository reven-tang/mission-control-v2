/**
 * useRoutingStats Hook
 * 路由统计数据实时刷新（5秒轮询，零依赖）
 */

import { useState, useEffect, useCallback } from 'react';

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

const DEFAULT_FALLBACK: RoutingStats = {
  totalRouted: 0,
  successCount: 0,
  failureCount: 0,
  successRate: 0,
  avgRoutingTime: 0,
  byDomain: {},
  recentRoutes: []
};

export function useRoutingStats(refreshInterval: number = 5000) {
  const [stats, setStats] = useState<RoutingStats>(DEFAULT_FALLBACK);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring/routing/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setStats(json.data || DEFAULT_FALLBACK);
      setIsError(false);
    } catch (e) {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(); // 立即执行一次
    const timer = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(timer);
  }, [fetchStats, refreshInterval]);

  return { stats, isLoading, isError, refresh: fetchStats };
}
