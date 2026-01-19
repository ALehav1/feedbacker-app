import { Button } from '@/components/ui/button'

interface ThemeSelectorProps {
  text: string
  selection: 'more' | 'less' | null
  onSelect: (selection: 'more' | 'less' | null) => void
  disabled?: boolean
}

export function ThemeSelector({ text, selection, onSelect, disabled }: ThemeSelectorProps) {
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
      <p className="text-sm text-gray-900 mb-3">{text}</p>
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
          More interested
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
          Less interested
        </Button>
      </div>
    </div>
  )
}
