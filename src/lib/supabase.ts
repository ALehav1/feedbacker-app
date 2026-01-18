import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from '@/config'

// Disable Navigator Lock API to prevent AbortError during Vite HMR
// This is safe - the lock is only used to prevent concurrent token refreshes
// across tabs, which isn't critical for development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // @ts-expect-error - intentionally disabling navigator.locks in dev
  window.navigator.locks = undefined
}

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
    },
  }))
