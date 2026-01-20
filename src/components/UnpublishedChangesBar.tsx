import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UnpublishedChangesBarProps {
  onPublish: () => void;
  onDiscard: () => void;
  isPublishing?: boolean;
}

export function UnpublishedChangesBar({
  onPublish,
  onDiscard,
  isPublishing = false,
}: UnpublishedChangesBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mx-auto max-w-screen-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">Unpublished changes</p>
              <p className="text-xs text-amber-700">
                Participants see the published version until you publish updates.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onDiscard}
              disabled={isPublishing}
              className="min-h-[40px] w-full sm:w-auto"
            >
              Discard changes
            </Button>
            <Button
              onClick={onPublish}
              disabled={isPublishing}
              className="min-h-[40px] w-full bg-amber-600 hover:bg-amber-700 sm:w-auto"
            >
              {isPublishing ? 'Publishing...' : 'Publish updates'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
