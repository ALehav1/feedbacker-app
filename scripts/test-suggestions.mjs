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
const { extractSuggestions, groupSuggestions } = mod

const responses = [
  '- Pricing strategy',
  'Topic: pricing strategy',
  'pricing strategy.',
  'Suggestion: Competitive landscape',
  'This is a long paragraph that should not be treated as a suggestion because it exceeds the character threshold and contains no bullet or label to indicate a specific topic.'
]

const extracted = responses.flatMap(text => extractSuggestions(text))
const groups = groupSuggestions(extracted)

const findGroup = (label) => groups.find(g => g.normalized.includes(label))

const pricing = findGroup('pricing strategy')
if (!pricing || pricing.count !== 3) {
  console.error('[FAIL] pricing strategy should group to +3', pricing)
  process.exit(1)
}

const competitive = findGroup('competitive landscape')
if (!competitive || competitive.count !== 1) {
  console.error('[FAIL] competitive landscape should be +1', competitive)
  process.exit(1)
}

const longExtracted = extractSuggestions(responses[4])
if (longExtracted.length !== 0) {
  console.error('[FAIL] long paragraph should yield zero suggestions', longExtracted)
  process.exit(1)
}

console.log('[PASS] suggestions grouping and parsing')
