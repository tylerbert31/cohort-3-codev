'use server';

import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/db/supabase-admin';
import { sanitizeProfileSync } from '@/server/auth/authorization';
import type { Profile } from '@/types/database';

export interface SyncProfileResult {
  success: boolean;
  profile?: Profile;
  error?: string;
}

/**
 * Trusted server action to synchronize the currently authenticated Clerk user with Supabase.
 * Derives user identity exclusively from the Clerk server SDK.
 */
export async function syncUserProfile(): Promise<SyncProfileResult> {
  try {
    const user = await currentUser();

    if (!user || !user.id) {
      return { success: false, error: 'Unauthorized: No active session' };
    }

    const payload = sanitizeProfileSync({
      clerk_user_id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      image_url: user.imageUrl,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin.from('profiles') as any)
      .upsert(
        {
          clerk_user_id: payload.clerk_user_id,
          first_name: payload.first_name,
          last_name: payload.last_name,
          image_url: payload.image_url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'clerk_user_id' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('Profile synchronization database error:', error.message);
      return { success: false, error: 'Failed to synchronize user profile' };
    }

    return { success: true, profile: data as Profile };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error during profile sync';
    console.error('Profile sync caught unexpected exception:', message);
    return { success: false, error: 'Profile synchronization failed' };
  }
}
