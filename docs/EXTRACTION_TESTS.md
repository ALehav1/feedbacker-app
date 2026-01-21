# Topic Extraction Test Cases

## Test Case 1: Well-formatted outline with Topic: prefix
```
- Topic: Problem framing
  - Supporting: quick story
  - Supporting: why it matters now
- Topic: Current constraints
  - Supporting: what's hard today
- Topic: Proposed approach
  - Supporting: steps and tradeoffs
- Topic: Case study
- Topic: Close / ask
```

**Expected:** 5 topics extracted (Problem framing, Current constraints, Proposed approach, Case study, Close / ask)

---

## Test Case 2: Numbered list
```
1. Introduction to the challenge
2. Market research findings
3. Competitive landscape analysis
4. Proposed solution architecture
5. Implementation roadmap
6. Budget and resources
7. Q&A session
```

**Expected:** 7 topics extracted

---

## Test Case 3: Simple bullets without prefix
```
- Product vision for 2025
- Key customer pain points
- Technical architecture overview
- Team structure and hiring plan
- Metrics and success criteria
```

**Expected:** 5 topics extracted

---

## Test Case 4: Mixed indentation (top-level + sub-bullets)
```
- Executive summary
  - Financial highlights
  - Strategic goals
- Product roadmap
  - Q1 features
  - Q2 features
- Engineering challenges
  - Scalability
  - Security
- Go-to-market strategy
```

**Expected:** 4 top-level topics (Executive summary, Product roadmap, Engineering challenges, Go-to-market strategy)

---

## Test Case 5: Minimal top-level bullets (fallback test)
```
- Main topic only
  - Sub-point A
  - Sub-point B
  - Sub-point C
  - Sub-point D
  - Sub-point E
```

**Expected:** Fallback to sub-bullets (6 topics: Main topic only, Sub-point A through E)

---

## Test Case 6: Too long topics (should be filtered)
```
- This is a very long topic that exceeds the maximum character limit and should be filtered out because it's too verbose and doesn't follow the guideline of keeping topics concise and to the point within 3-10 words
- Short topic
- Another valid topic
```

**Expected:** 2 topics (Short topic, Another valid topic)

---

## Test Case 7: Plain text with blank lines (no bullets)
```
Context

Problem

Solution
```

**Expected:** 3 topics (Context, Problem, Solution)

---

## Test Case 9: Sub-bullets attach to parent topic
```
Market context
  - why now
  - why later

Analysis
  - key drivers
  - implications

Case study
```

**Expected:** 
- 3 topics: Market context, Analysis, Case study
- Market context has 2 details: "why now", "why later"
- Analysis has 2 details: "key drivers", "implications"
- Case study has 0 details
- Participants vote on topics only, details shown as context

---

## Test Case 8: Duplicate topics (case-insensitive)
```
- Market Context
- market context
- Product Vision
- Product vision
- Implementation Plan
```

**Expected:** 3 topics (Market Context, Product Vision, Implementation Plan) - first occurrence preserved, duplicates removed

---

## Extraction Behavior Summary

**Current Logic (Simplified):**
- Every non-empty line is a topic candidate
- Strip bullets (`-`, `*`, `•`), numbers (`1.`, `1)`), and "Topic:" prefix
- Remove trailing punctuation (`.`, `,`, `;`, `:`)
- Filter topics <4 chars or >120 chars
- Deduplicate case-insensitively (first occurrence preserved)
- Preserve original order
- Cap at 12 topics
- Blank lines are separators (ignored)
