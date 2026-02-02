/**
 * Deck Builder Structural Test
 *
 * Validates that the generate-outline API produces structurally valid responses
 * against the golden fixture. Can test against a live server or validate mock responses.
 *
 * Usage:
 *   # Test against local server (requires npm run dev in another terminal)
 *   ENABLE_DEBUG_META=true npx tsx scripts/test-deck-builder-structure.ts --live
 *
 *   # Validate structure only (no API call)
 *   npx tsx scripts/test-deck-builder-structure.ts --validate-only
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GoldenFixture {
  description: string;
  metadata: {
    sourceSessionSlug: string;
    createdAt: string;
    version: number;
  };
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
  expectedStructure: {
    minSlides: number;
    maxSlides: number;
    requiredSections: string[];
    interestMapping: {
      high: string[];
      neutral: string[];
      low: string[];
    };
    coverageExpectations: {
      highInterestThemesShouldAppearInFirstHalf: boolean;
      allThemesShouldBeAddressed: boolean;
      freeformFeedbackShouldInfluenceContent: boolean;
    };
  };
  validationRules: {
    slideTitlesMustBeUnique: boolean;
    bulletsPerSlide: { min: number; max: number };
    subBulletsAllowed: boolean;
    speakerNotesOptional: boolean;
  };
}

interface DeckSlide {
  title: string;
  bullets: Array<{
    text: string;
    subBullets?: string[];
  }>;
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
    modelParams: {
      model: string;
      temperature: number;
      maxTokens: number;
    };
    responseStructure: {
      slideCount: number;
      sectionTitles: string[];
      themesMatched: number;
      themesUnmatched: number;
    };
    timing: {
      apiCallMs: number;
      totalMs: number;
    };
  };
}

interface ValidationResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
}

function loadGoldenFixture(): GoldenFixture {
  const fixturePath = path.join(__dirname, '..', 'test', 'fixtures', 'deck-builder-golden.json');
  const content = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(content);
}

function validateOutlineStructure(outline: DeckOutline, fixture: GoldenFixture): ValidationResult {
  const checks: ValidationResult['checks'] = [];

  // Check 1: Deck title exists
  checks.push({
    name: 'deckTitle exists',
    passed: typeof outline.deckTitle === 'string' && outline.deckTitle.length > 0,
    message: outline.deckTitle ? `Title: "${outline.deckTitle}"` : 'Missing deck title',
  });

  // Check 2: Slides array exists
  checks.push({
    name: 'slides array exists',
    passed: Array.isArray(outline.slides),
    message: Array.isArray(outline.slides) ? `${outline.slides.length} slides` : 'slides is not an array',
  });

  if (!Array.isArray(outline.slides)) {
    return { passed: false, checks };
  }

  // Check 3: Slide count within expected range
  const { minSlides, maxSlides } = fixture.expectedStructure;
  const slideCount = outline.slides.length;
  checks.push({
    name: 'slide count in range',
    passed: slideCount >= minSlides && slideCount <= maxSlides,
    message: `${slideCount} slides (expected ${minSlides}-${maxSlides})`,
  });

  // Check 4: All slides have titles
  const slidesWithTitles = outline.slides.filter(s => typeof s.title === 'string' && s.title.length > 0);
  checks.push({
    name: 'all slides have titles',
    passed: slidesWithTitles.length === outline.slides.length,
    message: `${slidesWithTitles.length}/${outline.slides.length} slides have titles`,
  });

  // Check 5: Unique slide titles (if required)
  if (fixture.validationRules.slideTitlesMustBeUnique) {
    const titles = outline.slides.map(s => s.title.toLowerCase().trim());
    const uniqueTitles = new Set(titles);
    checks.push({
      name: 'slide titles are unique',
      passed: uniqueTitles.size === titles.length,
      message: uniqueTitles.size === titles.length
        ? 'All titles unique'
        : `${titles.length - uniqueTitles.size} duplicate titles`,
    });
  }

  // Check 6: Bullets per slide within range
  const { min: minBullets, max: maxBullets } = fixture.validationRules.bulletsPerSlide;
  const bulletValidation = outline.slides.map((s, i) => {
    const bulletCount = s.bullets?.length || 0;
    return {
      index: i,
      title: s.title,
      bulletCount,
      valid: bulletCount >= minBullets && bulletCount <= maxBullets,
    };
  });
  const invalidBulletSlides = bulletValidation.filter(b => !b.valid);
  checks.push({
    name: 'bullets per slide in range',
    passed: invalidBulletSlides.length === 0,
    message: invalidBulletSlides.length === 0
      ? `All slides have ${minBullets}-${maxBullets} bullets`
      : `${invalidBulletSlides.length} slides outside range: ${invalidBulletSlides.map(s => `"${s.title}" (${s.bulletCount})`).join(', ')}`,
  });

  // Check 7: Bullets have text
  const bulletsWithText = outline.slides.flatMap(s => s.bullets || []).filter(b => typeof b.text === 'string' && b.text.length > 0);
  const totalBullets = outline.slides.flatMap(s => s.bullets || []).length;
  checks.push({
    name: 'all bullets have text',
    passed: bulletsWithText.length === totalBullets,
    message: `${bulletsWithText.length}/${totalBullets} bullets have text`,
  });

  // Check 8: Interest labels use valid values
  const slidesWithInterest = outline.slides.filter(s => s.interest);
  const validLabels = ['high', 'neutral', 'low'];
  const invalidInterestSlides = slidesWithInterest.filter(s => !validLabels.includes(s.interest!.label));
  checks.push({
    name: 'interest labels are valid',
    passed: invalidInterestSlides.length === 0,
    message: slidesWithInterest.length > 0
      ? `${slidesWithInterest.length} slides with interest labels, all valid`
      : 'No interest labels present (matching may have failed)',
  });

  // Check 9: High interest themes covered early (if applicable)
  if (fixture.expectedStructure.coverageExpectations.highInterestThemesShouldAppearInFirstHalf) {
    const highInterestSlides = outline.slides
      .map((s, i) => ({ slide: s, index: i }))
      .filter(({ slide }) => slide.interest?.label === 'high');

    const halfPoint = Math.ceil(outline.slides.length / 2);
    const highInFirstHalf = highInterestSlides.filter(({ index }) => index < halfPoint);

    checks.push({
      name: 'high interest in first half',
      passed: highInterestSlides.length === 0 || highInFirstHalf.length > 0,
      message: highInterestSlides.length === 0
        ? 'No high-interest slides to check'
        : `${highInFirstHalf.length}/${highInterestSlides.length} high-interest slides in first half`,
    });
  }

  // Summary
  const passed = checks.every(c => c.passed);
  return { passed, checks };
}

async function callLiveAPI(fixture: GoldenFixture, baseUrl: string): Promise<DeckOutline> {
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

function createMockOutline(_fixture: GoldenFixture): DeckOutline {
  // Generate a mock outline that should pass validation
  const slides: DeckSlide[] = [
    {
      title: 'Welcome & Introduction',
      bullets: [
        { text: 'Overview of today\'s presentation' },
        { text: 'What we\'ll cover', subBullets: ['Purpose', 'Use cases', 'Architecture'] },
      ],
    },
    {
      title: 'What is Feedbacker',
      bullets: [
        { text: 'Real-time audience feedback collection' },
        { text: 'Topic voting and prioritization' },
        { text: 'Open-ended response gathering' },
      ],
      interest: { score: 4, label: 'high', more: 5, less: 1 },
    },
    {
      title: 'How It Works',
      bullets: [
        { text: 'Create a session with proposed topics' },
        { text: 'Share link with participants' },
        { text: 'View real-time results and generate outlines' },
      ],
      interest: { score: 4, label: 'high', more: 4, less: 0 },
    },
    {
      title: 'Why I Built It',
      bullets: [
        { text: 'Pain points with existing solutions' },
        { text: 'Vision for presenter-audience interaction' },
      ],
      interest: { score: 1, label: 'neutral', more: 3, less: 2 },
    },
    {
      title: 'Technical Architecture',
      bullets: [
        { text: 'React frontend with Vite' },
        { text: 'Supabase backend with real-time subscriptions' },
        { text: 'OpenAI-powered outline generation' },
      ],
      speakerNotes: 'Address the technical architecture question from participant feedback',
    },
    {
      title: 'Target Audience',
      bullets: [
        { text: 'Conference speakers' },
        { text: 'Workshop facilitators' },
        { text: 'Educators and trainers' },
      ],
      interest: { score: -1, label: 'low', more: 2, less: 3 },
    },
    {
      title: 'Live Demo',
      bullets: [
        { text: 'Creating a new session' },
        { text: 'Participant experience' },
        { text: 'Results dashboard' },
      ],
      speakerNotes: 'Bob requested a live demo',
    },
    {
      title: 'Conclusion & Q&A',
      bullets: [
        { text: 'Key takeaways' },
        { text: 'Questions and discussion' },
      ],
    },
  ];

  return {
    deckTitle: 'Introduction to Feedbacker',
    slides,
    _debug: {
      inputHash: 'mock-test-hash',
      modelParams: { model: 'gpt-4o', temperature: 0.7, maxTokens: 4000 },
      responseStructure: {
        slideCount: slides.length,
        sectionTitles: slides.map(s => s.title),
        themesMatched: 4,
        themesUnmatched: 4,
      },
      timing: { apiCallMs: 0, totalMs: 0 },
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live');
  const validateOnly = args.includes('--validate-only');
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:5173';

  console.log('🔬 Deck Builder Structural Test\n');

  // Load golden fixture
  console.log('Loading golden fixture...');
  const fixture = loadGoldenFixture();
  console.log(`  Source: ${fixture.metadata.sourceSessionSlug}`);
  console.log(`  Themes: ${fixture.request.themeResults.length}`);
  console.log(`  Responses: ${fixture.request.responses.length}\n`);

  // Get outline (live API or mock)
  let outline: DeckOutline;

  if (isLive) {
    console.log(`Calling live API at ${baseUrl}...`);
    try {
      outline = await callLiveAPI(fixture, baseUrl);
      console.log('  ✓ API response received\n');

      if (outline._debug) {
        console.log('Debug metadata:');
        console.log(`  Input hash: ${outline._debug.inputHash}`);
        console.log(`  Slides: ${outline._debug.responseStructure.slideCount}`);
        console.log(`  Themes matched: ${outline._debug.responseStructure.themesMatched}`);
        console.log(`  API time: ${outline._debug.timing.apiCallMs}ms\n`);
      }
    } catch (error) {
      console.error(`  ✗ API call failed: ${error}`);
      process.exit(1);
    }
  } else if (validateOnly) {
    console.log('Using mock outline for structure validation...\n');
    outline = createMockOutline(fixture);
  } else {
    console.log('Usage:');
    console.log('  --live          Test against running server');
    console.log('  --validate-only Validate mock response structure\n');
    process.exit(0);
  }

  // Validate structure
  console.log('Validating outline structure...\n');
  const result = validateOutlineStructure(outline, fixture);

  for (const check of result.checks) {
    const icon = check.passed ? '✓' : '✗';
    console.log(`  ${icon} ${check.name}: ${check.message}`);
  }

  console.log();

  if (result.passed) {
    console.log('✅ All structural checks passed\n');

    // Output slide summary
    console.log('Slide summary:');
    outline.slides.forEach((slide, i) => {
      const interest = slide.interest ? ` [${slide.interest.label}]` : '';
      console.log(`  ${i + 1}. ${slide.title}${interest}`);
    });

    process.exit(0);
  } else {
    const failedCount = result.checks.filter(c => !c.passed).length;
    console.log(`❌ ${failedCount} structural check(s) failed\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
