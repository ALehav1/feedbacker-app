import { validateShareToken } from '../src/lib/shareLink'

const cases: Array<{
  name: string
  published: string | null | undefined
  url: string | null
  expected: 'ok' | 'expired'
}> = [
  { name: 'token null + url null', published: null, url: null, expected: 'ok' },
  { name: 'token null + url abc', published: null, url: 'abc', expected: 'ok' },
  { name: 'token abc + url null', published: 'abc', url: null, expected: 'expired' },
  { name: 'token abc + url def', published: 'abc', url: 'def', expected: 'expired' },
  { name: 'token abc + url abc', published: 'abc', url: 'abc', expected: 'ok' },
]

let failed = false

for (const testCase of cases) {
  const actual = validateShareToken(testCase.published, testCase.url)
  if (actual !== testCase.expected) {
    failed = true
    console.error(`[FAIL] ${testCase.name}: expected ${testCase.expected}, got ${actual}`)
  } else {
    console.log(`[PASS] ${testCase.name}`)
  }
}

if (failed) {
  process.exit(1)
}
