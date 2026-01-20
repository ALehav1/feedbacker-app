/**
 * BASELINE_LOCK (Jan 18, 2026)
 * This module is part of the frozen baseline. Avoid edits unless fixing a confirmed bug.
 * If edits are required: keep diff minimal and document reason in docs/BASELINE_LOCK.md.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
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
    draft: 'bg-gray-100 text-gray-800',
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    stateColors[session.state]
                  }`}
                >
                  {stateLabels[session.state]}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {session.lengthMinutes} minutes • Created {session.createdAt.toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="outline"
              className="min-h-[48px]"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="details" className="space-y-6">
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
                <h3 className="text-sm font-medium text-gray-700">Welcome Message</h3>
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
                <h3 className="text-sm font-medium text-gray-700">Condensed Summary</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {session.summaryCondensed || <span className="text-gray-400">No condensed summary</span>}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Shareable Link</h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-gray-900 flex-1">
                    {baseUrl}/s/{session.slug}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="min-h-[40px]"
                  >
                    Copy Link
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Session Actions</h3>
                <div className="flex gap-2">
                  {session.state === 'draft' && (
                    <Button
                      onClick={handleOpenSession}
                      disabled={isTransitioning}
                      className="min-h-[48px]"
                    >
                      {isTransitioning ? 'Opening...' : 'Open Session'}
                    </Button>
                  )}
                  {session.state === 'active' && (
                    <Button
                      onClick={() => setShowCloseDialog(true)}
                      disabled={isTransitioning}
                      variant="outline"
                      className="min-h-[48px]"
                    >
                      Close Session
                    </Button>
                  )}
                  {session.state === 'completed' && (
                    <Button
                      onClick={() => setShowArchiveDialog(true)}
                      disabled={isTransitioning}
                      variant="outline"
                      className="min-h-[48px]"
                    >
                      Archive Session
                    </Button>
                  )}
                  {session.state === 'archived' && (
                    <p className="text-sm text-gray-600">
                      This session is archived. No further actions available.
                    </p>
                  )}
                </div>
              </div>
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
                <CardHeader>
                  <CardTitle>Error Loading Results</CardTitle>
                  <CardDescription>{resultsError}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={fetchResults}>Retry</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="font-medium">Responses:</span> {responses.length}
                      </div>
                      <div>
                        <span className="font-medium">Themes:</span> {themeResults.length}
                      </div>
                      <div>
                        <span className="font-medium">Selections:</span>{' '}
                        {themeResults.reduce((sum, t) => sum + t.total, 0)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Topic Interest</CardTitle>
                    <CardDescription>
                      Topics ranked by participant interest
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {themeResults.length === 0 ? (
                      <p className="text-sm text-gray-600">No themes yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {themeResults.map((theme) => (
                          <div
                            key={theme.themeId}
                            className="rounded-lg border border-gray-200 bg-white p-4"
                          >
                            <p className="text-sm font-medium text-gray-900 mb-2">{theme.text}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="text-lg">👍</span>
                                <span className="font-medium">{theme.more}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-lg">👎</span>
                                <span className="font-medium">{theme.less}</span>
                              </div>
                              <div className="ml-auto">
                                <span className="font-medium">
                                  Net: {theme.net >= 0 ? '+' : ''}{theme.net}
                                </span>
                              </div>
                            </div>
                            {theme.total > 0 && (
                              <div className="mt-2">
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-violet-600 rounded-full"
                                    style={{
                                      width: `${Math.max(
                                        5,
                                        (theme.total / Math.max(...themeResults.map((t) => t.total), 1)) * 100
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Participant Responses</CardTitle>
                    <CardDescription>
                      Feedback from participants (newest first)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {responses.length === 0 ? (
                      <p className="text-sm text-gray-600">No feedback submitted yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {responses.map((response) => (
                          <div
                            key={response.id}
                            className="rounded-lg border border-gray-200 bg-white p-4"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm font-medium text-gray-900">
                                {response.participantName || 'Anonymous'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {response.createdAt.toLocaleDateString()}
                              </p>
                            </div>
                            {response.participantEmail && (
                              <p className="text-xs text-gray-600 mb-2">
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
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this session?</AlertDialogTitle>
            <AlertDialogDescription>
              Closing the session will immediately stop accepting new feedback. You can still
              view all collected results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseSession}>Close Session</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this session?</AlertDialogTitle>
            <AlertDialogDescription>
              Archiving will permanently close this session. The shareable link will show
              "Session Closed" to all visitors. You can still view results, but no new
              feedback will be accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveSession}>Archive Session</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
