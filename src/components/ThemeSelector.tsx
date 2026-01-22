/**
 * BASELINE_LOCK (Jan 18, 2026)
 * This module is part of the frozen baseline. Avoid edits unless fixing a confirmed bug.
 * If edits are required: keep diff minimal and document reason in docs/BASELINE_LOCK.md.
 *
 * EDIT (Jan 21, 2026): Added subtopic rendering support for encoded topic blocks.
 * Topics can now be encoded as "Title\n- Sub1\n- Sub2". This change decodes and renders them.
 */

import { Button } from '@/components/ui/button'
import { decodeTopicBlock } from '@/lib/topicBlocks'

interface ThemeSelectorProps {
  text: string
  selection: 'more' | 'less' | null
  onSelect: (selection: 'more' | 'less' | null) => void
  disabled?: boolean
}

export function ThemeSelector({ text, selection, onSelect, disabled }: ThemeSelectorProps) {
  // Decode topic block to extract title and subtopics
  const { title, subtopics } = decodeTopicBlock(text)
  const handleMoreClick = () => {
    if (selection === 'more') {
      onSelect(null)
    } else {
      onSelect('more')
    }
  }

  const handleLessClick = () => {
    if (selection === 'less') {
      onSelect(null)
    } else {
      onSelect('less')
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900 break-words">{title}</p>
      {subtopics.length > 0 && (
        <ul className="mt-1 mb-3 space-y-0.5">
          {subtopics.map((sub, idx) => (
            <li key={idx} className="text-xs text-gray-600 pl-2 flex items-start gap-1">
              <span className="text-gray-400">—</span>
              <span className="break-words">{sub}</span>
            </li>
          ))}
        </ul>
      )}
      {subtopics.length === 0 && <div className="mb-3" />}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={selection === 'more' ? 'default' : 'outline'}
          size="sm"
          onClick={handleMoreClick}
          disabled={disabled}
          className="min-h-[48px] flex-1"
        >
          <span className="text-lg mr-1">👍</span>
          Cover more
        </Button>
        <Button
          type="button"
          variant={selection === 'less' ? 'default' : 'outline'}
          size="sm"
          onClick={handleLessClick}
          disabled={disabled}
          className="min-h-[48px] flex-1"
        >
          <span className="text-lg mr-1">👎</span>
          Cover less
        </Button>
      </div>
    </div>
  )
}
