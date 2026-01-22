/**
 * Topic Block Encoding/Decoding Utilities
 *
 * Topics with subtopics are stored as single strings in the database.
 * Format:
 *   Title
 *   - Subtopic 1
 *   - Subtopic 2
 *
 * This avoids DB schema changes while supporting nested topic structures.
 */

export interface TopicBlock {
  title: string
  subtopics: string[]
}

/**
 * Encode a topic block into a single string for storage.
 * Format: "Title\n- Sub1\n- Sub2"
 */
export function encodeTopicBlock(title: string, subtopics: string[]): string {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) return ''

  if (subtopics.length === 0) {
    return trimmedTitle
  }

  const subtopicLines = subtopics
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => `- ${s}`)

  return [trimmedTitle, ...subtopicLines].join('\n')
}

/**
 * Decode a stored string into a topic block.
 * Parses lines starting with - or • as subtopics.
 */
export function decodeTopicBlock(block: string): TopicBlock {
  if (!block || typeof block !== 'string') {
    return { title: '', subtopics: [] }
  }

  const lines = block.split('\n').map(l => l.trim()).filter(Boolean)

  if (lines.length === 0) {
    return { title: '', subtopics: [] }
  }

  const title = lines[0]
  const subtopics: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    // Strip bullet prefixes: -, •, *, —
    const stripped = line.replace(/^[-•*—]\s*/, '').trim()
    if (stripped) {
      subtopics.push(stripped)
    }
  }

  return { title, subtopics }
}

/**
 * Normalize an array of topic blocks: dedupe, trim, remove empties.
 */
export function normalizeTopicBlocks(blocks: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const block of blocks) {
    const decoded = decodeTopicBlock(block)
    if (!decoded.title) continue

    // Dedupe by lowercase title
    const key = decoded.title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    // Re-encode to ensure consistent format
    normalized.push(encodeTopicBlock(decoded.title, decoded.subtopics))
  }

  return normalized
}

/**
 * Parse an outline string into encoded topic blocks.
 *
 * Rules:
 * - Lines starting with -, •, *, — attach as subtopic to previous title
 * - Short adjacent lines (<=25 chars, <=4 words) can attach as subtopics
 *   only when they follow immediately with no blank line
 * - Blank line resets attach behavior
 * - Indented lines attach as subtopics
 */
export function parseOutlineToTopicBlocks(outline: string): string[] {
  const MAX_TOPICS = 12
  const MAX_SUBTOPICS = 6
  const MAX_TOPIC_LENGTH = 120

  const lines = outline.split('\n')
  const blocks: TopicBlock[] = []
  let currentBlock: TopicBlock | null = null
  let lastLineWasBlank = true

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()

    // Track blank lines
    if (!trimmed) {
      lastLineWasBlank = true
      continue
    }

    // Normalize the text (strip bullets, numbers, prefixes)
    const normalized = trimmed
      .replace(/^[-*•—]\s*/, '')
      .replace(/^\d+[.)]\s*/, '')
      .replace(/^Topic:\s*/i, '')
      .trim()
      .replace(/[.,;:]$/, '')
      .trim()

    if (!normalized || normalized.length > MAX_TOPIC_LENGTH) {
      lastLineWasBlank = false
      continue
    }

    const isIndented = rawLine.startsWith('  ') || rawLine.startsWith('\t')
    const isBullet = /^[-•*—]/.test(trimmed)
    const isShort = normalized.length <= 25 && normalized.split(/\s+/).length <= 4
    const isHeader = isHeaderLine(normalized)

    // Determine if this line should attach as a subtopic
    const shouldAttachAsSubtopic = currentBlock && (
      isIndented ||
      isBullet ||
      (!lastLineWasBlank && isShort && !isHeader)
    )

    if (shouldAttachAsSubtopic && currentBlock) {
      if (currentBlock.subtopics.length < MAX_SUBTOPICS) {
        const lowerSubtopic = normalized.toLowerCase()
        if (!currentBlock.subtopics.some(s => s.toLowerCase() === lowerSubtopic)) {
          currentBlock.subtopics.push(normalized)
        }
      }
    } else {
      // Start a new block
      currentBlock = { title: normalized, subtopics: [] }
      blocks.push(currentBlock)
    }

    lastLineWasBlank = false
  }

  // Dedupe and encode
  const seen = new Set<string>()
  const encoded: string[] = []

  for (const block of blocks) {
    const key = block.title.toLowerCase()
    if (seen.has(key) || encoded.length >= MAX_TOPICS) continue
    seen.add(key)
    encoded.push(encodeTopicBlock(block.title, block.subtopics))
  }

  return encoded
}

/**
 * Check if a line looks like a header (standalone topic).
 */
function isHeaderLine(text: string): boolean {
  const standalonePatterns = /^(introduction|conclusion|overview|summary|background|methodology|methods|results|discussion|references|appendix|agenda|objectives|goals|takeaways|questions|q&a|new|fresh|update|demo|example|case study)$/i
  if (standalonePatterns.test(text.trim())) return true
  if (text.split(/\s+/).length >= 3) return true
  if (text.trim().endsWith(':')) return true
  return false
}
