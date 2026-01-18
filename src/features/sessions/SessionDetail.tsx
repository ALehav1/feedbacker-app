import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import type { Session } from '@/types'

export function SessionDetail() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        <div className="space-y-6">
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
                <h3 className="text-sm font-medium text-gray-700">Shareable Link</h3>
                <p className="mt-1 text-sm font-mono text-gray-900">
                  {window.location.origin}/s/{session.slug}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>
                State management and results view will be implemented here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                Future: Add state transition buttons, view responses, generate AI outline
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
