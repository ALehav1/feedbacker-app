import { AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UNPUBLISHED_CHANGES_BAR } from '@/lib/copy';

interface UnpublishedChangesBarProps {
  onPublish: () => void;
  onDiscard: () => void;
  isPublishing?: boolean;
  isActive?: boolean;
  slug?: string;
}

export function UnpublishedChangesBar({
  onPublish,
  onDiscard,
  isPublishing = false,
  isActive = false,
  slug,
}: UnpublishedChangesBarProps) {
  const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
  const liveUrl = slug ? `${baseUrl}/s/${slug}` : null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mx-auto max-w-screen-lg">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">{UNPUBLISHED_CHANGES_BAR.title}</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {UNPUBLISHED_CHANGES_BAR.body}
                </p>
                {isActive && (
                  <p className="text-xs text-amber-600 mt-2 font-medium">
                    {UNPUBLISHED_CHANGES_BAR.activeReassurance}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onDiscard}
                disabled={isPublishing}
                className="min-h-[40px] w-full sm:w-auto"
              >
                {UNPUBLISHED_CHANGES_BAR.secondaryAction}
              </Button>
              <Button
                onClick={onPublish}
                disabled={isPublishing}
                className="min-h-[40px] w-full bg-amber-600 hover:bg-amber-700 sm:w-auto"
              >
                {isPublishing ? 'Publishing...' : UNPUBLISHED_CHANGES_BAR.primaryAction}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-amber-200 pt-3">
            <p className="text-xs text-amber-700">
              {UNPUBLISHED_CHANGES_BAR.helper}
            </p>
            {liveUrl && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`${liveUrl}?preview=working`, '_blank')}
                  className="h-8 text-xs text-amber-900 hover:text-amber-950 hover:bg-amber-100 justify-start sm:justify-center"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Preview changes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(liveUrl, '_blank')}
                  className="h-8 text-xs text-amber-900 hover:text-amber-950 hover:bg-amber-100 justify-start sm:justify-center"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  {UNPUBLISHED_CHANGES_BAR.viewLiveLink}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
