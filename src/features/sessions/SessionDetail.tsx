import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SessionDetail() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Session Details</h1>
              <p className="text-sm text-gray-600">ID: {sessionId}</p>
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
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Session Detail</CardTitle>
            <CardDescription>
              Session management and results view will be implemented here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              Next steps: Fetch session from Supabase, show state, manage transitions, view responses.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
