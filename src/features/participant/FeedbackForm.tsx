/**
 * BASELINE_LOCK (Jan 18, 2026)
 * This module is part of the frozen baseline. Avoid edits unless fixing a confirmed bug.
 * If edits are required: keep diff minimal and document reason in docs/BASELINE_LOCK.md.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ThemeSelector } from '@/components/ThemeSelector'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { PARTICIPANT_COPY } from '@/lib/copy'
import type { Session, Theme } from '@/types'

type ThemeSelection = 'more' | 'less' | null

// Supabase row types

export function FeedbackForm() {
  const { slug } = useParams<{ slug: string }>()
  const { toast } = useToast()
  const [session, setSession] = useState<Session | null>(null)
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selections, setSelections] = useState<Record<string, ThemeSelection>>({})
  const [participantName, setParticipantName] = useState('')
  const [participantEmail, setParticipantEmail] = useState('')
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
          setError('Session not found')
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
            publishedWelcomeMessage: sessionData.published_welcome_message,
            publishedSummaryCondensed: sessionData.published_summary_condensed,
            publishedTopics: sessionData.published_topics || [],
            publishedAt: sessionData.published_at ? new Date(sessionData.published_at) : undefined,
            hasUnpublishedChanges: sessionData.has_unpublished_changes || false,
            createdAt: new Date(sessionData.created_at),
            updatedAt: new Date(sessionData.updated_at),
          }

          setSession(mappedSession)

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
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchSessionAndThemes()
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Session Not Found</CardTitle>
            <CardDescription>{error || 'This session does not exist'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (session.state === 'draft') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Session Not Open Yet</CardTitle>
            <CardDescription>
              This session is still being set up. Please check back later!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (session.state === 'completed' || session.state === 'archived') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Session Closed</CardTitle>
            <CardDescription>
              This session is no longer accepting feedback. Thank you for your interest!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

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
        title: 'Session not active',
        description: 'This session is not currently accepting feedback.',
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

      const { data: responseData, error: responseError } = await supabase
        .from('responses')
        .insert({
          session_id: session.id,
          participant_email: participantEmail || `anon-${participantToken}@feedbacker.app`,
          name: participantName || null,
          followup_email: participantEmail || null,
          free_form_text: freeform || null,
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {isDraft && (
          <div className="mb-4 rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Session draft</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Preview only. Feedback collection starts after the presenter confirms and saves.
            </p>
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{session.title}</CardTitle>
            {session.publishedWelcomeMessage && (
              <CardDescription className="text-base">{session.publishedWelcomeMessage}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {session.publishedSummaryCondensed && (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {session.publishedSummaryCondensed}
                </p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Instructions</h3>
              <p className="text-sm text-gray-600">
                {PARTICIPANT_COPY.instructions}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Session length: {session.lengthMinutes} minutes
              </p>
            </div>

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
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Topics
                  </h3>
                  <div className="space-y-3">
                    {themes.map((theme) => (
                      <ThemeSelector
                        key={theme.id}
                        text={theme.text}
                        selection={selections[theme.id] || null}
                        onSelect={(selection) => handleSelectionChange(theme.id, selection)}
                        disabled={isSubmitting || isDraft}
                      />
                    ))}
                  </div>
                  {isDraft && (
                    <p className="text-xs text-gray-500 mt-3">
                      Topics are visible while this is a draft. Responses unlock when the session is active.
                    </p>
                  )}
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Optional: Tell us more</h3>

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
                  disabled={!hasSelections || isSubmitting || isDraft}
                  className="w-full min-h-[56px]"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
                {isDraft && (
                  <p className="text-xs text-gray-500 text-center">
                    This session is not collecting feedback yet.
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
