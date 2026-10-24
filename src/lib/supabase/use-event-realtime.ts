'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createBrowserClient } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UseRealtimeEventOptions {
  eventId: string;
  onRefresh?: () => void;
}

export function useEventRealtime({ eventId, onRefresh }: UseRealtimeEventOptions) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isAvailable = Boolean(
    url &&
    !url.includes('placeholder') &&
    anonKey &&
    !anonKey.includes('placeholder')
  );

  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'idle'>(
    isAvailable ? 'connecting' : 'idle'
  );
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const localBcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  const broadcastUpdate = useCallback(() => {
    // 1. Send via Supabase WebSocket broadcast (across tabs, browsers, and devices)
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'event_updated',
          payload: { eventId, timestamp: Date.now() },
        });
      } catch (err) {
        console.warn('Realtime broadcast error:', err);
      }
    }

    // 2. Send via local BroadcastChannel (instant zero-latency sync across tabs in same browser)
    try {
      if (localBcRef.current) {
        localBcRef.current.postMessage({
          event: 'event_updated',
          timestamp: Date.now(),
        });
      }
    } catch {
      // Ignore
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;

    // Set up local BroadcastChannel for same-browser multi-tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(`event_realtime_${eventId}`);
        bc.onmessage = (msg) => {
          if (msg.data?.event === 'event_updated') {
            onRefreshRef.current?.();
          }
        };
        localBcRef.current = bc;
      } catch {
        // Fallback gracefully if BroadcastChannel is unsupported
      }
    }

    // Set up visibilitychange sync (when user switches back to tab, refresh)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onRefreshRef.current?.();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic background sync fallback (every 10s when tab is active)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        onRefreshRef.current?.();
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      if (localBcRef.current) {
        try {
          localBcRef.current.close();
        } catch {
          // Ignore
        }
        localBcRef.current = null;
      }
    };
  }, [eventId]);

  useEffect(() => {
    if (!isAvailable || !eventId) {
      return;
    }

    const supabase = createBrowserClient();
    const channelName = `realtime:event:${eventId}`;

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { ack: false, self: false },
        },
      })
      .on('broadcast', { event: 'event_updated' }, () => {
        onRefreshRef.current?.();
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklist_items', filter: `event_id=eq.${eventId}` },
        () => {
          onRefreshRef.current?.();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklist_sections', filter: `event_id=eq.${eventId}` },
        () => {
          onRefreshRef.current?.();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_events', filter: `event_id=eq.${eventId}` },
        () => {
          onRefreshRef.current?.();
        }
      )
      .subscribe((subscribeStatus) => {
        if (subscribeStatus === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (subscribeStatus === 'CHANNEL_ERROR' || subscribeStatus === 'TIMED_OUT') {
          setStatus('disconnected');
        } else {
          setStatus('connecting');
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [eventId, isAvailable]);

  return { status, broadcastUpdate };
}
