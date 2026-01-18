import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from '@/config'

declare global {
  // eslint-disable-next-line no-var
  var __feedbackerSupabase: SupabaseClient | undefined
}

// Custom storage that doesn't use Navigator Lock
const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(key)
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
  },
}

export const supabase: SupabaseClient =
  globalThis.__feedbackerSupabase ??
  (globalThis.__feedbackerSupabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'feedbacker-auth',
      storage: customStorage,
    },
  }))
