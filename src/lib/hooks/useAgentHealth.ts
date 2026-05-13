/**
 * useAgentHealth Hook
 * 实时智能体健康状态 WebSocket Hook
 */

import { useEffect, useState, useCallback } from 'react';

interface AgentHealth {
  agentId: string;
  status: 'online' | 'offline' | 'busy';
  cpu: number;
  memory: number;
  lastSeen: number;
  tasksCompleted: number;
  tasksFailed: number;
}

interface UseAgentHealthOptions {
  reconnectInterval?: number;
  onAgentUpdate?: (agent: AgentHealth) => void;
}

export function useAgentHealth(
  url: string = '/api/monitoring/agents/ws',
  options: UseAgentHealthOptions = {}
) {
  const { reconnectInterval = 3000, onAgentUpdate } = options;
  const [agents, setAgents] = useState<Record<string, AgentHealth>>({});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    try {
      // 使用 EventSource 兼容模式（开发环境 fallback）
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}${url}`;
      
      // 开发环境降级：使用 REST API 轮询
      if (process.env.NODE_ENV === 'development') {
        fetchAgentHealthFallback();
        return;
      }

      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setConnected(true);
        setError(null);
        console.log('[WebSocket] Connected to agent health stream');
      };

      ws.onmessage = (event) => {
        try {
          const data: AgentHealth = JSON.parse(event.data);
          setAgents(prev => {
            const updated = { ...prev, [data.agentId]: data };
            onAgentUpdate?.(data);
            return updated;
          });
        } catch (e) {
          console.error('[WebSocket] Parse error:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, reconnectInterval);
      };

      ws.onerror = (err) => {
        setError('WebSocket connection failed');
        ws.close();
      };

      (window as any).__agentHealthWs = ws;
    } catch (e) {
      setError('Failed to create WebSocket');
      fetchAgentHealthFallback();
    }
  }, [url, reconnectInterval, onAgentUpdate]);

  // 开发环境 fallback：使用 REST API
  const fetchAgentHealthFallback = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
        setConnected(true);
      }
    } catch (e) {
      setError('Failed to fetch agent health');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      const ws = (window as any).__agentHealthWs;
      if (ws) ws.close();
    };
  }, [connect]);

  const agentList = Object.values(agents);
  const onlineCount = agentList.filter(a => a.status === 'online').length;
  const busyCount = agentList.filter(a => a.status === 'busy').length;

  return {
    agents,
    agentList,
    onlineCount,
    busyCount,
    totalCount: agentList.length,
    connected,
    error,
    refresh: fetchAgentHealthFallback
  };
}
