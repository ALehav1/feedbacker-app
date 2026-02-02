/**
 * Deck Builder Failure Mode Tests
 *
 * Validates that the generate-outline API properly handles error cases
 * and returns appropriate error codes.
 *
 * Usage:
 *   # Requires local server running (npm run dev)
 *   npx tsx scripts/test-deck-builder-failures.ts
 */

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

interface TestCase {
  name: string;
  method: string;
  body: unknown;
  expectedStatus: number;
  expectedErrorCode: string;
}

const testCases: TestCase[] = [
  {
    name: 'GET method not allowed',
    method: 'GET',
    body: null,
    expectedStatus: 405,
    expectedErrorCode: 'method_not_allowed',
  },
  {
    name: 'Missing sessionTitle',
    method: 'POST',
    body: {
      sessionSummary: 'Test summary',
      lengthMinutes: 30,
      themeResults: [{ text: 'Test theme', more: 1, less: 0, net: 1 }],
      responses: [],
    },
    expectedStatus: 400,
    expectedErrorCode: 'missing_fields',
  },
  {
    name: 'Missing themeResults',
    method: 'POST',
    body: {
      sessionTitle: 'Test Session',
      sessionSummary: 'Test summary',
      lengthMinutes: 30,
      responses: [],
    },
    expectedStatus: 400,
    expectedErrorCode: 'missing_fields',
  },
  {
    name: 'No feedback - empty themes and responses',
    method: 'POST',
    body: {
      sessionTitle: 'Test Session',
      sessionSummary: 'Test summary',
      lengthMinutes: 30,
      themeResults: [],
      responses: [],
    },
    expectedStatus: 400,
    expectedErrorCode: 'no_feedback',
  },
  {
    name: 'No feedback - empty themes and null responses',
    method: 'POST',
    body: {
      sessionTitle: 'Test Session',
      sessionSummary: 'Test summary',
      lengthMinutes: 30,
      themeResults: [],
    },
    expectedStatus: 400,
    expectedErrorCode: 'no_feedback',
  },
];

interface TestResult {
  name: string;
  passed: boolean;
  expected: { status: number; code: string };
  actual: { status: number; code: string | null };
  message: string;
}

async function runTest(baseUrl: string, testCase: TestCase): Promise<TestResult> {
  const url = `${baseUrl}/api/generate-outline`;

  try {
    const fetchOptions: RequestInit = {
      method: testCase.method,
      headers: testCase.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: testCase.method === 'POST' && testCase.body ? JSON.stringify(testCase.body) : undefined,
    };

    const response = await fetch(url, fetchOptions);
    const status = response.status;

    let errorCode: string | null = null;
    try {
      const json = await response.json() as ErrorResponse;
      errorCode = json.error?.code || null;
    } catch {
      // Response might not be JSON
    }

    const passed = status === testCase.expectedStatus && errorCode === testCase.expectedErrorCode;

    return {
      name: testCase.name,
      passed,
      expected: { status: testCase.expectedStatus, code: testCase.expectedErrorCode },
      actual: { status, code: errorCode },
      message: passed
        ? 'OK'
        : `Expected ${testCase.expectedStatus}/${testCase.expectedErrorCode}, got ${status}/${errorCode}`,
    };
  } catch (error) {
    return {
      name: testCase.name,
      passed: false,
      expected: { status: testCase.expectedStatus, code: testCase.expectedErrorCode },
      actual: { status: 0, code: null },
      message: `Fetch error: ${error}`,
    };
  }
}

async function main() {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:5173';

  console.log('🧪 Deck Builder Failure Mode Tests\n');
  console.log(`Target: ${baseUrl}\n`);

  // Check if server is running
  try {
    await fetch(`${baseUrl}/api/generate-outline`, { method: 'HEAD' }).catch(() => {});
  } catch {
    console.error('❌ Server not responding. Make sure to run: npm run dev\n');
    process.exit(1);
  }

  const results: TestResult[] = [];

  for (const testCase of testCases) {
    process.stdout.write(`  Testing: ${testCase.name}... `);
    const result = await runTest(baseUrl, testCase);
    results.push(result);
    console.log(result.passed ? '✓' : `✗ (${result.message})`);
  }

  console.log();

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  if (failed === 0) {
    console.log(`✅ All ${passed} failure-mode tests passed\n`);
    process.exit(0);
  } else {
    console.log(`❌ ${failed}/${results.length} tests failed\n`);

    console.log('Failed tests:');
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  - ${result.name}`);
      console.log(`    Expected: ${result.expected.status} / ${result.expected.code}`);
      console.log(`    Actual:   ${result.actual.status} / ${result.actual.code}`);
    }

    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
