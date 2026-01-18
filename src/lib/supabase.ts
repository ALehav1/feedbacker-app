import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from '@/config'

declare global {
  // eslint-disable-next-line no-var
  var __feedbackerSupabase: SupabaseClient | undefined
}

// Singleton pattern - prevents multiple Supabase clients during HMR
export const supabase: SupabaseClient =
  globalThis.__feedbackerSupabase ??
  (globalThis.__feedbackerSupabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'feedbacker-auth',
    },
  }))

// Note: The "AbortError: signal is aborted" in console is cosmetic noise
// from Supabase's Navigator Lock during HMR. It doesn't break functionality.
