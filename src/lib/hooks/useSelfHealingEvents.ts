/**
 * useSelfHealingEvents Hook
 * 自愈事件流式订阅（SSE）
 */

import { useEffect, useState, useCallback } from 'react';

export interface SelfHealingEvent {
  id: string;
  taskId: string;
  agentId: string;
  action: 'retry' | 'reroute' | 'escalate' | 'abort';
  errorType: 'timeout' | 'capability_mismatch' | 'rate_limit' | 'internal_error' | 'unknown';
  retryCount: number;
  reason: string;
  timestamp: number;
  duration?: number; // 恢复耗时 ms
}

interface UseSelfHealingEventsOptions {
  onEvent?: (event: SelfHealingEvent) => void;
  maxEvents?: number; // 最多保留事件数
}

export function useSelfHealingEvents(
  url: string = '/api/monitoring/self-healing/events',
  options: UseSelfHealingEventsOptions = {}
) {
  const { onEvent, maxEvents = 100 } = options;
  const [events, setEvents] = useState<SelfHealingEvent[]>([]);
  const [connected, setConnected] = useState(false);

  const addEvent = useCallback((event: SelfHealingEvent) => {
    setEvents(prev => {
      const updated = [event, ...prev].slice(0, maxEvents);
      return updated;
    });
    onEvent?.(event);
  }, [maxEvents, onEvent]);

  useEffect(() => {
    // 开发环境：降级为 REST API 轮询
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(async () => {
        try {
          const res = await fetch('/api/monitoring/self-healing/events');
          if (res.ok) {
            const data = await res.json();
            setEvents(data.slice(0, maxEvents));
          }
        } catch (e) {
          // silent fail
        }
      }, 5000);
      return () => clearInterval(interval);
    }

    // 生产环境：使用 EventSource
    const eventSource = new EventSource(url);

    eventSource.addEventListener('open', () => {
      setConnected(true);
    });

    eventSource.addEventListener('event', (e: MessageEvent) => {
      try {
        const event: SelfHealingEvent = JSON.parse(e.data);
        addEvent(event);
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    });

    eventSource.addEventListener('error', () => {
      setConnected(false);
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [url, maxEvents, addEvent]);

  // 统计数据
  const stats = {
    total: events.length,
    retry: events.filter(e => e.action === 'retry').length,
    reroute: events.filter(e => e.action === 'reroute').length,
    escalate: events.filter(e => e.action === 'escalate').length,
    abort: events.filter(e => e.action === 'abort').length,
    successRate: events.length > 0
      ? (events.filter(e => e.action !== 'abort').length / events.length * 100).toFixed(1) + '%'
      : '0%',
    avgRecoveryTime: events.length > 0
      ? Math.round(events.reduce((sum, e) => sum + (e.duration || 0), 0) / events.length)
      : 0
  };

  return {
    events,
    stats,
    connected,
    clear: () => setEvents([])
  };
}
