import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'

interface FormData {
  lengthMinutes: string;
  title: string;
  welcomeMessage: string;
  summaryFull: string;
  summaryCondensed: string;
}

export function SessionCreate() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    lengthMinutes: '',
    title: '',
    welcomeMessage: '',
    summaryFull: '',
    summaryCondensed: '',
  })

  const generateSlug = (): string => {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'Please sign in to create a session.',
      })
      return
    }

    const lengthMinutes = parseInt(formData.lengthMinutes, 10)
    if (isNaN(lengthMinutes) || lengthMinutes <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid length',
        description: 'Session length must be a positive number.',
      })
      return
    }

    if (!formData.title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Title required',
        description: 'Please enter a session title.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const slug = generateSlug()

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          presenter_id: user.id,
          state: 'draft',
          length_minutes: lengthMinutes,
          title: formData.title.trim(),
          welcome_message: formData.welcomeMessage.trim(),
          summary_full: formData.summaryFull.trim(),
          summary_condensed: formData.summaryCondensed.trim(),
          slug,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast({
            variant: 'destructive',
            title: 'Slug conflict',
            description: 'Please try again.',
          })
        } else {
          console.error('Session creation error:', error)
          toast({
            variant: 'destructive',
            title: 'Creation failed',
            description: 'Unable to create session. Please try again.',
          })
        }
        return
      }

      if (data) {
        toast({
          title: 'Session created',
          description: 'Your draft session has been created.',
        })
        navigate(`/dashboard/sessions/${data.id}`)
      }
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
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>
              Fill in the details for your feedback session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="lengthMinutes">
                  Session Length (minutes) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lengthMinutes"
                  type="number"
                  min="1"
                  placeholder="e.g., 30"
                  value={formData.lengthMinutes}
                  onChange={(e) => setFormData({ ...formData, lengthMinutes: e.target.value })}
                  disabled={isSubmitting}
                  required
                  className="min-h-[48px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">
                  Session Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g., Q4 Product Roadmap Review"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={isSubmitting}
                  required
                  className="min-h-[48px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <Textarea
                  id="welcomeMessage"
                  placeholder="A message to greet your participants..."
                  value={formData.welcomeMessage}
                  onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                  disabled={isSubmitting}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summaryFull">Full Summary</Label>
                <Textarea
                  id="summaryFull"
                  placeholder="Detailed description of what you'll be presenting..."
                  value={formData.summaryFull}
                  onChange={(e) => setFormData({ ...formData, summaryFull: e.target.value })}
                  disabled={isSubmitting}
                  rows={6}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summaryCondensed">Condensed Summary</Label>
                <Textarea
                  id="summaryCondensed"
                  placeholder="Brief overview (1-2 sentences)..."
                  value={formData.summaryCondensed}
                  onChange={(e) => setFormData({ ...formData, summaryCondensed: e.target.value })}
                  disabled={isSubmitting}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={isSubmitting}
                  className="min-h-[56px] flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[56px] flex-1"
                >
                  {isSubmitting ? 'Creating...' : 'Create Session'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
