import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UNPUBLISHED_CHANGES_BAR } from '@/lib/copy';
import { buildParticipantUrl } from '@/lib/shareLink';

interface UnpublishedChangesBarProps {
  onPublish: () => void;
  onDiscard: () => void;
  isPublishing?: boolean;
  slug?: string;
  publishedShareToken?: string | null;
  linkRotationNote?: string;
}

export function UnpublishedChangesBar({
  onPublish,
  onDiscard,
  isPublishing = false,
  slug,
  publishedShareToken,
  linkRotationNote,
}: UnpublishedChangesBarProps) {
  const baseUrl = import.meta.env.VITE_APP_URL || import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
  const liveUrl = slug ? buildParticipantUrl(baseUrl, slug, publishedShareToken) : null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-amber-900">
          {UNPUBLISHED_CHANGES_BAR.title}
        </h3>
        <p className="text-sm text-amber-700 mt-1">
          {UNPUBLISHED_CHANGES_BAR.body}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onPublish}
          disabled={isPublishing}
          size="sm"
          className="min-h-[40px]"
        >
          {isPublishing ? 'Publishing...' : UNPUBLISHED_CHANGES_BAR.primaryAction}
        </Button>
        <Button
          onClick={onDiscard}
          disabled={isPublishing}
          variant="outline"
          size="sm"
          className="min-h-[40px]"
        >
          {UNPUBLISHED_CHANGES_BAR.secondaryAction}
        </Button>
        {liveUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(liveUrl, '_blank')}
            className="min-h-[40px] text-xs"
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            {UNPUBLISHED_CHANGES_BAR.viewLiveLink}
          </Button>
        )}
      </div>
      <p className="text-xs text-amber-600">
        {UNPUBLISHED_CHANGES_BAR.activeReassurance}
      </p>
      {linkRotationNote && (
        <p className="text-xs text-amber-700">
          {linkRotationNote}
        </p>
      )}
    </div>
  );
}
