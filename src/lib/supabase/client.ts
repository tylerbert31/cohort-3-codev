import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/**
 * Public browser-safe Supabase client for client-side queries and Realtime subscriptions.
 * Enforces RLS policies at the database boundary.
 */
export const createBrowserClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
};
