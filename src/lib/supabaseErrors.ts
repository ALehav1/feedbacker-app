/**
 * Classify Supabase/PostgREST errors into actionable categories.
 */

export type SupabaseErrorKind = 'not_found' | 'rls' | 'network' | 'schema' | 'unknown';

interface SupabaseErrorLike {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export function classifySupabaseError(error: SupabaseErrorLike | null): SupabaseErrorKind {
  if (!error) return 'unknown';

  const code = error.code || '';
  const message = (error.message || '').toLowerCase();

  // PostgREST: no rows returned for .single()
  if (code === 'PGRST116') return 'not_found';

  // RLS / permission errors
  if (
    code === '42501' ||
    message.includes('permission denied') ||
    message.includes('policy')
  ) {
    return 'rls';
  }

  // Network / fetch failures
  if (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('load failed')
  ) {
    return 'network';
  }

  // Schema mismatch (missing column, relation, etc.)
  if (
    code === '42703' ||
    code === '42P01' ||
    (message.includes('column') && message.includes('does not exist')) ||
    message.includes('schema cache') ||
    message.includes('could not find the')
  ) {
    return 'schema';
  }

  return 'unknown';
}
