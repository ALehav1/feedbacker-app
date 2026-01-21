import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Session, Theme } from '@/types'

export function SessionEdit() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { sessionId } = useParams<{ sessionId: string }>()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [themes, setThemes] = useState<Theme[]>([])
  
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [summaryCondensed, setSummaryCondensed] = useState('')
  const [summaryFull, setSummaryFull] = useState('')

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

      const { data: themesData } = await supabase
        .from('themes')
        .select('*')
        .eq('session_id', sessionId)
        .order('sort_order', { ascending: true })

      if (themesData) {
        setThemes(themesData.map((t: { id: string; session_id: string; text: string; sort_order: number }) => ({
          id: t.id,
          sessionId: t.session_id,
          text: t.text,
          sortOrder: t.sort_order,
        })))
      }

      setLoading(false)
    }

    fetchSession()
  }, [sessionId, navigate, toast])

  const handleSave = async () => {
    if (!session || !user) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          welcome_message: welcomeMessage,
          summary_condensed: summaryCondensed,
          summary_full: summaryFull,
          has_unpublished_changes: true,
        })
        .eq('id', sessionId)

      if (error) {
        console.error('[SessionEdit] Update failed:', error)
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: error.message || 'Unable to save changes',
        })
        setSaving(false)
        return
      }

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
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Edit Session</h1>
              <p className="text-sm text-gray-600 mt-1">{session.title}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/sessions/${sessionId}`)}
            >
              Cancel
            </Button>
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

            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Topics</h3>
              {themes.length > 0 ? (
                <div className="space-y-2">
                  {themes.map((theme) => (
                    <div
                      key={theme.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <p className="text-sm text-gray-900">{theme.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No topics</p>
              )}
              <p className="text-xs text-gray-500 mt-3">
                Topic editing coming soon. For now, you can edit text fields above.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="min-h-[48px] flex-1"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/dashboard/sessions/${sessionId}`)}
                disabled={saving}
                className="min-h-[48px]"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
