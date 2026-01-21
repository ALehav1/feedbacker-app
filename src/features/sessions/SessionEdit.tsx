import { useEffect, useState } from 'react'
import { useNavigate, useParams, useBlocker } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { Pencil, Trash2, Plus, RefreshCw, ArrowLeft } from 'lucide-react'
import type { Session, Theme } from '@/types'

// Helper: check if a topic text is a "fragment" (short, no structural delimiters)
function isFragmentTopic(text: string): boolean {
  const SHORT_THRESHOLD = 20
  const hasDelimiter = /[:—\-•*]/.test(text)
  const isSingleWord = !text.includes(' ')
  return (text.length <= SHORT_THRESHOLD || isSingleWord) && !hasDelimiter
}

// Helper: normalize text for deduplication (lowercase, strip punctuation)
function normalizeForDedup(text: string): string {
  return text.toLowerCase().replace(/[?!.,;:'"]+/g, '').trim()
}

// Helper function to regenerate topics from outline
function createTopicsFromOutline(outline: string): Theme[] {
  const MAX_TOPICS = 12
  const MAX_TOPIC_LENGTH = 120
  const MAX_DETAILS_PER_TOPIC = 6
  const lines = outline.split('\n')

  interface ParsedTopic {
    text: string
    details: string[]
  }

  const topics: ParsedTopic[] = []
  let currentTopic: ParsedTopic | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const isIndented = line.startsWith('  ') || line.startsWith('\t')
    const startsWithDash = trimmed.startsWith('—') || trimmed.startsWith('-')

    const normalized = trimmed
      .replace(/^[-*•—]\s*/, '')
      .replace(/^\d+[.)]\s*/, '')
      .replace(/^Topic:\s*/i, '')
      .trim()
      .replace(/[.,;:]$/, '')
      .trim()

    if (!normalized || normalized.length > MAX_TOPIC_LENGTH) continue

    const isDetail = currentTopic && (isIndented || (startsWithDash && currentTopic.details.length === 0))

    if (isDetail && currentTopic) {
      if (currentTopic.details.length < MAX_DETAILS_PER_TOPIC) {
        const lowerDetail = normalized.toLowerCase()
        if (!currentTopic.details.some(d => d.toLowerCase() === lowerDetail)) {
          currentTopic.details.push(normalized)
        }
      }
    } else {
      currentTopic = { text: normalized, details: [] }
      topics.push(currentTopic)
    }
  }

  // Phase 2: Collapse consecutive "fragment" topics into one
  const collapsedTopics: ParsedTopic[] = []
  let fragmentBuffer: string[] = []

  for (const topic of topics) {
    if (isFragmentTopic(topic.text)) {
      fragmentBuffer.push(topic.text)
      // Also preserve any details from fragment topics
      if (topic.details.length > 0 && collapsedTopics.length > 0) {
        collapsedTopics[collapsedTopics.length - 1].details.push(...topic.details)
      }
    } else {
      // Flush fragment buffer if non-empty
      if (fragmentBuffer.length > 1) {
        // Merge fragments into one topic
        const merged = fragmentBuffer.join(' ')
        collapsedTopics.push({ text: merged, details: [] })
      } else if (fragmentBuffer.length === 1) {
        // Single fragment, keep as-is
        collapsedTopics.push({ text: fragmentBuffer[0], details: [] })
      }
      fragmentBuffer = []
      collapsedTopics.push(topic)
    }
  }
  // Flush remaining fragments
  if (fragmentBuffer.length > 1) {
    collapsedTopics.push({ text: fragmentBuffer.join(' '), details: [] })
  } else if (fragmentBuffer.length === 1) {
    collapsedTopics.push({ text: fragmentBuffer[0], details: [] })
  }

  // Phase 3: Dedupe using normalized text (handles "why?" vs "Why")
  const uniqueTopics: ParsedTopic[] = []
  const seen = new Set<string>()

  for (const topic of collapsedTopics) {
    const normalizedText = normalizeForDedup(topic.text)
    if (!seen.has(normalizedText) && uniqueTopics.length < MAX_TOPICS) {
      seen.add(normalizedText)
      uniqueTopics.push(topic)
    }
  }

  return uniqueTopics.map((topic, index) => ({
    id: crypto.randomUUID(),
    text: topic.text,
    sortOrder: index + 1,
    details: topic.details.length > 0 ? topic.details : undefined,
  }))
}

export function SessionEdit() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { sessionId } = useParams<{ sessionId: string }>()

  // Log mount context for debugging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[SessionEdit] Mount context:', {
        pathname: window.location.pathname,
        sessionId,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      })
    }
  }, [sessionId, user?.id])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [themes, setThemes] = useState<Theme[]>([])
  
  // Form state
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [summaryCondensed, setSummaryCondensed] = useState('')
  const [summaryFull, setSummaryFull] = useState('')
  
  // Initial values for dirty checking
  const [initialWelcome, setInitialWelcome] = useState('')
  const [initialSummaryCondensed, setInitialSummaryCondensed] = useState('')
  const [initialSummaryFull, setInitialSummaryFull] = useState('')
  const [initialThemes, setInitialThemes] = useState<Theme[]>([])
  
  // Topic editing state
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [newTopicText, setNewTopicText] = useState('')
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Dirty state detection
  const isDirty = 
    welcomeMessage !== initialWelcome ||
    summaryCondensed !== initialSummaryCondensed ||
    summaryFull !== initialSummaryFull ||
    JSON.stringify(themes) !== JSON.stringify(initialThemes)

  // Browser beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Popstate interception for iOS Chrome back button
  // iOS Safari/Chrome don't always trigger beforeunload on back swipe
  useEffect(() => {
    if (!isDirty) return

    // Push a state so we can detect back navigation
    window.history.pushState({ sessionEditGuard: true }, '')

    const handlePopstate = (_e: PopStateEvent) => {
      if (isDirty) {
        // Re-push state to prevent navigation
        window.history.pushState({ sessionEditGuard: true }, '')
        // Show the dialog
        setShowUnsavedDialog(true)
        setPendingNavigation('/dashboard')
      }
    }

    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [isDirty])

  // Local draft persistence for recovery after crash/refresh
  const draftKey = sessionId ? `feedbacker-draft-${sessionId}` : null

  // Save draft to localStorage when dirty
  useEffect(() => {
    if (!draftKey || !isDirty) return

    const draft = {
      welcomeMessage,
      summaryCondensed,
      summaryFull,
      themes,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(draftKey, JSON.stringify(draft))
  }, [draftKey, isDirty, welcomeMessage, summaryCondensed, summaryFull, themes])

  // Clear draft after successful save (isDirty becomes false)
  useEffect(() => {
    if (draftKey && !isDirty) {
      localStorage.removeItem(draftKey)
    }
  }, [draftKey, isDirty])

  // State for restore prompt
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const [savedDraft, setSavedDraft] = useState<{
    welcomeMessage: string
    summaryCondensed: string
    summaryFull: string
    themes: Theme[]
    savedAt: string
  } | null>(null)

  // React Router navigation blocker
  const blocker = useBlocker(isDirty)

  // Handle blocked navigation by showing dialog
  if (blocker.state === 'blocked' && !showUnsavedDialog) {
    setShowUnsavedDialog(true)
    setPendingNavigation(blocker.location.pathname)
  }

  useEffect(() => {
    if (!sessionId) return

    async function fetchSession() {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error || !data) {
        console.error('[SessionEdit] Session fetch failed:', { error, sessionId })
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load session',
        })
        navigate('/dashboard')
        return
      }

      // Debug snapshot (dev only): log raw payload shape
      if (import.meta.env.DEV) {
        console.log('[SessionEdit] Session payload snapshot:', {
          id: data.id,
          state: data.state,
          hasWelcome: !!data.welcome_message,
          hasSummaryFull: !!data.summary_full,
          hasSummaryCondensed: !!data.summary_condensed,
          topicsSource: data.topics_source,
          publishedTopicsCount: Array.isArray(data.published_topics) ? data.published_topics.length : 'not array',
          publishedTopicsType: typeof data.published_topics,
        })
      }

      // Normalize payload defensively
      const normalizedData = {
        ...data,
        welcome_message: data.welcome_message ?? '',
        summary_full: data.summary_full ?? '',
        summary_condensed: data.summary_condensed ?? '',
        topics_source: data.topics_source ?? 'generated',
        published_topics: Array.isArray(data.published_topics) ? data.published_topics : [],
      }

      const mappedSession: Session = {
        id: normalizedData.id,
        presenterId: normalizedData.presenter_id,
        state: normalizedData.state as Session['state'],
        lengthMinutes: normalizedData.length_minutes,
        title: normalizedData.title,
        welcomeMessage: normalizedData.welcome_message,
        summaryFull: normalizedData.summary_full,
        summaryCondensed: normalizedData.summary_condensed,
        slug: normalizedData.slug,
        topicsSource: normalizedData.topics_source as 'generated' | 'manual',
        publishedWelcomeMessage: normalizedData.published_welcome_message,
        publishedSummaryCondensed: normalizedData.published_summary_condensed,
        publishedTopics: normalizedData.published_topics,
        publishedAt: normalizedData.published_at ? new Date(normalizedData.published_at) : undefined,
        hasUnpublishedChanges: normalizedData.has_unpublished_changes || false,
        createdAt: new Date(normalizedData.created_at),
        updatedAt: new Date(normalizedData.updated_at),
      }

      setSession(mappedSession)
      setWelcomeMessage(mappedSession.welcomeMessage)
      setSummaryCondensed(mappedSession.summaryCondensed)
      setSummaryFull(mappedSession.summaryFull)
      
      setInitialWelcome(mappedSession.welcomeMessage)
      setInitialSummaryCondensed(mappedSession.summaryCondensed)
      setInitialSummaryFull(mappedSession.summaryFull)

      const { data: themesData } = await supabase
        .from('themes')
        .select('*')
        .eq('session_id', sessionId)
        .order('sort_order', { ascending: true })

      if (themesData) {
        const loadedThemes: Theme[] = themesData.map((t: { id: string; session_id: string; text: string; sort_order: number }) => ({
          id: t.id,
          sessionId: t.session_id,
          text: t.text,
          sortOrder: t.sort_order,
        }))
        setThemes(loadedThemes)
        setInitialThemes(loadedThemes)
      }

      // Check for saved draft to restore
      const draftKey = `feedbacker-draft-${sessionId}`
      const savedDraftStr = localStorage.getItem(draftKey)
      if (savedDraftStr) {
        try {
          const draft = JSON.parse(savedDraftStr)
          // Only offer restore if draft differs from current server state
          const hasDraftChanges =
            draft.welcomeMessage !== mappedSession.welcomeMessage ||
            draft.summaryCondensed !== mappedSession.summaryCondensed ||
            draft.summaryFull !== mappedSession.summaryFull ||
            JSON.stringify(draft.themes) !== JSON.stringify(themesData?.map((t: { id: string; text: string; sort_order: number }) => ({
              id: t.id,
              text: t.text,
              sortOrder: t.sort_order,
            })))

          if (hasDraftChanges) {
            setSavedDraft(draft)
            setShowRestorePrompt(true)
          } else {
            // Draft matches server state, clean it up
            localStorage.removeItem(draftKey)
          }
        } catch {
          // Invalid draft, remove it
          localStorage.removeItem(draftKey)
        }
      }

      setLoading(false)
    }

    fetchSession()
  }, [sessionId, navigate, toast])

  const handleSave = async () => {
    if (!session || !user) return

    setSaving(true)

    try {
      // Update session text fields
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({
          welcome_message: welcomeMessage.trim() || '',
          summary_condensed: summaryCondensed.trim() || '',
          summary_full: summaryFull.trim() || '',
          has_unpublished_changes: true,
        })
        .eq('id', sessionId)

      if (sessionError) {
        console.error('[SessionEdit] Session update failed:', sessionError)
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: sessionError.message || 'Unable to save changes',
        })
        setSaving(false)
        return
      }

      // Delete all existing themes and insert new ones
      await supabase.from('themes').delete().eq('session_id', sessionId)

      if (themes.length > 0) {
        const { error: themesError } = await supabase
          .from('themes')
          .insert(
            themes.map((theme) => ({
              id: theme.id,
              session_id: sessionId,
              text: theme.text,
              sort_order: theme.sortOrder,
            }))
          )

        if (themesError) {
          console.error('[SessionEdit] Themes insert failed:', themesError)
          toast({
            variant: 'destructive',
            title: 'Save failed',
            description: 'Topics could not be saved',
          })
          setSaving(false)
          return
        }
      }

      // Reset dirty state
      setInitialWelcome(welcomeMessage)
      setInitialSummaryCondensed(summaryCondensed)
      setInitialSummaryFull(summaryFull)
      setInitialThemes(themes)

      toast({
        title: 'Changes saved',
        description: 'Your edits are saved as working version. Publish to make them live.',
      })

      navigate(`/dashboard/sessions/${sessionId}`)
    } catch (err) {
      console.error('[SessionEdit] Unexpected error:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      })
      setSaving(false)
    }
  }

  const handleAddTopic = () => {
    if (!newTopicText.trim()) return

    const newTopic: Theme = {
      id: crypto.randomUUID(),
      text: newTopicText.trim(),
      sortOrder: themes.length + 1,
    }

    setThemes([...themes, newTopic])
    setNewTopicText('')

    // Mark topics as manually edited
    if (session) {
      supabase
        .from('sessions')
        .update({ topics_source: 'manual' })
        .eq('id', sessionId)
        .then(() => {
          setSession({ ...session, topicsSource: 'manual' })
        })
    }
  }

  const handleEditTopic = (topicId: string) => {
    const topic = themes.find(t => t.id === topicId)
    if (topic) {
      setEditingTopicId(topicId)
      setEditingText(topic.text)
    }
  }

  const handleSaveTopic = () => {
    if (!editingTopicId || !editingText.trim()) return

    setThemes(themes.map(t => 
      t.id === editingTopicId ? { ...t, text: editingText.trim() } : t
    ))
    setEditingTopicId(null)
    setEditingText('')

    // Mark topics as manually edited
    if (session) {
      supabase
        .from('sessions')
        .update({ topics_source: 'manual' })
        .eq('id', sessionId)
        .then(() => {
          setSession({ ...session, topicsSource: 'manual' })
        })
    }
  }

  const handleDeleteTopic = (topicId: string) => {
    const updated = themes.filter(t => t.id !== topicId)
    // Renumber sort order
    const renumbered = updated.map((t, i) => ({ ...t, sortOrder: i + 1 }))
    setThemes(renumbered)

    // Mark topics as manually edited
    if (session) {
      supabase
        .from('sessions')
        .update({ topics_source: 'manual' })
        .eq('id', sessionId)
        .then(() => {
          setSession({ ...session, topicsSource: 'manual' })
        })
    }
  }

  const handleRegenerateTopics = () => {
    setShowRegenerateDialog(true)
  }

  const confirmRegenerateTopics = async () => {
    const newTopics = createTopicsFromOutline(summaryFull)
    setThemes(newTopics)
    setShowRegenerateDialog(false)

    // Mark topics as generated
    if (session) {
      await supabase
        .from('sessions')
        .update({ topics_source: 'generated' })
        .eq('id', sessionId)
      
      setSession({ ...session, topicsSource: 'generated' })
    }

    toast({
      title: 'Topics regenerated',
      description: `${newTopics.length} topics created from your outline.`,
    })
  }

  const handleNavigate = (path: string) => {
    if (isDirty) {
      setShowUnsavedDialog(true)
      setPendingNavigation(path)
    } else {
      navigate(path)
    }
  }

  const confirmLeave = () => {
    setShowUnsavedDialog(false)
    if (pendingNavigation) {
      if (blocker.state === 'blocked') {
        blocker.proceed()
      } else {
        navigate(pendingNavigation)
      }
    }
  }

  const cancelLeave = () => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }

  // Crash test for ErrorBoundary verification (dev only)
  // Usage: Add ?crash=1 to URL to trigger controlled crash
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search)
    if (params.get('crash') === '1') {
      throw new Error('Controlled crash for ErrorBoundary testing')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Session not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-friendly header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 break-words">Edit Session</h1>
              <p className="text-sm text-gray-600 mt-1 break-words">{session.title}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => handleNavigate(`/dashboard/sessions/${sessionId}`)}
                className="w-full sm:w-auto min-h-[48px]"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleNavigate('/dashboard')}
                className="w-full sm:w-auto min-h-[48px]"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Working Version</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Welcome message</Label>
              <Textarea
                id="welcomeMessage"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Shown at the top of the participant page.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summaryCondensed">Overview summary</Label>
              <Textarea
                id="summaryCondensed"
                value={summaryCondensed}
                onChange={(e) => setSummaryCondensed(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Short description shown before the topics.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summaryFull">Your outline</Label>
              <Textarea
                id="summaryFull"
                value={summaryFull}
                onChange={(e) => setSummaryFull(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Your full outline for reference.
              </p>
            </div>

            {/* Topics editing section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Topics</h3>
                {summaryFull.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateTopics}
                    className="min-h-[40px]"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate from outline
                  </Button>
                )}
              </div>

              {/* Add new topic */}
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Add a topic…"
                  value={newTopicText}
                  onChange={(e) => setNewTopicText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTopic()
                    }
                  }}
                  className="flex-1 min-w-0 min-h-[48px]"
                />
                <Button
                  onClick={handleAddTopic}
                  className="shrink-0 min-h-[48px]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>

              {/* Topic list */}
              {themes.length > 0 ? (
                <div className="space-y-2">
                  {themes.map((theme) => (
                    <div
                      key={theme.id}
                      className="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      {editingTopicId === theme.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveTopic()
                              }
                              if (e.key === 'Escape') {
                                setEditingTopicId(null)
                                setEditingText('')
                              }
                            }}
                            className="flex-1 min-h-[40px]"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveTopic}
                            className="min-h-[40px]"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTopicId(null)
                              setEditingText('')
                            }}
                            className="min-h-[40px]"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 shrink-0">{theme.sortOrder}.</span>
                          <p className="text-sm text-gray-900 flex-1 min-w-0 break-words">{theme.text}</p>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditTopic(theme.id)}
                              className="min-h-[40px] min-w-[40px] p-2"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTopic(theme.id)}
                              className="min-h-[40px] min-w-[40px] p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No topics yet. Add one above or regenerate from your outline.</p>
              )}
            </div>

            {/* Save/Cancel buttons */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="min-h-[48px] w-full sm:flex-1"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleNavigate(`/dashboard/sessions/${sessionId}`)}
                disabled={saving}
                className="min-h-[48px] w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Regenerate confirmation dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate topics?</DialogTitle>
            <DialogDescription>
              This replaces your edited topics with a new list derived from your outline.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRegenerateTopics}>
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              Leave without saving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={cancelLeave}>
              Stay
            </Button>
            <Button variant="destructive" onClick={confirmLeave}>
              Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore draft dialog */}
      <Dialog open={showRestorePrompt} onOpenChange={setShowRestorePrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore unsaved changes?</DialogTitle>
            <DialogDescription>
              {savedDraft && (
                <>
                  You have unsaved changes from {new Date(savedDraft.savedAt).toLocaleString()}.
                  Would you like to restore them?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                // Discard draft
                if (draftKey) localStorage.removeItem(draftKey)
                setSavedDraft(null)
                setShowRestorePrompt(false)
              }}
            >
              Discard
            </Button>
            <Button
              onClick={() => {
                // Restore draft
                if (savedDraft) {
                  setWelcomeMessage(savedDraft.welcomeMessage)
                  setSummaryCondensed(savedDraft.summaryCondensed)
                  setSummaryFull(savedDraft.summaryFull)
                  setThemes(savedDraft.themes)
                }
                setSavedDraft(null)
                setShowRestorePrompt(false)
              }}
            >
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
