import fs from 'node:fs'
import { Buffer } from 'node:buffer'
import ts from 'typescript'

const sourcePath = new URL('../src/lib/shareLink.ts', import.meta.url)
const source = fs.readFileSync(sourcePath, 'utf8')

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
})

const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
const mod = await import(moduleUrl)
const { validateShareToken } = mod

const cases = [
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
