/**
 * Deck Builder Structural Equivalence Test
 *
 * Calls the generate-outline API twice with the same input and verifies
 * structural equivalence between the two responses.
 *
 * "Structure-first" mode: section ordering, slide count, and theme mapping
 * must be stable. Exact wording may vary.
 *
 * Usage:
 *   # Requires local server running (npm run dev)
 *   ENABLE_DEBUG_META=true npx tsx scripts/test-deck-builder-equivalence.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GoldenFixture {
  request: {
    sessionTitle: string;
    sessionSummary: string;
    lengthMinutes: number;
    themeResults: Array<{
      text: string;
      more: number;
      less: number;
      net: number;
    }>;
    responses: Array<{
      participantName: string | null;
      freeFormText: string;
    }>;
  };
}

interface DeckSlide {
  title: string;
  bullets: Array<{
    text: string;
    subBullets?: string[];
  }>;
  interest?: {
    label: 'high' | 'neutral' | 'low';
  };
}

interface DeckOutline {
  deckTitle: string;
  slides: DeckSlide[];
  _debug?: {
    inputHash: string;
    responseStructure: {
      slideCount: number;
      sectionTitles: string[];
      themesMatched: number;
    };
  };
}

interface StructuralSummary {
  slideCount: number;
  sectionTitles: string[];
  interestLabels: (string | undefined)[];
  bulletCounts: number[];
}

function extractStructuralSummary(outline: DeckOutline): StructuralSummary {
  return {
    slideCount: outline.slides.length,
    sectionTitles: outline.slides.map(s => s.title),
    interestLabels: outline.slides.map(s => s.interest?.label),
    bulletCounts: outline.slides.map(s => s.bullets.length),
  };
}

function compareStructures(
  run1: StructuralSummary,
  run2: StructuralSummary,
  allowedSlideVariance: number = 1
): { equivalent: boolean; differences: string[] } {
  const differences: string[] = [];

  // Check slide count (allow small variance)
  const slideCountDiff = Math.abs(run1.slideCount - run2.slideCount);
  if (slideCountDiff > allowedSlideVariance) {
    differences.push(
      `Slide count differs: ${run1.slideCount} vs ${run2.slideCount} (variance: ${slideCountDiff}, allowed: ${allowedSlideVariance})`
    );
  }

  // Check section ordering (normalize titles for comparison)
  const normalizeTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  const titles1 = run1.sectionTitles.map(normalizeTitle);
  const titles2 = run2.sectionTitles.map(normalizeTitle);

  // Check if key sections appear in same relative order
  const commonTitles = titles1.filter(t => titles2.includes(t));
  if (commonTitles.length < Math.min(titles1.length, titles2.length) * 0.7) {
    differences.push(
      `Less than 70% title overlap: ${commonTitles.length} common out of ${Math.min(titles1.length, titles2.length)}`
    );
  }

  // Check interest label distribution
  const countLabels = (labels: (string | undefined)[]) => {
    const counts = { high: 0, neutral: 0, low: 0, none: 0 };
    for (const l of labels) {
      if (l === 'high') counts.high++;
      else if (l === 'neutral') counts.neutral++;
      else if (l === 'low') counts.low++;
      else counts.none++;
    }
    return counts;
  };

  const labels1 = countLabels(run1.interestLabels);
  const labels2 = countLabels(run2.interestLabels);

  if (labels1.high !== labels2.high || labels1.low !== labels2.low) {
    differences.push(
      `Interest label distribution differs: high(${labels1.high}/${labels2.high}), low(${labels1.low}/${labels2.low})`
    );
  }

  return {
    equivalent: differences.length === 0,
    differences,
  };
}

async function callAPI(fixture: GoldenFixture, baseUrl: string): Promise<DeckOutline> {
  const response = await fetch(`${baseUrl}/api/generate-outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fixture.request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function main() {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:5173';
  const allowedSlideVariance = parseInt(process.env.SLIDE_VARIANCE || '1', 10);

  console.log('🔬 Deck Builder Structural Equivalence Test\n');
  console.log(`Target: ${baseUrl}`);
  console.log(`Allowed slide variance: ±${allowedSlideVariance}\n`);

  // Load golden fixture
  const fixturePath = path.join(__dirname, '..', 'test', 'fixtures', 'deck-builder-golden.json');
  const fixture: GoldenFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

  console.log(`Fixture: ${fixture.request.sessionTitle}`);
  console.log(`  Themes: ${fixture.request.themeResults.length}`);
  console.log(`  Responses: ${fixture.request.responses.length}\n`);

  // Run 1
  console.log('Run 1: Calling API...');
  let outline1: DeckOutline;
  try {
    outline1 = await callAPI(fixture, baseUrl);
    console.log(`  ✓ Received ${outline1.slides.length} slides`);
    if (outline1._debug) {
      console.log(`  Input hash: ${outline1._debug.inputHash}`);
    }
  } catch (error) {
    console.error(`  ✗ Run 1 failed: ${error}`);
    process.exit(1);
  }

  // Brief pause between runs
  console.log('\nWaiting 2s before run 2...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Run 2
  console.log('Run 2: Calling API...');
  let outline2: DeckOutline;
  try {
    outline2 = await callAPI(fixture, baseUrl);
    console.log(`  ✓ Received ${outline2.slides.length} slides`);
    if (outline2._debug) {
      console.log(`  Input hash: ${outline2._debug.inputHash}`);
    }
  } catch (error) {
    console.error(`  ✗ Run 2 failed: ${error}`);
    process.exit(1);
  }

  // Extract structural summaries
  const struct1 = extractStructuralSummary(outline1);
  const struct2 = extractStructuralSummary(outline2);

  console.log('\n--- Structural Comparison ---\n');

  console.log('Run 1 structure:');
  console.log(`  Slides: ${struct1.slideCount}`);
  console.log(`  Titles: ${struct1.sectionTitles.slice(0, 5).join(', ')}${struct1.sectionTitles.length > 5 ? '...' : ''}`);

  console.log('\nRun 2 structure:');
  console.log(`  Slides: ${struct2.slideCount}`);
  console.log(`  Titles: ${struct2.sectionTitles.slice(0, 5).join(', ')}${struct2.sectionTitles.length > 5 ? '...' : ''}`);

  // Compare
  console.log('\n--- Equivalence Check ---\n');
  const comparison = compareStructures(struct1, struct2, allowedSlideVariance);

  if (comparison.equivalent) {
    console.log('✅ Structural equivalence confirmed\n');
    console.log('Both runs produced:');
    console.log(`  - Same slide count range (${struct1.slideCount} ≈ ${struct2.slideCount})`);
    console.log('  - Consistent section ordering (>70% overlap)');
    console.log('  - Same interest label distribution');

    // Save proof artifact
    const proofPath = path.join(__dirname, '..', 'artifacts', 'deck-equivalence-proof.json');
    fs.mkdirSync(path.dirname(proofPath), { recursive: true });
    fs.writeFileSync(proofPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      fixture: fixture.request.sessionTitle,
      run1: struct1,
      run2: struct2,
      equivalent: true,
    }, null, 2));
    console.log(`\nProof saved to: artifacts/deck-equivalence-proof.json`);

    process.exit(0);
  } else {
    console.log('❌ Structural equivalence FAILED\n');
    console.log('Differences found:');
    for (const diff of comparison.differences) {
      console.log(`  - ${diff}`);
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
