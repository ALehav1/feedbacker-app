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

  const uniqueTopics: ParsedTopic[] = []
  const seen = new Set<string>()

  for (const topic of topics) {
    const lowerText = topic.text.toLowerCase()
    if (!seen.has(lowerText) && uniqueTopics.length < MAX_TOPICS) {
      seen.add(lowerText)
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
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load session',
        })
        navigate('/dashboard')
        return
      }

      const mappedSession: Session = {
        id: data.id,
        presenterId: data.presenter_id,
        state: data.state as Session['state'],
        lengthMinutes: data.length_minutes,
        title: data.title,
        welcomeMessage: data.welcome_message || '',
        summaryFull: data.summary_full || '',
        summaryCondensed: data.summary_condensed || '',
        slug: data.slug,
        topicsSource: (data.topics_source as 'generated' | 'manual') || 'generated',
        publishedWelcomeMessage: data.published_welcome_message,
        publishedSummaryCondensed: data.published_summary_condensed,
        publishedTopics: data.published_topics || [],
        publishedAt: data.published_at ? new Date(data.published_at) : undefined,
        hasUnpublishedChanges: data.has_unpublished_changes || false,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
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
    </div>
  )
}
