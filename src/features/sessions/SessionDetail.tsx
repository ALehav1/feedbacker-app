/**
 * BASELINE_LOCK (Jan 18, 2026)
 * This module is part of the frozen baseline. Avoid edits unless fixing a confirmed bug.
 * If edits are required: keep diff minimal and document reason in docs/BASELINE_LOCK.md.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MoreVertical, ExternalLink, ChevronDown, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { UnpublishedChangesBar } from '@/components/UnpublishedChangesBar'
import { SECTION_INDICATORS, NAVIGATION_GUARDRAIL } from '@/lib/copy'
import type { Session, SessionState } from '@/types'

interface ThemeResult {
  themeId: string
  text: string
  sortOrder: number
  more: number
  less: number
  total: number
  net: number
}

interface Response {
  id: string
  participantName: string | null
  participantEmail: string | null
  freeFormText: string | null
  createdAt: Date
}

// Supabase row types
interface ThemeRow {
  id: string
  text: string
  sort_order: number
}

interface SelectionRow {
  theme_id: string
  selection: 'more' | 'less'
  responses: { session_id: string }
}

interface ResponseRow {
  id: string
  name: string | null
  participant_email: string | null
  free_form_text: string | null
  created_at: string
}

export function SessionDetail() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin

  const [themeResults, setThemeResults] = useState<ThemeResult[]>([])
  const [responses, setResponses] = useState<Response[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)

  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showNavigateAwayDialog, setShowNavigateAwayDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setError('No session ID provided')
        setLoading(false)
        return
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (fetchError) {
          console.error('Error fetching session:', fetchError)
          setError('Failed to load session')
          return
        }

        if (data) {
          setSession({
            id: data.id,
            presenterId: data.presenter_id,
            state: data.state,
            lengthMinutes: data.length_minutes,
            title: data.title,
            welcomeMessage: data.welcome_message,
            summaryFull: data.summary_full,
            summaryCondensed: data.summary_condensed,
            slug: data.slug,
            topicsSource: (data.topics_source as 'generated' | 'manual') || 'generated',
            publishedWelcomeMessage: data.published_welcome_message,
            publishedSummaryCondensed: data.published_summary_condensed,
            publishedTopics: data.published_topics || [],
            publishedAt: data.published_at ? new Date(data.published_at) : undefined,
            hasUnpublishedChanges: data.has_unpublished_changes || false,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
          })
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [sessionId])

  const transitionState = async (newState: SessionState) => {
    if (!sessionId || !session) return

    setIsTransitioning(true)

    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ state: newState })
        .eq('id', sessionId)

      if (updateError) {
        console.error('Error updating session state:', updateError)
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: 'Unable to update session state. Please try again.',
        })
        return
      }

      setSession({ ...session, state: newState })
      toast({
        title: 'Session updated',
        description: `Session is now ${newState}.`,
      })
    } catch (err) {
      console.error('Unexpected error:', err)
      toast({
        variant: 'destructive',
        title: 'Unexpected error',
        description: 'Something went wrong. Please try again.',
      })
    } finally {
      setIsTransitioning(false)
    }
  }

  const handleOpenSession = () => {
    transitionState('active')
  }

  const handleCloseSession = () => {
    setShowCloseDialog(false)
    transitionState('completed')
  }

  const handleArchiveSession = () => {
    setShowArchiveDialog(false)
    transitionState('archived')
  }

  const handleCopyLink = async () => {
    if (!session) return

    const link = `${baseUrl}/s/${session.slug}`
    try {
      await navigator.clipboard.writeText(link)
      toast({
        title: 'Link copied',
        description: 'Shareable link copied to clipboard.',
      })
    } catch (err) {
      console.error('Failed to copy:', err)
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Unable to copy link. Please copy manually.',
      })
    }
  }

  const handlePublishUpdates = async () => {
    if (!sessionId || !session) return

    setIsPublishing(true)

    try {
      // Fetch current working themes
      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select('id, text, sort_order')
        .eq('session_id', sessionId)
        .order('sort_order', { ascending: true })

      if (themesError) {
        console.error('Error fetching themes:', themesError)
        toast({
          variant: 'destructive',
          title: 'Publish failed',
          description: 'Unable to fetch themes.',
        })
        return
      }

      // Map themes to published_topics format
      const publishedTopics = (themesData || []).map((theme: { id: string; text: string; sort_order: number }) => ({
        themeId: theme.id,
        text: theme.text,
        sortOrder: theme.sort_order,
      }))

      // Update session with published snapshot
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          published_welcome_message: session.welcomeMessage,
          published_summary_condensed: session.summaryCondensed,
          published_topics: publishedTopics,
          published_at: new Date().toISOString(),
          has_unpublished_changes: false,
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('Error publishing updates:', updateError)
        toast({
          variant: 'destructive',
          title: 'Publish failed',
          description: 'Unable to publish updates.',
        })
        return
      }

      // Update local session state
      setSession({
        ...session,
        publishedWelcomeMessage: session.welcomeMessage,
        publishedSummaryCondensed: session.summaryCondensed,
        publishedTopics,
        publishedAt: new Date(),
        hasUnpublishedChanges: false,
      })

      toast({
        title: 'Updates published',
        description: 'Participants now see the latest version.',
      })
    } catch (err) {
      console.error('Unexpected error:', err)
      toast({
        variant: 'destructive',
        title: 'Unexpected error',
        description: 'Something went wrong.',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDiscardChanges = async () => {
    if (!sessionId || !session) return

    setIsPublishing(true)

    try {
      // Revert working fields to published snapshot
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          welcome_message: session.publishedWelcomeMessage || '',
          summary_condensed: session.publishedSummaryCondensed || '',
          has_unpublished_changes: false,
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('Error discarding changes:', updateError)
        toast({
          variant: 'destructive',
          title: 'Discard failed',
          description: 'Unable to discard changes.',
        })
        return
      }

      // Reconcile themes table to match published_topics
      const publishedIds = new Set(session.publishedTopics.map(t => t.themeId))

      // Fetch current working themes
      const { data: currentThemes } = await supabase
        .from('themes')
        .select('id')
        .eq('session_id', sessionId)

      // Delete themes not in published snapshot
      const themesToDelete = (currentThemes || []).filter(
        (t: { id: string }) => !publishedIds.has(t.id)
      )
      if (themesToDelete.length > 0) {
        await supabase
          .from('themes')
          .delete()
          .in('id', themesToDelete.map((t: { id: string }) => t.id))
      }

      // Upsert published topics back to themes table
      for (const topic of session.publishedTopics) {
        await supabase
          .from('themes')
          .upsert({
            id: topic.themeId,
            session_id: sessionId,
            text: topic.text,
            sort_order: topic.sortOrder,
          })
      }

      // Update local session state
      setSession({
        ...session,
        welcomeMessage: session.publishedWelcomeMessage || '',
        summaryCondensed: session.publishedSummaryCondensed || '',
        hasUnpublishedChanges: false,
      })

      toast({
        title: 'Changes discarded',
        description: 'Working state restored to published version.',
      })

      // Reload page to refresh themes
      window.location.reload()
    } catch (err) {
      console.error('Unexpected error:', err)
      toast({
        variant: 'destructive',
        title: 'Unexpected error',
        description: 'Something went wrong.',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const fetchResults = async () => {
    if (!sessionId) return

    setResultsLoading(true)
    setResultsError(null)

    try {
      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select('id, text, sort_order')
        .eq('session_id', sessionId)
        .order('sort_order', { ascending: true })

      if (themesError) {
        console.error('Error fetching themes:', themesError)
        setResultsError('Failed to load themes')
        return
      }

      const { data: selectionsData, error: selectionsError } = await supabase
        .from('theme_selections')
        .select(`
          theme_id,
          selection,
          responses!inner(session_id)
        `)
        .eq('responses.session_id', sessionId)

      if (selectionsError) {
        console.error('Error fetching selections:', selectionsError)
        setResultsError('Failed to load selections')
        return
      }

      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select('id, name, participant_email, free_form_text, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (responsesError) {
        console.error('Error fetching responses:', responsesError)
        setResultsError('Failed to load responses')
        return
      }

      const themeCounts = new Map<string, { more: number; less: number }>()
      ;(themesData as ThemeRow[] | null)?.forEach((theme) => {
        themeCounts.set(theme.id, { more: 0, less: 0 })
      })

      ;(selectionsData as SelectionRow[] | null)?.forEach((sel) => {
        const counts = themeCounts.get(sel.theme_id)
        if (counts) {
          if (sel.selection === 'more') {
            counts.more++
          } else if (sel.selection === 'less') {
            counts.less++
          }
        }
      })

      const results: ThemeResult[] = ((themesData as ThemeRow[] | null) || []).map((theme) => {
        const counts = themeCounts.get(theme.id) || { more: 0, less: 0 }
        const total = counts.more + counts.less
        const net = counts.more - counts.less
        return {
          themeId: theme.id,
          text: theme.text,
          sortOrder: theme.sort_order,
          more: counts.more,
          less: counts.less,
          total,
          net,
        }
      })

      results.sort((a, b) => {
        if (b.net !== a.net) return b.net - a.net
        if (b.total !== a.total) return b.total - a.total
        return a.sortOrder - b.sortOrder
      })

      setThemeResults(results)

      const mappedResponses: Response[] = ((responsesData as ResponseRow[] | null) || []).map((r) => ({
        id: r.id,
        participantName: r.name,
        participantEmail: r.participant_email,
        freeFormText: r.free_form_text,
        createdAt: new Date(r.created_at),
      }))

      setResponses(mappedResponses)
    } catch (err) {
      console.error('Unexpected error:', err)
      setResultsError('Something went wrong')
    } finally {
      setResultsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Session</CardTitle>
            <CardDescription>{error || 'Session not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stateColors = {
    draft: 'bg-amber-100 text-amber-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-600',
  }

  const stateLabels = {
    draft: 'Draft',
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  }

  const participantUrl = `${baseUrl}/s/${session.slug}`

  const handleBack = () => {
    if (session.hasUnpublishedChanges) {
      setPendingNavigation('/dashboard')
      setShowNavigateAwayDialog(true)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Unpublished changes bar (fixed position) */}
      {session.hasUnpublishedChanges && (session.state === 'draft' || session.state === 'active') && (
        <UnpublishedChangesBar
          onPublish={handlePublishUpdates}
          onDiscard={handleDiscardChanges}
          isPublishing={isPublishing}
          isActive={session.state === 'active'}
          slug={session.slug}
        />
      )}

      {/* Sticky top bar */}
      <header
        className="sticky top-0 z-40 border-b bg-white"
        style={{ marginTop: session.hasUnpublishedChanges && (session.state === 'draft' || session.state === 'active') ? '64px' : '0' }}
      >
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(session.state === 'draft' || session.state === 'active') && (
                  <DropdownMenuItem onClick={() => navigate(`/dashboard/sessions/${session.id}/edit`)}>
                    Edit session
                  </DropdownMenuItem>
                )}
                {session.state === 'active' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowCloseDialog(true)}>
                      Close session
                    </DropdownMenuItem>
                  </>
                )}
                {session.state === 'completed' && (
                  <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
                    Archive session
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Header card: Title + Badge + Metadata */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{session.title}</h1>
            <span className={`rounded-full px-3 py-1 text-sm font-medium shrink-0 ${stateColors[session.state]}`}>
              {stateLabels[session.state]}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {session.lengthMinutes} min • Created {session.createdAt.toLocaleDateString()}
          </p>
        </div>

        {/* Primary action block - Draft */}
        {session.state === 'draft' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Button
                className="w-full min-h-[48px]"
                onClick={() => navigate(`/dashboard/sessions/${session.id}/edit`)}
              >
                Edit session
              </Button>
              <p className="text-sm text-gray-600 text-center">
                Update welcome text, outline, and topics.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Draft activation block */}
        {session.state === 'draft' && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                  Draft — preview only
                </span>
              </div>
              <p className="text-sm text-amber-900">
                Feedback collection starts after you confirm.
              </p>
              <Button
                onClick={handleOpenSession}
                disabled={isTransitioning}
                className="w-full min-h-[48px]"
              >
                {isTransitioning ? 'Activating...' : 'Confirm & start collecting feedback'}
              </Button>
              <p className="text-xs text-gray-600 text-center">
                Participant page becomes interactive.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Primary action block - Active */}
        {session.state === 'active' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Button
                className="w-full min-h-[48px]"
                onClick={handleCopyLink}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy participant link
              </Button>
              <Button
                variant="outline"
                className="w-full min-h-[48px]"
                onClick={() => window.open(participantUrl, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open participant page
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Live status block - Active */}
        {session.state === 'active' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    Collecting feedback
                  </span>
                </div>
                <span className="text-sm text-gray-600">{responses.length} responses</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Primary action block - Completed */}
        {session.state === 'completed' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Button
                className="w-full min-h-[48px]"
                onClick={fetchResults}
              >
                View audience feedback
              </Button>
              <p className="text-sm text-gray-600 text-center">
                Session closed. {responses.length} responses collected.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Participant link section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Participant link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono text-gray-900 flex-1 break-all">
                {participantUrl}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="min-h-[40px] shrink-0"
              >
                Copy
              </Button>
            </div>
            <a
              href={participantUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800"
            >
              <ExternalLink className="h-3 w-3" />
              {session.state === 'draft' ? 'Preview participant page' : 'Open participant page'}
            </a>
          </CardContent>
        </Card>

        {/* Details accordion */}
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <span>Details</span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 rounded-lg border bg-white p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Session ID</span>
              <span className="font-mono text-gray-700">{session.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Slug</span>
              <span className="font-mono text-gray-700">{session.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Edits</span>
              <span className="text-gray-700">
                {session.hasUnpublishedChanges ? 'Unpublished changes' : 'Up to date'}
              </span>
            </div>
            {session.publishedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Last published</span>
                <span className="text-gray-700">{session.publishedAt.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </details>

        {/* Tabs */}
        <Tabs defaultValue={session.state === 'active' ? 'results' : 'details'} className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Session details</TabsTrigger>
            <TabsTrigger value="results" onClick={fetchResults}>Audience feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-700">Welcome message (Live)</h3>
                  {session.publishedWelcomeMessage !== session.welcomeMessage && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {SECTION_INDICATORS.edited}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-900">
                  {session.welcomeMessage || <span className="text-gray-400">No welcome message</span>}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">Full Summary</h3>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {session.summaryFull || <span className="text-gray-400">No summary</span>}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-700">Overview summary (Live)</h3>
                  {session.publishedSummaryCondensed !== session.summaryCondensed && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {SECTION_INDICATORS.edited}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-900">
                  {session.summaryCondensed || <span className="text-gray-400">No condensed summary</span>}
                </p>
              </div>

              {/* Topics section - show published topics */}
              {session.publishedTopics && session.publishedTopics.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Topics ({session.publishedTopics.length})</h3>
                  <ul className="space-y-1">
                    {session.publishedTopics.map((topic, idx) => (
                      <li key={topic.themeId || idx} className="text-sm text-gray-900">
                        {idx + 1}. {topic.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {resultsLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
                    <p className="text-gray-600">Loading results...</p>
                  </div>
                </CardContent>
              </Card>
            ) : resultsError ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-red-600">{resultsError}</p>
                  <Button onClick={fetchResults} variant="outline" className="mt-4">
                    Try again
                  </Button>
                </CardContent>
              </Card>
            ) : themeResults.length === 0 && responses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">No responses yet.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Share the participant link to start collecting feedback.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Theme results */}
                {themeResults.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Topic Prioritization</CardTitle>
                      <CardDescription>
                        Sorted by net interest (more minus less)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {themeResults.map((theme) => (
                          <div key={theme.themeId} className="rounded-lg border border-gray-200 bg-white p-3">
                            <p className="text-sm font-medium text-gray-900 mb-2 break-words">{theme.text}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                              <span className="text-green-600">👍 {theme.more}</span>
                              <span className="text-red-600">👎 {theme.less}</span>
                              <span className={`font-medium ${theme.net > 0 ? 'text-green-700' : theme.net < 0 ? 'text-red-700' : 'text-gray-600'}`}>
                                Net: {theme.net > 0 ? '+' : ''}{theme.net}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Individual responses */}
                {responses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Individual Responses</CardTitle>
                      <CardDescription>{responses.length} responses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {responses.map((response) => (
                          <div key={response.id} className="rounded-lg border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {response.participantName || 'Anonymous'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {response.createdAt.toLocaleDateString()}
                              </span>
                            </div>
                            {response.participantEmail && (
                              <p className="text-xs text-gray-600 mb-2 break-all">
                                {response.participantEmail}
                              </p>
                            )}
                            {response.freeFormText && (
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {response.freeFormText}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Close Session Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this session?</AlertDialogTitle>
            <AlertDialogDescription>
              The participant link will remain active, but you can move to reviewing results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseSession} disabled={isTransitioning}>
              {isTransitioning ? 'Closing...' : 'Close session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Session Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this session?</AlertDialogTitle>
            <AlertDialogDescription>
              The participant link will show "session closed" and no more responses will be accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveSession} disabled={isTransitioning}>
              {isTransitioning ? 'Archiving...' : 'Archive session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showNavigateAwayDialog} onOpenChange={setShowNavigateAwayDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{NAVIGATION_GUARDRAIL.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {NAVIGATION_GUARDRAIL.body}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowNavigateAwayDialog(false);
              setPendingNavigation(null);
            }}>
              {NAVIGATION_GUARDRAIL.stayButton}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowNavigateAwayDialog(false);
              if (pendingNavigation) {
                navigate(pendingNavigation);
                setPendingNavigation(null);
              }
            }}>
              {NAVIGATION_GUARDRAIL.leaveButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
