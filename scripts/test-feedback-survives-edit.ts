/**
 * Regression Test: Participant Feedback Survives Topic Edits
 *
 * Proves that the diff-based theme save preserves participant feedback
 * (theme_selections) for surviving themes when topics are edited.
 *
 * What this tests:
 *   1. Rename a theme → feedback preserved (same theme ID)
 *   2. Reorder themes → feedback preserved (same theme IDs)
 *   3. Add a new theme → existing feedback unchanged
 *   4. Remove a theme → soft-deleted (is_active=false), other feedback unchanged
 *   5. Per-theme more/less/neutral aggregates match pre-edit values
 *
 * Usage:
 *   # Requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars
 *   # (service key bypasses RLS for test data seeding)
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/test-feedback-survives-edit.ts
 *
 * Or with .env file:
 *   source .env && SUPABASE_URL=$VITE_SUPABASE_URL SUPABASE_SERVICE_KEY=... npx tsx scripts/test-feedback-survives-edit.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.');
  console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/test-feedback-survives-edit.ts');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface FeedbackAggregate {
  themeId: string;
  more: number;
  less: number;
  neutral: number; // responses that did not select this theme
}

async function getAggregates(sessionId: string, themeIds: string[]): Promise<FeedbackAggregate[]> {
  // Get total response count for neutral calculation
  const { data: responsesData } = await supabase
    .from('responses')
    .select('id')
    .eq('session_id', sessionId);

  const totalResponses = responsesData?.length || 0;

  const aggregates: FeedbackAggregate[] = [];

  for (const themeId of themeIds) {
    const { data: selections } = await supabase
      .from('theme_selections')
      .select('selection')
      .eq('theme_id', themeId);

    const more = (selections || []).filter(s => s.selection === 'more').length;
    const less = (selections || []).filter(s => s.selection === 'less').length;
    const neutral = totalResponses - more - less;

    aggregates.push({ themeId, more, less, neutral });
  }

  return aggregates;
}

async function cleanup(sessionId: string) {
  // Delete session (cascades to themes, responses, theme_selections)
  await supabase.from('sessions').delete().eq('id', sessionId);
}

async function main() {
  console.log('=== Feedback Preservation Regression Test ===\n');

  const testSessionId = crypto.randomUUID();
  const testPresenterId = crypto.randomUUID();
  const testSlug = `test-${Date.now().toString(36)}`;

  // --- SEED TEST DATA ---

  console.log('1. Seeding test data...');

  // Create a test presenter
  const { error: presenterError } = await supabase
    .from('presenters')
    .insert({
      id: testPresenterId,
      email: `test-${Date.now()}@feedbacker-test.local`,
      name: 'Test Presenter',
      organization: 'Test Org',
    });

  if (presenterError) {
    console.error('  Failed to create test presenter:', presenterError.message);
    console.error('  (If using anon key, you may need a service role key to bypass RLS)');
    process.exit(1);
  }

  // Create a test session
  const { error: sessionError } = await supabase
    .from('sessions')
    .insert({
      id: testSessionId,
      presenter_id: testPresenterId,
      state: 'active',
      length_minutes: 30,
      title: 'Feedback Survival Test',
      slug: testSlug,
      welcome_message: 'Test welcome',
      summary_condensed: 'Test overview',
      summary_full: 'Test outline',
      published_welcome_message: 'Test welcome',
      published_summary_condensed: 'Test overview',
      published_at: new Date().toISOString(),
      has_unpublished_changes: false,
    });

  if (sessionError) {
    console.error('  Failed to create test session:', sessionError.message);
    await cleanup(testSessionId);
    process.exit(1);
  }

  // Create 4 themes
  const themeA = crypto.randomUUID();
  const themeB = crypto.randomUUID();
  const themeC = crypto.randomUUID();
  const themeD = crypto.randomUUID();

  const { error: themesError } = await supabase
    .from('themes')
    .insert([
      { id: themeA, session_id: testSessionId, text: 'Theme Alpha', sort_order: 1, is_active: true },
      { id: themeB, session_id: testSessionId, text: 'Theme Beta', sort_order: 2, is_active: true },
      { id: themeC, session_id: testSessionId, text: 'Theme Charlie', sort_order: 3, is_active: true },
      { id: themeD, session_id: testSessionId, text: 'Theme Delta', sort_order: 4, is_active: true },
    ]);

  if (themesError) {
    console.error('  Failed to create themes:', themesError.message);
    await cleanup(testSessionId);
    process.exit(1);
  }

  // Create 3 participant responses with various selections
  const resp1 = crypto.randomUUID();
  const resp2 = crypto.randomUUID();
  const resp3 = crypto.randomUUID();

  const { error: responsesError } = await supabase
    .from('responses')
    .insert([
      { id: resp1, session_id: testSessionId, participant_email: 'p1@test.local' },
      { id: resp2, session_id: testSessionId, participant_email: 'p2@test.local' },
      { id: resp3, session_id: testSessionId, participant_email: 'p3@test.local' },
    ]);

  if (responsesError) {
    console.error('  Failed to create responses:', responsesError.message);
    await cleanup(testSessionId);
    process.exit(1);
  }

  // Create theme_selections:
  //   Theme A: 2 more, 1 less (net +1)
  //   Theme B: 1 more, 0 less (net +1)
  //   Theme C: 0 more, 2 less (net -2)
  //   Theme D: 3 more, 0 less (net +3) — will be removed
  const { error: selectionsError } = await supabase
    .from('theme_selections')
    .insert([
      // Theme A: 2 more, 1 less
      { response_id: resp1, theme_id: themeA, selection: 'more' },
      { response_id: resp2, theme_id: themeA, selection: 'more' },
      { response_id: resp3, theme_id: themeA, selection: 'less' },
      // Theme B: 1 more
      { response_id: resp1, theme_id: themeB, selection: 'more' },
      // Theme C: 2 less
      { response_id: resp2, theme_id: themeC, selection: 'less' },
      { response_id: resp3, theme_id: themeC, selection: 'less' },
      // Theme D: 3 more (will be removed in edit)
      { response_id: resp1, theme_id: themeD, selection: 'more' },
      { response_id: resp2, theme_id: themeD, selection: 'more' },
      { response_id: resp3, theme_id: themeD, selection: 'more' },
    ]);

  if (selectionsError) {
    console.error('  Failed to create selections:', selectionsError.message);
    await cleanup(testSessionId);
    process.exit(1);
  }

  console.log('  Seeded: 4 themes, 3 responses, 9 selections\n');

  // --- CAPTURE PRE-EDIT AGGREGATES ---

  console.log('2. Capturing pre-edit feedback aggregates...');
  const preEditAggregates = await getAggregates(testSessionId, [themeA, themeB, themeC, themeD]);

  for (const agg of preEditAggregates) {
    const label = agg.themeId === themeA ? 'A' : agg.themeId === themeB ? 'B' : agg.themeId === themeC ? 'C' : 'D';
    console.log(`  Theme ${label}: more=${agg.more} less=${agg.less} neutral=${agg.neutral}`);
  }
  console.log();

  // --- SIMULATE DIFF-BASED EDIT SAVE ---

  console.log('3. Simulating diff-based theme edit...');
  console.log('   - Theme A: rename "Alpha" → "Alpha Renamed"');
  console.log('   - Theme B: keep unchanged');
  console.log('   - Theme C: reorder from 3 → 4');
  console.log('   - Theme D: REMOVE (soft-delete)');
  console.log('   - Theme E: ADD new theme at position 3');

  const themeE = crypto.randomUUID();

  // Step 1: Soft-delete removed themes (Theme D)
  const { error: deactivateError } = await supabase
    .from('themes')
    .update({ is_active: false })
    .eq('id', themeD);

  if (deactivateError) {
    console.error('  Soft-delete failed:', deactivateError.message);
    await cleanup(testSessionId);
    process.exit(1);
  }

  // Step 2: Two-pass reorder — move surviving themes to negative sort_order
  for (const t of [
    { id: themeA, finalOrder: 1 },
    { id: themeB, finalOrder: 2 },
    { id: themeC, finalOrder: 4 },
  ]) {
    await supabase.from('themes').update({ sort_order: -(t.finalOrder + 1000) }).eq('id', t.id);
  }

  // Step 3: Move surviving themes to final sort_order + update text
  for (const t of [
    { id: themeA, text: 'Theme Alpha Renamed', finalOrder: 1 },
    { id: themeB, text: 'Theme Beta', finalOrder: 2 },
    { id: themeC, text: 'Theme Charlie', finalOrder: 4 },
  ]) {
    await supabase.from('themes').update({ text: t.text, sort_order: t.finalOrder }).eq('id', t.id);
  }

  // Step 4: Insert new theme
  await supabase.from('themes').insert({
    id: themeE,
    session_id: testSessionId,
    text: 'Theme Echo (new)',
    sort_order: 3,
    is_active: true,
  });

  console.log('  Edit save complete.\n');

  // --- VERIFY POST-EDIT STATE ---

  console.log('4. Verifying post-edit state...\n');
  let allPassed = true;

  // Check 1: Surviving themes' feedback aggregates unchanged
  const postEditAggregates = await getAggregates(testSessionId, [themeA, themeB, themeC]);
  const preEditMap = new Map(preEditAggregates.map(a => [a.themeId, a]));

  for (const postAgg of postEditAggregates) {
    const preAgg = preEditMap.get(postAgg.themeId);
    if (!preAgg) continue;

    const label = postAgg.themeId === themeA ? 'A (renamed)' : postAgg.themeId === themeB ? 'B (unchanged)' : 'C (reordered)';
    const match = postAgg.more === preAgg.more && postAgg.less === preAgg.less && postAgg.neutral === preAgg.neutral;

    if (match) {
      console.log(`  ✓ Theme ${label}: more=${postAgg.more} less=${postAgg.less} neutral=${postAgg.neutral} — PRESERVED`);
    } else {
      console.log(`  ✗ Theme ${label}: expected more=${preAgg.more}/less=${preAgg.less}/neutral=${preAgg.neutral}, got more=${postAgg.more}/less=${postAgg.less}/neutral=${postAgg.neutral} — LOST`);
      allPassed = false;
    }
  }

  // Check 2: Removed theme is soft-deleted
  const { data: removedTheme } = await supabase
    .from('themes')
    .select('id, is_active')
    .eq('id', themeD)
    .single();

  if (removedTheme && removedTheme.is_active === false) {
    console.log('  ✓ Theme D: is_active=false — SOFT-DELETED');
  } else {
    console.log(`  ✗ Theme D: expected is_active=false, got ${removedTheme?.is_active ?? 'missing'}`);
    allPassed = false;
  }

  // Check 3: Removed theme's selections still exist (not cascaded)
  const removedAgg = await getAggregates(testSessionId, [themeD]);
  if (removedAgg[0].more === 3 && removedAgg[0].less === 0) {
    console.log('  ✓ Theme D: selections preserved (3 more, 0 less) despite deactivation');
  } else {
    console.log(`  ✗ Theme D: expected 3 more/0 less, got ${removedAgg[0].more}/${removedAgg[0].less}`);
    allPassed = false;
  }

  // Check 4: New theme has is_active=true
  const { data: newTheme } = await supabase
    .from('themes')
    .select('id, is_active')
    .eq('id', themeE)
    .single();

  if (newTheme && newTheme.is_active === true) {
    console.log('  ✓ Theme E: is_active=true — NEW THEME ACTIVE');
  } else {
    console.log(`  ✗ Theme E: expected is_active=true, got ${newTheme?.is_active ?? 'missing'}`);
    allPassed = false;
  }

  // Check 5: Only active themes appear when querying with is_active filter
  const { data: activeThemes } = await supabase
    .from('themes')
    .select('id')
    .eq('session_id', testSessionId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const activeCount = activeThemes?.length || 0;
  if (activeCount === 4) {
    console.log(`  ✓ Active theme count: ${activeCount} (A, B, E, C) — CORRECT`);
  } else {
    console.log(`  ✗ Active theme count: expected 4, got ${activeCount}`);
    allPassed = false;
  }

  // --- CLEANUP ---

  console.log('\n5. Cleaning up test data...');
  await cleanup(testSessionId);
  // Also clean up the test presenter
  await supabase.from('presenters').delete().eq('id', testPresenterId);
  console.log('  Done.\n');

  // --- SUMMARY ---

  console.log('=== Summary ===');
  if (allPassed) {
    console.log('✓ All checks passed: Participant feedback survives topic edits.');
    process.exit(0);
  } else {
    console.log('✗ Some checks FAILED: Feedback data was lost during edits.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
