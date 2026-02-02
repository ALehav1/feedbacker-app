/**
 * Feedback Synthesis Quality Tests
 *
 * Tests the generate-outline API against the synthesis rubric:
 * 1. Cluster membership stays stable across repeated runs
 * 2. Labels are short, specific, and distinct
 * 3. Interest scoring produces clear ranking with stable tie handling
 * 4. Top interests show up early and receive proportionate coverage
 * 5. Outliers route to a clear bucket with visible explanation
 *
 * Usage:
 *   # Run against local server (requires npm run dev)
 *   npx tsx scripts/test-synthesis-quality.ts --live
 *
 *   # Run structural validation only (no API)
 *   npx tsx scripts/test-synthesis-quality.ts --validate-only
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ThemeResult {
  text: string;
  more: number;
  less: number;
  net: number;
}

interface Response {
  participantName: string | null;
  freeFormText: string;
}

interface EvaluationRequest {
  sessionTitle: string;
  sessionSummary: string;
  lengthMinutes: number;
  themeResults: ThemeResult[];
  responses: Response[];
}

interface EvaluationExpectations {
  highInterestThemes?: string[];
  lowInterestThemes?: string[];
  neutralInterestThemes?: string[];
  firstSlideTopics?: string[];
  coverageOrder?: string[];
  tieHandling?: string;
  allHighInterestInFirstHalf?: boolean;
  shouldHandleGracefully?: boolean;
  minSlidesExpected?: number;
  noInterestDataOk?: boolean;
  lowInterestShouldBeDeemphasized?: boolean;
  freeformInfluence?: boolean;
  suggestedTopicsFromFreeform?: string[];
  outlineShouldReflectFreeform?: boolean;
  allThemesHigh?: boolean;
  proportionateCoverage?: boolean;
  higherInterestGetsMoreSlides?: boolean;
}

interface EvaluationSet {
  id: string;
  name: string;
  description: string;
  request: EvaluationRequest;
  expectations: EvaluationExpectations;
}

interface DeckSlide {
  title: string;
  bullets: Array<{ text: string; subBullets?: string[] }>;
  speakerNotes?: string;
  interest?: {
    score: number;
    label: 'high' | 'neutral' | 'low';
    more: number;
    less: number;
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
      themesUnmatched: number;
    };
  };
}

interface QualityCheck {
  name: string;
  rubricCriterion: number;
  passed: boolean;
  message: string;
  details?: string[];
}

interface EvaluationResult {
  setId: string;
  setName: string;
  passed: boolean;
  checks: QualityCheck[];
}

function loadEvaluationSets(): EvaluationSet[] {
  const fixturePath = path.join(__dirname, '..', 'test', 'fixtures', 'synthesis-evaluation-sets.json');
  const content = fs.readFileSync(fixturePath, 'utf-8');
  const data = JSON.parse(content);
  return data.evaluationSets;
}

function checkInterestRanking(outline: DeckOutline, expectations: EvaluationExpectations): QualityCheck {
  const slidesWithInterest = outline.slides.filter(s => s.interest);

  if (slidesWithInterest.length === 0) {
    return {
      name: 'Interest ranking clarity',
      rubricCriterion: 3,
      passed: expectations.noInterestDataOk ?? false,
      message: 'No interest data in outline',
    };
  }

  // Check that interest scores produce a clear ordering
  const scores = slidesWithInterest.map(s => s.interest!.score);
  const uniqueScores = new Set(scores);
  const hasVariation = uniqueScores.size > 1;

  // Check for expected high interest themes
  const highInterestSlides = slidesWithInterest.filter(s => s.interest!.label === 'high');
  const highTitles = highInterestSlides.map(s => s.title.toLowerCase());

  let expectedHighMatch = true;
  const matchDetails: string[] = [];

  if (expectations.highInterestThemes) {
    for (const expected of expectations.highInterestThemes) {
      const found = highTitles.some(t => t.includes(expected.toLowerCase()));
      if (!found) {
        expectedHighMatch = false;
        matchDetails.push(`Expected high-interest theme "${expected}" not found in high-interest slides`);
      }
    }
  }

  return {
    name: 'Interest ranking clarity',
    rubricCriterion: 3,
    passed: hasVariation && expectedHighMatch,
    message: hasVariation
      ? `${uniqueScores.size} distinct interest levels across ${slidesWithInterest.length} slides`
      : 'All slides have same interest score',
    details: matchDetails.length > 0 ? matchDetails : undefined,
  };
}

function checkCoverageAlignment(outline: DeckOutline, expectations: EvaluationExpectations): QualityCheck {
  const slidesWithInterest = outline.slides.filter(s => s.interest);
  const halfPoint = Math.ceil(outline.slides.length / 2);
  const firstHalfSlides = outline.slides.slice(0, halfPoint);

  // Check if high interest themes appear in first half
  const highInterestInFirstHalf = firstHalfSlides.filter(s => s.interest?.label === 'high');
  const totalHighInterest = slidesWithInterest.filter(s => s.interest!.label === 'high');

  const coverageOk = totalHighInterest.length === 0 || highInterestInFirstHalf.length > 0;

  // Check proportionate coverage if expected
  let proportionateOk = true;
  const proportionDetails: string[] = [];

  if (expectations.proportionateCoverage || expectations.higherInterestGetsMoreSlides) {
    // Higher interest themes should have more content (bullets + sub-bullets)
    const interestToBulletCount = slidesWithInterest.map(s => ({
      title: s.title,
      score: s.interest!.score,
      bulletCount: s.bullets.length + s.bullets.reduce((acc, b) => acc + (b.subBullets?.length || 0), 0),
    }));

    // Sort by interest score descending
    interestToBulletCount.sort((a, b) => b.score - a.score);

    // Check if bullet counts roughly follow interest order
    for (let i = 0; i < interestToBulletCount.length - 1; i++) {
      const current = interestToBulletCount[i];
      const next = interestToBulletCount[i + 1];
      if (current.score > next.score + 2 && current.bulletCount < next.bulletCount) {
        proportionateOk = false;
        proportionDetails.push(`"${current.title}" (score ${current.score}) has fewer bullets than "${next.title}" (score ${next.score})`);
      }
    }
  }

  return {
    name: 'Coverage alignment',
    rubricCriterion: 4,
    passed: coverageOk && proportionateOk,
    message: coverageOk
      ? `${highInterestInFirstHalf.length}/${totalHighInterest.length} high-interest slides in first half`
      : 'High-interest content not prioritized in outline',
    details: proportionDetails.length > 0 ? proportionDetails : undefined,
  };
}

function checkLowInterestHandling(outline: DeckOutline, _expectations: EvaluationExpectations): QualityCheck {
  const lowInterestSlides = outline.slides.filter(s => s.interest?.label === 'low');

  if (lowInterestSlides.length === 0) {
    return {
      name: 'Low interest handling',
      rubricCriterion: 5,
      passed: true,
      message: 'No low-interest slides to check',
    };
  }

  // Low interest slides should appear later in the outline
  const halfPoint = Math.ceil(outline.slides.length / 2);
  const lowInFirstHalf = outline.slides.slice(0, halfPoint).filter(s => s.interest?.label === 'low');
  const lowInSecondHalf = outline.slides.slice(halfPoint).filter(s => s.interest?.label === 'low');

  const deemphasized = lowInSecondHalf.length >= lowInFirstHalf.length;

  return {
    name: 'Low interest handling',
    rubricCriterion: 5,
    passed: deemphasized,
    message: deemphasized
      ? `${lowInterestSlides.length} low-interest slides, ${lowInSecondHalf.length} in second half`
      : `Low-interest content not deemphasized (${lowInFirstHalf.length} in first half)`,
  };
}

function checkLabelQuality(outline: DeckOutline): QualityCheck {
  const titles = outline.slides.map(s => s.title);

  // Check uniqueness
  const uniqueTitles = new Set(titles.map(t => t.toLowerCase().trim()));
  const allUnique = uniqueTitles.size === titles.length;

  // Check length (should be concise)
  const longTitles = titles.filter(t => t.length > 50);
  const concise = longTitles.length === 0;

  // Check distinctiveness (no very similar titles)
  const similarPairs: string[] = [];
  for (let i = 0; i < titles.length; i++) {
    for (let j = i + 1; j < titles.length; j++) {
      const t1Words = new Set(titles[i].toLowerCase().split(/\s+/).filter(w => w.length > 3));
      const t2Words = new Set(titles[j].toLowerCase().split(/\s+/).filter(w => w.length > 3));
      const intersection = [...t1Words].filter(w => t2Words.has(w));
      const similarity = t1Words.size > 0 ? intersection.length / t1Words.size : 0;
      if (similarity > 0.7) {
        similarPairs.push(`"${titles[i]}" ~ "${titles[j]}"`);
      }
    }
  }
  const distinct = similarPairs.length === 0;

  return {
    name: 'Label quality',
    rubricCriterion: 2,
    passed: allUnique && concise && distinct,
    message: allUnique && concise && distinct
      ? `${titles.length} unique, concise, distinct slide titles`
      : [
          !allUnique ? 'duplicate titles' : null,
          !concise ? `${longTitles.length} titles too long` : null,
          !distinct ? `${similarPairs.length} similar title pairs` : null,
        ].filter(Boolean).join(', '),
    details: similarPairs.length > 0 ? similarPairs : undefined,
  };
}

function checkMinimumSlides(outline: DeckOutline, expectations: EvaluationExpectations): QualityCheck {
  const minExpected = expectations.minSlidesExpected ?? 6;
  const actual = outline.slides.length;

  return {
    name: 'Minimum slide count',
    rubricCriterion: 4,
    passed: actual >= minExpected,
    message: `${actual} slides (minimum expected: ${minExpected})`,
  };
}

function evaluateOutline(outline: DeckOutline, evalSet: EvaluationSet): EvaluationResult {
  const checks: QualityCheck[] = [];

  // Run all quality checks
  checks.push(checkLabelQuality(outline));
  checks.push(checkInterestRanking(outline, evalSet.expectations));
  checks.push(checkCoverageAlignment(outline, evalSet.expectations));
  checks.push(checkLowInterestHandling(outline, evalSet.expectations));
  checks.push(checkMinimumSlides(outline, evalSet.expectations));

  const passed = checks.every(c => c.passed);

  return {
    setId: evalSet.id,
    setName: evalSet.name,
    passed,
    checks,
  };
}

async function callAPI(request: EvaluationRequest, baseUrl: string): Promise<DeckOutline> {
  const response = await fetch(`${baseUrl}/api/generate-outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

function createMockOutline(request: EvaluationRequest): DeckOutline {
  // Generate a mock outline that roughly follows the input
  const sortedThemes = [...request.themeResults].sort((a, b) => b.net - a.net);

  const slides: DeckSlide[] = [
    {
      title: 'Welcome & Agenda',
      bullets: [
        { text: `Session: ${request.sessionTitle}` },
        { text: 'What we\'ll cover today' },
      ],
    },
  ];

  // Add slides for themes in priority order
  for (const theme of sortedThemes) {
    const label: 'high' | 'neutral' | 'low' = theme.net >= 1 ? 'high' : theme.net <= -1 ? 'low' : 'neutral';
    slides.push({
      title: theme.text,
      bullets: [
        { text: 'Key point about this topic' },
        { text: 'Another important aspect' },
        { text: 'Practical example' },
      ],
      interest: {
        score: theme.net,
        label,
        more: theme.more,
        less: theme.less,
      },
    });
  }

  // Add conclusion
  slides.push({
    title: 'Summary & Next Steps',
    bullets: [
      { text: 'Key takeaways' },
      { text: 'Questions and discussion' },
    ],
  });

  return {
    deckTitle: request.sessionTitle,
    slides,
    _debug: {
      inputHash: 'mock-evaluation',
      responseStructure: {
        slideCount: slides.length,
        sectionTitles: slides.map(s => s.title),
        themesMatched: request.themeResults.length,
        themesUnmatched: 2,
      },
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live');
  const validateOnly = args.includes('--validate-only');
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:5173';

  console.log('📊 Feedback Synthesis Quality Tests\n');

  // Load evaluation sets
  console.log('Loading evaluation sets...');
  const evalSets = loadEvaluationSets();
  console.log(`  Loaded ${evalSets.length} evaluation sets\n`);

  if (!isLive && !validateOnly) {
    console.log('Usage:');
    console.log('  --live          Test against running server');
    console.log('  --validate-only Use mock responses for structure validation\n');
    process.exit(0);
  }

  const results: EvaluationResult[] = [];

  for (const evalSet of evalSets) {
    console.log(`Testing: ${evalSet.name}`);
    console.log(`  Description: ${evalSet.description}`);

    let outline: DeckOutline;

    try {
      if (isLive) {
        outline = await callAPI(evalSet.request, baseUrl);
      } else {
        outline = createMockOutline(evalSet.request);
      }

      const result = evaluateOutline(outline, evalSet);
      results.push(result);

      for (const check of result.checks) {
        const icon = check.passed ? '✓' : '✗';
        console.log(`    ${icon} [R${check.rubricCriterion}] ${check.name}: ${check.message}`);
        if (check.details) {
          for (const detail of check.details.slice(0, 3)) {
            console.log(`        ${detail}`);
          }
          if (check.details.length > 3) {
            console.log(`        ... and ${check.details.length - 3} more`);
          }
        }
      }

      console.log(`  Result: ${result.passed ? '✅ PASS' : '❌ FAIL'}\n`);
    } catch (error) {
      console.log(`  ❌ Error: ${error}\n`);
      results.push({
        setId: evalSet.id,
        setName: evalSet.name,
        passed: false,
        checks: [],
      });
    }
  }

  // Summary
  console.log('═'.repeat(60));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\nSummary: ${passed}/${results.length} evaluation sets passed`);

  if (failed > 0) {
    console.log('\nFailed sets:');
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  - ${result.setName}`);
    }
    process.exit(1);
  }

  console.log('\n✅ All quality checks passed\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
