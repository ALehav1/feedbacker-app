import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from '@/config'

declare global {
  // eslint-disable-next-line no-var
  var __feedbackerSupabase: SupabaseClient | undefined
}

export const supabase: SupabaseClient =
  globalThis.__feedbackerSupabase ??
  (globalThis.__feedbackerSupabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'feedbacker-auth',
      // Disable Navigator Lock to prevent AbortError during Vite HMR
      // @ts-expect-error - lock option exists but not in TS types
      lock: false,
    },
  }))
