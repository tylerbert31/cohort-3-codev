'use client';

import { useEffect, useState, useRef } from 'react';
import { createBrowserClient } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UseRealtimeEventOptions {
  eventId: string;
  onRefresh?: () => void;
}

export function useEventRealtime({ eventId, onRefresh }: UseRealtimeEventOptions) {
  const isAvailable = Boolean(
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  );

  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'idle'>(
    isAvailable ? 'connecting' : 'idle'
  );
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isAvailable) {
      return;
    }

    const supabase = createBrowserClient();
    const channelName = `realtime:event:${eventId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklist_items', filter: `event_id=eq.${eventId}` },
        () => {
          onRefresh?.();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklist_sections', filter: `event_id=eq.${eventId}` },
        () => {
          onRefresh?.();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_events', filter: `event_id=eq.${eventId}` },
        () => {
          onRefresh?.();
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
    };
  }, [eventId, isAvailable, onRefresh]);

  return { status };
}
