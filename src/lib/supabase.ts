/**
 * BASELINE_LOCK (Jan 18, 2026)
 * This module is part of the frozen baseline. Avoid edits unless fixing a confirmed bug.
 * If edits are required: keep diff minimal and document reason in docs/BASELINE_LOCK.md.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from '@/config'

// Version bump forces new client creation after config changes
const CLIENT_VERSION = 4

declare global {
  var __feedbackerSupabase: SupabaseClient | undefined
  var __feedbackerSupabaseVersion: number | undefined
  var __navigatorLocksDisabled: boolean | undefined
}

// Disable Navigator Lock API before Supabase checks for it
// This must happen before createClient is called
if (!globalThis.__navigatorLocksDisabled && typeof navigator !== 'undefined') {
  try {
    Object.defineProperty(navigator, 'locks', {
      get: () => undefined,
      configurable: true,
    })
    globalThis.__navigatorLocksDisabled = true
  } catch {
    // If we can't override, Supabase will use navigatorLock
    console.warn('Could not disable Navigator Lock API')
  }
}

// Force new client if version changed
if (globalThis.__feedbackerSupabaseVersion !== CLIENT_VERSION) {
  globalThis.__feedbackerSupabase = undefined
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

globalThis.__feedbackerSupabaseVersion = CLIENT_VERSION
