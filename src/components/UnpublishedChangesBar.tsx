import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UnpublishedChangesBarProps {
  onPublish: () => void;
  onDiscard: () => void;
  isPublishing?: boolean;
  isActive?: boolean;
  slug?: string;
}

export function UnpublishedChangesBar({
  onPublish: _onPublish,
  onDiscard: _onDiscard,
  isPublishing: _isPublishing = false,
  isActive: _isActive = false,
  slug,
}: UnpublishedChangesBarProps) {
  const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
  const liveUrl = slug ? `${baseUrl}/s/${slug}` : null;
  
  // Minimal non-blocking bar with just preview links
  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white px-4 py-2">
      <div className="mx-auto max-w-screen-lg flex items-center justify-between gap-3">
        <p className="text-xs text-gray-600">Unsaved edits</p>
        {liveUrl && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`${liveUrl}?preview=working`, '_blank')}
              className="h-8 text-xs"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Preview participant view
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(liveUrl, '_blank')}
              className="h-8 text-xs"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open participant page
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
