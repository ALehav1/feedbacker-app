import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SessionCreate() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Session</h1>
              <p className="text-sm text-gray-600">
                Set up a new feedback session for your audience
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
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Session Setup</CardTitle>
            <CardDescription>
              The session creation wizard will be implemented here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              Next steps: Collect session length, summary, and generate themes via AI.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
