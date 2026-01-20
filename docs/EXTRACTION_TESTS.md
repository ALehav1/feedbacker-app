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

## Extraction Behavior Summary

**Heuristics:**
- Prioritize top-level bullets (minimal indentation)
- Strip "Topic:" prefix for display
- Remove trailing punctuation
- Filter topics >120 chars
- Deduplicate case-insensitive
- Cap at 12 topics
- If <4 top-level found, include second-level bullets
