/**
 * BASELINE_LOCK (Jan 18, 2026)
 * This module is part of the frozen baseline. Avoid edits unless fixing a confirmed bug.
 * If edits are required: keep diff minimal and document reason in docs/BASELINE_LOCK.md.
 */

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ThemeSelector } from '@/components/ThemeSelector'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { classifySupabaseError } from '@/lib/supabaseErrors'
import { PARTICIPANT_COPY } from '@/lib/copy'
import { validateShareToken } from '@/lib/shareLink'
import { serializeSuggestionsAndFreeform } from '@/lib/suggestions'
import type { Session, Theme } from '@/types'

type ThemeSelection = 'more' | 'less' | null

// Supabase row types

export function FeedbackForm() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const previewRequested = searchParams.get('preview') === 'working'
  const shareToken = searchParams.get('k')
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [presenterName, setPresenterName] = useState<string>('')
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selections, setSelections] = useState<Record<string, ThemeSelection>>({})
  const [participantName, setParticipantName] = useState('')
  const [participantEmail, setParticipantEmail] = useState('')
  const [suggestedTopicsRaw, setSuggestedTopicsRaw] = useState('')
  const [freeform, setFreeform] = useState('')

  useEffect(() => {
    const fetchSessionAndThemes = async () => {
      if (!slug) {
        setError('No session slug provided')
        setLoading(false)
        return
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('slug', slug)
          .single()

        if (sessionError) {
          console.error('Error fetching session:', sessionError)
          const kind = classifySupabaseError(sessionError)
          if (kind === 'not_found') {
            setError('Presentation not found')
          } else if (kind === 'rls') {
            setError("This session isn't available right now. Please contact the organizer.")
          } else {
            setError('Temporary issue loading this session. Please try again.')
            setCanRetry(true)
          }
          setLoading(false)
          return
        }

        if (sessionData) {
          const mappedSession: Session = {
            id: sessionData.id,
            presenterId: sessionData.presenter_id,
            state: sessionData.state as Session['state'],
            lengthMinutes: sessionData.length_minutes,
            title: sessionData.title,
            welcomeMessage: sessionData.welcome_message,
            summaryFull: sessionData.summary_full,
            summaryCondensed: sessionData.summary_condensed,
            slug: sessionData.slug,
            topicsSource: (sessionData.topics_source as 'generated' | 'manual') || 'generated',
            publishedWelcomeMessage: sessionData.published_welcome_message,
            publishedSummaryCondensed: sessionData.published_summary_condensed,
            publishedTopics: sessionData.published_topics || [],
            publishedAt: sessionData.published_at ? new Date(sessionData.published_at) : undefined,
            publishedShareToken: sessionData.published_share_token ?? null,
            publishedVersion: sessionData.published_version ?? null,
            hasUnpublishedChanges: sessionData.has_unpublished_changes || false,
            createdAt: new Date(sessionData.created_at),
            updatedAt: new Date(sessionData.updated_at),
          }

          setSession(mappedSession)

          // Fetch presenter name
          const { data: presenterData } = await supabase
            .from('presenters')
            .select('name')
            .eq('id', mappedSession.presenterId)
            .single()
          
          if (presenterData) {
            setPresenterName(presenterData.name)
          }

          // Access control: Only presenter can preview working version
          const canPreview = !!(previewRequested && user && user.id === mappedSession.presenterId)
          setIsPreviewMode(canPreview)

          if (previewRequested && !canPreview) {
            setError('Sign in to preview this presentation.')
            setLoading(false)
            return
          }

          const hasPublishedTopics = (mappedSession.publishedTopics || []).length > 0

          if (!canPreview && hasPublishedTopics) {
            const tokenStatus = validateShareToken(
              mappedSession.publishedShareToken,
              shareToken
            )

            if (tokenStatus === 'expired') {
              setError('This link has expired. Please ask the presenter for a new link.')
              setLoading(false)
              return
            }
          }

          // If preview mode (and authorized), fetch working themes; otherwise use published topics
          if (canPreview) {
            const { data: themesData, error: themesError } = await supabase
              .from('themes')
              .select('*')
              .eq('session_id', mappedSession.id)
              .eq('is_active', true)
              .order('sort_order', { ascending: true })

            if (themesError) {
              console.error('Error fetching themes:', themesError)
            } else if (themesData) {
              const workingThemes: Theme[] = themesData.map((t: {
                id: string;
                session_id: string;
                text: string;
                sort_order: number;
                created_at: string;
              }) => ({
                id: t.id,
                sessionId: t.session_id,
                text: t.text,
                sortOrder: t.sort_order,
                createdAt: new Date(t.created_at),
              }))
              setThemes(workingThemes)
            }
          } else {
            // Read published topics instead of working themes table
            const publishedThemes: Theme[] = (mappedSession.publishedTopics || []).map((t) => ({
              id: t.themeId,
              sessionId: mappedSession.id,
              text: t.text,
              sortOrder: t.sortOrder,
              createdAt: new Date(), // Not stored in published snapshot
            }))
            setThemes(publishedThemes)
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchSessionAndThemes()
  }, [slug, previewRequested, shareToken, user])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
          <p className="text-gray-600">Loading presentation...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    const errorTitle = canRetry
      ? 'Connection Issue'
      : error?.includes('expired')
        ? 'Link expired'
        : error?.includes('Sign in')
          ? 'Sign in required'
          : 'Presentation Not Found'
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{errorTitle}</CardTitle>
            <CardDescription>{error || 'This session does not exist'}</CardDescription>
          </CardHeader>
          {canRetry && (
            <CardContent>
              <Button
                onClick={() => {
                  setError(null)
                  setCanRetry(false)
                  setLoading(true)
                  window.location.reload()
                }}
                className="w-full min-h-[48px]"
              >
                Retry
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    )
  }

  // Draft and closed feedback sessions render full content
  // Feedback interactions are disabled via banner and disabled controls

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Thank You!</CardTitle>
            <CardDescription>
              Your feedback has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Your input will help shape this presentation. You can close this tab now.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSelectionChange = (themeId: string, selection: ThemeSelection) => {
    setSelections((prev) => ({
      ...prev,
      [themeId]: selection,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (session.state !== 'active') {
      toast({
        variant: 'destructive',
        title: 'Feedback not available',
        description: 'Participant feedback is not currently open.',
      })
      return
    }

    if (participantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participantEmail)) {
      toast({
        variant: 'destructive',
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
      })
      return
    }

    const selectedThemes = Object.entries(selections)
      .filter(([_, selection]) => selection !== null)
      .map(([themeId, selection]) => ({ themeId, selection: selection! }))

    if (selectedThemes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No topics selected',
        description: 'Please select at least one topic.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const participantToken = crypto.randomUUID()
      const freeformPayload = serializeSuggestionsAndFreeform(suggestedTopicsRaw, freeform)

      const { data: responseData, error: responseError } = await supabase
        .from('responses')
        .insert({
          session_id: session.id,
          participant_email: participantEmail || `anon-${participantToken}@feedbacker.app`,
          name: participantName || null,
          followup_email: participantEmail || null,
          free_form_text: freeformPayload,
          participant_token: participantToken,
        })
        .select()
        .single()

      if (responseError) {
        console.error('Error creating response:', responseError)
        toast({
          variant: 'destructive',
          title: 'Submission failed',
          description: 'Unable to submit your feedback. Please try again.',
        })
        return
      }

      const themeSelectionsData = selectedThemes.map((st) => ({
        response_id: responseData.id,
        theme_id: st.themeId,
        selection: st.selection,
      }))

      const { error: selectionsError } = await supabase
        .from('theme_selections')
        .insert(themeSelectionsData)

      if (selectionsError) {
        console.error('Error creating theme selections:', selectionsError)
        await supabase.from('responses').delete().eq('id', responseData.id)
        toast({
          variant: 'destructive',
          title: 'Submission failed',
          description: 'Unable to save your theme selections. Please try again.',
        })
        return
      }

      if (slug) {
        localStorage.setItem(`feedbacker-submitted-${slug}`, participantToken)
      }

      setSubmitted(true)
      toast({
        title: 'Feedback submitted',
        description: 'Thank you for your input!',
      })
    } catch (err) {
      console.error('Unexpected error:', err)
      toast({
        variant: 'destructive',
        title: 'Unexpected error',
        description: 'Something went wrong. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasSelections = Object.values(selections).some((s) => s !== null)
  const isDraft = (session.state as string) === 'draft'
  const isFeedbackClosed = (session.state as string) === 'completed' || (session.state as string) === 'archived'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {isPreviewMode && (
          <div className="mb-4 rounded-lg border border-violet-300 bg-violet-50 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-violet-900 mb-1">Preview mode — working version</h3>
            <p className="text-sm text-violet-700 leading-relaxed">
              Viewing your unpublished changes. Participants still see the live version until you publish.
            </p>
          </div>
        )}
        {isDraft && !isPreviewMode && (
          <div className="mb-4 rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Presentation draft</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Preview only. Feedback collection starts after the presenter confirms and saves.
            </p>
          </div>
        )}
        {isFeedbackClosed && !isPreviewMode && (
          <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">Participant feedback is closed.</h3>
            <p className="text-sm text-blue-700 leading-relaxed">
              You can still review the presentation below, but feedback can no longer be submitted.
            </p>
          </div>
        )}
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* 1. Welcome Message (FIRST) */}
            {(isPreviewMode ? session.welcomeMessage : session.publishedWelcomeMessage) && (
              <div>
                <p className="text-base text-gray-900 leading-relaxed">
                  {isPreviewMode ? session.welcomeMessage : session.publishedWelcomeMessage}
                </p>
              </div>
            )}

            {/* 2. Presentation Metadata (SECOND) */}
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Presentation Title:</span> {session.title}
                </p>
                {presenterName && (
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Presenter:</span> {presenterName}
                  </p>
                )}
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Length:</span> {session.lengthMinutes} minutes
                </p>
              </div>
            </div>

            {/* 3. Presentation Overview */}
            {(isPreviewMode ? session.summaryCondensed : session.publishedSummaryCondensed) && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Presentation Overview</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {isPreviewMode ? session.summaryCondensed : session.publishedSummaryCondensed}
                </p>
              </div>
            )}

            {/* 4. Proposed Topics */}
            {themes.length === 0 && !isDraft ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {PARTICIPANT_COPY.setupInProgressTitle}
                </p>
                <p className="text-sm text-gray-600">
                  {PARTICIPANT_COPY.setupInProgressBody}
                </p>
              </div>
            ) : themes.length > 0 ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Proposed Topics
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Tell the presenter which topics to spend more time on and which to spend less time on.
                  </p>
                  <div className="space-y-3">
                    {themes.map((theme) => (
                      <div key={theme.id}>
                        <ThemeSelector
                          text={theme.text}
                          selection={selections[theme.id] || null}
                          onSelect={(selection) => handleSelectionChange(theme.id, selection)}
                          disabled={isSubmitting || isDraft || isFeedbackClosed}
                        />
                      </div>
                    ))}
                  </div>
                  {isDraft && (
                    <p className="text-xs text-gray-500 mt-3">
                      Topics are visible while this is a draft. Feedback collection opens when the presenter activates this presentation.
                    </p>
                  )}
                  {isFeedbackClosed && (
                    <p className="text-xs text-blue-700 mt-3">
                      Feedback is closed. Topics are shown for reference only.
                    </p>
                  )}
                </div>

                <div className="border-t pt-6 space-y-3">
                  <Label htmlFor="suggestedTopics">Suggested topics (optional)</Label>
                  <Textarea
                    id="suggestedTopics"
                    placeholder={`Pricing strategy\n- Packaging\n- Renewal motion`}
                    value={suggestedTopicsRaw}
                    onChange={(e) => setSuggestedTopicsRaw(e.target.value)}
                    disabled={isSubmitting}
                    rows={4}
                    className="resize-none"
                  />
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Add topics you want covered that aren’t listed.</p>
                    <p>One topic per line.</p>
                    <p>Sub-bullets start with - and start at the beginning of the line.</p>
                    <p>Blank line = new bullet.</p>
                    <p className="whitespace-pre-line text-gray-700">
Pricing strategy
- Packaging
- Renewal motion
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Optional: Tell us more</h3>

                  <div className="space-y-2">
                    <Label htmlFor="participantName">Your Name</Label>
                    <Input
                      id="participantName"
                      type="text"
                      placeholder="e.g., Alex Smith"
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      disabled={isSubmitting}
                      className="min-h-[48px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="participantEmail">Your Email</Label>
                    <Input
                      id="participantEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={participantEmail}
                      onChange={(e) => setParticipantEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="min-h-[48px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="freeform">Additional Thoughts</Label>
                    <Textarea
                      id="freeform"
                      placeholder="Any specific questions or topics you'd like covered..."
                      value={freeform}
                      onChange={(e) => setFreeform(e.target.value)}
                      disabled={isSubmitting}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!hasSelections || isSubmitting || isDraft || isFeedbackClosed}
                  className="w-full min-h-[56px]"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
                {isDraft && (
                  <p className="text-xs text-gray-500 text-center">
                    Participant feedback has not been opened yet.
                  </p>
                )}
                {isFeedbackClosed && (
                  <p className="text-xs text-blue-700 text-center">
                    Feedback is closed.
                  </p>
                )}
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
