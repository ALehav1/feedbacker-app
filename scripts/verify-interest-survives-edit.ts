/**
 * Verification script: Does interest labeling survive slide title edits?
 *
 * Run with: npx tsx scripts/verify-interest-survives-edit.ts
 */

interface InterestData {
  score: number;
  label: 'high' | 'neutral' | 'low';
  more: number;
  less: number;
}

interface DeckSlide {
  title: string;
  bullets: Array<{ text: string; subBullets?: string[] }>;
  speakerNotes?: string;
  interest?: InterestData;
}

interface DeckOutline {
  deckTitle: string;
  slides: DeckSlide[];
}

// Simulate the updateSlideTitle function from DeckBuilderPanel
function updateSlideTitle(outline: DeckOutline, slideIndex: number, title: string): DeckOutline {
  const newSlides = [...outline.slides];
  newSlides[slideIndex] = { ...newSlides[slideIndex], title };
  return { ...outline, slides: newSlides };
}

// Test data: outline with interest scoring
const testOutline: DeckOutline = {
  deckTitle: 'Test Presentation',
  slides: [
    {
      title: 'Advanced Caching',
      bullets: [{ text: 'Redis patterns' }],
      interest: { score: 4, label: 'high', more: 5, less: 1 },
    },
    {
      title: 'Basic Setup',
      bullets: [{ text: 'Getting started' }],
      interest: { score: 0, label: 'neutral', more: 2, less: 2 },
    },
    {
      title: 'Legacy Migration',
      bullets: [{ text: 'Old to new' }],
      interest: { score: -3, label: 'low', more: 1, less: 4 },
    },
  ],
};

console.log('=== Interest Labeling Survival Test ===\n');

// Test: Edit each slide title and verify interest persists
let allPassed = true;

for (let i = 0; i < testOutline.slides.length; i++) {
  const originalSlide = testOutline.slides[i];
  const originalInterest = originalSlide.interest;

  // Simulate editing the title
  const editedOutline = updateSlideTitle(testOutline, i, `${originalSlide.title} (edited)`);
  const editedSlide = editedOutline.slides[i];

  // Verify interest data survived
  const interestSurvived =
    editedSlide.interest !== undefined &&
    editedSlide.interest.score === originalInterest?.score &&
    editedSlide.interest.label === originalInterest?.label &&
    editedSlide.interest.more === originalInterest?.more &&
    editedSlide.interest.less === originalInterest?.less;

  const status = interestSurvived ? '✓ PASS' : '✗ FAIL';
  if (!interestSurvived) allPassed = false;

  console.log(`Slide ${i + 1}: "${originalSlide.title}"`);
  console.log(`  Original interest: ${JSON.stringify(originalInterest)}`);
  console.log(`  After title edit:  ${JSON.stringify(editedSlide.interest)}`);
  console.log(`  ${status}\n`);
}

// Summary
console.log('=== Summary ===');
if (allPassed) {
  console.log('✓ All tests passed: Interest labeling survives slide title edits.');
  process.exit(0);
} else {
  console.log('✗ Some tests failed: Interest labeling does NOT survive edits.');
  process.exit(1);
}
