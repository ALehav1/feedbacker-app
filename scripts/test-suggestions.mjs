import fs from 'node:fs'
import { Buffer } from 'node:buffer'
import ts from 'typescript'

const sourcePath = new URL('../src/lib/suggestions.ts', import.meta.url)
const source = fs.readFileSync(sourcePath, 'utf8')

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
})

const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
const mod = await import(moduleUrl)
const { extractSuggestions, extractSuggestionsFromSuggestedRaw, groupSuggestions } = mod

const freeformSamples = [
  '- Market positioning',
  'Topic: market positioning',
  'market positioning.',
  'Suggestion: Competitive landscape',
  'This is a long paragraph that should not be treated as a suggestion because it exceeds the character threshold and contains no bullet or label to indicate a specific topic.'
]

const extracted = freeformSamples.flatMap(text => extractSuggestions(text))
const groups = groupSuggestions(extracted)

const findGroup = (label) => groups.find(g => g.normalized.includes(label))

const positioning = findGroup('market positioning')
if (!positioning || positioning.count !== 3) {
  console.error('[FAIL] market positioning should group to +3', positioning)
  process.exit(1)
}

const competitive = findGroup('competitive landscape')
if (!competitive || competitive.count !== 1) {
  console.error('[FAIL] competitive landscape should be +1', competitive)
  process.exit(1)
}

const longExtracted = extractSuggestions(freeformSamples[4])
if (longExtracted.length !== 0) {
  console.error('[FAIL] long paragraph should yield zero suggestions', longExtracted)
  process.exit(1)
}

const suggestedRaw = `Market positioning\n- Packaging\n- Renewal motion`
const suggestedExtracted = extractSuggestionsFromSuggestedRaw(suggestedRaw)
if (suggestedExtracted.length !== 1 || suggestedExtracted[0] !== 'Market positioning') {
  console.error('[FAIL] suggested raw should yield only top-level topic', suggestedExtracted)
  process.exit(1)
}

console.log('[PASS] suggestions grouping and parsing')
