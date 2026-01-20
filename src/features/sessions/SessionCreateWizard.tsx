import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'

const WIZARD_STORAGE_KEY = 'feedbacker-wizard-state'

interface Theme {
  id: string
  text: string
  sortOrder: number
}

interface WizardData {
  lengthMinutes: string
  title: string
  welcomeMessage: string
  summaryFull: string
  summaryCondensed: string
  themes: Theme[]
}

const emptyWizardData: WizardData = {
  lengthMinutes: '',
  title: '',
  welcomeMessage: '',
  summaryFull: '',
  summaryCondensed: '',
  themes: [],
}

export function SessionCreateWizard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [wizardData, setWizardData] = useState<WizardData>(emptyWizardData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Theme editing state
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null)
  const [themeInputText, setThemeInputText] = useState('')

  // Load wizard state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(WIZARD_STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setWizardData(parsed)
      } catch (err) {
        console.error('Failed to parse wizard state:', err)
      }
    }
  }, [])

  // Save wizard state to localStorage on change
  useEffect(() => {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(wizardData))
  }, [wizardData])

  const clearWizardState = () => {
    localStorage.removeItem(WIZARD_STORAGE_KEY)
    setWizardData(emptyWizardData)
  }

  const generateSlug = (): string => {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
  }

  const handleNext = () => {
    if (currentStep === 1) {
      const lengthMinutes = parseInt(wizardData.lengthMinutes, 10)
      if (isNaN(lengthMinutes) || lengthMinutes <= 0) {
        toast({
          variant: 'destructive',
          title: 'Invalid length',
          description: 'Session length must be a positive number.',
        })
        return
      }
      if (!wizardData.title.trim()) {
        toast({
          variant: 'destructive',
          title: 'Title required',
          description: 'Please enter a session title.',
        })
        return
      }
    }

    if (currentStep === 2) {
      if (!wizardData.summaryFull.trim()) {
        toast({
          variant: 'destructive',
          title: 'Outline required',
          description: 'Please enter an outline or notes.',
        })
        return
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleAddTheme = () => {
    if (!themeInputText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Empty theme',
        description: 'Please enter theme text.',
      })
      return
    }

    const newTheme: Theme = {
      id: crypto.randomUUID(),
      text: themeInputText.trim(),
      sortOrder: wizardData.themes.length + 1,
    }

    setWizardData({
      ...wizardData,
      themes: [...wizardData.themes, newTheme],
    })
    setThemeInputText('')
  }

  const handleEditTheme = (themeId: string) => {
    const theme = wizardData.themes.find((t) => t.id === themeId)
    if (theme) {
      setEditingThemeId(themeId)
      setThemeInputText(theme.text)
    }
  }

  const handleSaveTheme = () => {
    if (!editingThemeId) return

    if (!themeInputText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Empty theme',
        description: 'Theme text cannot be empty.',
      })
      return
    }

    setWizardData({
      ...wizardData,
      themes: wizardData.themes.map((t) =>
        t.id === editingThemeId ? { ...t, text: themeInputText.trim() } : t
      ),
    })
    setEditingThemeId(null)
    setThemeInputText('')
  }

  const handleDeleteTheme = (themeId: string) => {
    const remainingThemes = wizardData.themes
      .filter((t) => t.id !== themeId)
      .map((t, index) => ({ ...t, sortOrder: index + 1 }))

    setWizardData({
      ...wizardData,
      themes: remainingThemes,
    })
  }

  const handleMoveTheme = (themeId: string, direction: 'up' | 'down') => {
    const currentIndex = wizardData.themes.findIndex((t) => t.id === themeId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= wizardData.themes.length) return

    const newThemes = [...wizardData.themes]
    const [removed] = newThemes.splice(currentIndex, 1)
    newThemes.splice(newIndex, 0, removed)

    const reordered = newThemes.map((t, index) => ({ ...t, sortOrder: index + 1 }))

    setWizardData({
      ...wizardData,
      themes: reordered,
    })
  }

  const handleGenerateTopics = () => {
    const outline = wizardData.summaryFull.trim()
    if (!outline) {
      toast({
        variant: 'destructive',
        title: 'No outline',
        description: 'Please enter an outline or notes first.',
      })
      return
    }

    const lines = outline.split('\n')
    const extractedTopics: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      if (
        trimmed.match(/^[-*•]\s/) ||
        trimmed.match(/^\d+[.)]/)
      ) {
        const cleaned = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim()
        if (cleaned.length > 3 && cleaned.length < 150) {
          extractedTopics.push(cleaned)
        }
      } else if (trimmed.length > 10 && trimmed.length < 150 && !trimmed.endsWith(':')) {
        extractedTopics.push(trimmed)
      }
    }

    if (extractedTopics.length === 0) {
      const sentences = outline.split(/[.!?]\n?/).filter(s => s.trim().length > 20)
      extractedTopics.push(...sentences.slice(0, 8).map(s => s.trim()))
    }

    const uniqueTopics = Array.from(
      new Map(extractedTopics.map(t => [t.toLowerCase(), t])).values()
    ).slice(0, 12)

    if (uniqueTopics.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No topics found',
        description: 'Could not extract topics from the outline. Please add topics manually.',
      })
      return
    }

    const newThemes: Theme[] = uniqueTopics.map((text, index) => ({
      id: crypto.randomUUID(),
      text,
      sortOrder: index + 1,
    }))

    setWizardData({
      ...wizardData,
      themes: newThemes,
    })

    toast({
      title: 'Topics generated',
      description: `Extracted ${newThemes.length} topics from your outline. You can edit or reorder them.`,
    })
  }

  const handleGenerateOverview = () => {
    const outline = wizardData.summaryFull.trim()
    if (!outline) {
      toast({
        variant: 'destructive',
        title: 'No outline',
        description: 'Please enter an outline or notes first.',
      })
      return
    }

    const lines = outline.split('\n').filter(line => line.trim().length > 0)
    const firstFewLines = lines.slice(0, 3).join(' ').trim()
    
    let overview = firstFewLines
    if (overview.length > 300) {
      overview = overview.slice(0, 297) + '...'
    }

    if (!overview) {
      overview = outline.slice(0, 250).trim()
      if (outline.length > 250) {
        overview += '...'
      }
    }

    setWizardData({
      ...wizardData,
      summaryCondensed: overview,
    })

    toast({
      title: 'Overview drafted',
      description: 'You can edit the generated overview below.',
    })
  }

  const handleSubmit = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'Please sign in to create a session.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const slug = generateSlug()

      // Note: welcome_message, summary_full, summary_condensed are NOT NULL DEFAULT ''
      // in schema.sql, so we must pass empty string (not null) for empty values
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          presenter_id: user.id,
          state: 'draft',
          length_minutes: parseInt(wizardData.lengthMinutes, 10),
          title: wizardData.title.trim(),
          welcome_message: wizardData.welcomeMessage.trim(),
          summary_full: wizardData.summaryFull.trim(),
          summary_condensed: wizardData.summaryCondensed.trim(),
          slug,
        })
        .select()
        .single()

      if (sessionError) {
        if (sessionError.code === '23505') {
          toast({
            variant: 'destructive',
            title: 'Slug conflict',
            description: 'Please try again.',
          })
        } else {
          console.error('Session creation error:', sessionError)
          toast({
            variant: 'destructive',
            title: 'Creation failed',
            description: 'Unable to create session. Please try again.',
          })
        }
        return
      }

      if (wizardData.themes.length > 0) {
        const themesInsert = wizardData.themes.map((theme) => ({
          session_id: sessionData.id,
          text: theme.text,
          sort_order: theme.sortOrder,
        }))

        const { error: themesError } = await supabase.from('themes').insert(themesInsert)

        if (themesError) {
          console.error('Topics creation error:', themesError)
          toast({
            variant: 'destructive',
            title: 'Topics creation failed',
            description: 'Session created but topics could not be added.',
          })
        }
      }

      clearWizardState()
      toast({
        title: 'Session created',
        description: 'Your draft session has been created.',
      })
      navigate(`/dashboard/sessions/${sessionData.id}`)
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

  const renderStepIndicator = () => {
    const steps = ['Basics', 'Outline', 'Topics', 'Review']
    return (
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2">
          {steps.map((stepName, index) => {
            const stepNum = index + 1
            const isActive = stepNum === currentStep
            const isCompleted = stepNum < currentStep

            return (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : isCompleted
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {isCompleted ? '✓' : stepNum}
                </div>
                <span
                  className={`ml-2 hidden text-sm font-medium sm:inline ${
                    isActive ? 'text-violet-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  {stepName}
                </span>
                {index < steps.length - 1 && (
                  <div className="mx-2 h-0.5 w-8 bg-gray-300 sm:w-12" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">
          Session Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          type="text"
          placeholder="e.g., Q4 Product Roadmap Review"
          value={wizardData.title}
          onChange={(e) => setWizardData({ ...wizardData, title: e.target.value })}
          className="min-h-[48px]"
        />
        <p className="text-xs text-gray-500">Give your session a clear, descriptive title</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lengthMinutes">
          Session Length (minutes) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="lengthMinutes"
          type="number"
          min="1"
          placeholder="e.g., 30"
          value={wizardData.lengthMinutes}
          onChange={(e) => setWizardData({ ...wizardData, lengthMinutes: e.target.value })}
          className="min-h-[48px]"
        />
        <p className="text-xs text-gray-500">How long will your presentation be?</p>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="summaryFull">
          Outline or notes <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="summaryFull"
          placeholder="Paste your outline, talk track, or bullet notes here..."
          value={wizardData.summaryFull}
          onChange={(e) => setWizardData({ ...wizardData, summaryFull: e.target.value })}
          rows={8}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">
          Your outline or notes. Use this to generate topics and overview below.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="summaryCondensed">Overview summary</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateOverview}
            disabled={!wizardData.summaryFull.trim()}
            className="h-8 text-xs"
          >
            Draft from outline
          </Button>
        </div>
        <Textarea
          id="summaryCondensed"
          placeholder="Short participant-facing description (1-2 sentences)..."
          value={wizardData.summaryCondensed}
          onChange={(e) => setWizardData({ ...wizardData, summaryCondensed: e.target.value })}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">
          This overview will be shown to participants. You can generate it from your outline or write it yourself.
        </p>
      </div>

      <details className="rounded-lg border border-gray-200 bg-gray-50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100">
          Optional: Welcome message
        </summary>
        <div className="space-y-2 px-4 pb-4 pt-2">
          <Label htmlFor="welcomeMessage">Welcome Message</Label>
          <Textarea
            id="welcomeMessage"
            placeholder="A message to greet your participants..."
            value={wizardData.welcomeMessage}
            onChange={(e) => setWizardData({ ...wizardData, welcomeMessage: e.target.value })}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">Optional greeting shown at the top of the feedback form</p>
        </div>
      </details>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900">Topics</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateTopics}
            disabled={!wizardData.summaryFull.trim()}
            className="h-8 text-xs"
          >
            Generate from outline
          </Button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Add the topics you're planning to cover. Participants will tell you what to spend more or less time on.
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="Enter a topic (e.g., 'Product Vision')"
            value={themeInputText}
            onChange={(e) => setThemeInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (editingThemeId) {
                  handleSaveTheme()
                } else {
                  handleAddTheme()
                }
              }
              if (e.key === 'Escape') {
                setEditingThemeId(null)
                setThemeInputText('')
              }
            }}
            className="min-h-[48px] flex-1"
          />
          {editingThemeId ? (
            <>
              <Button onClick={handleSaveTheme} className="min-h-[48px]">
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingThemeId(null)
                  setThemeInputText('')
                }}
                className="min-h-[48px]"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={handleAddTheme} className="min-h-[48px]">
              Add
            </Button>
          )}
        </div>
      </div>

      {wizardData.themes.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Topics ({wizardData.themes.length})</h4>
          <div className="space-y-2">
            {wizardData.themes.map((theme, index) => (
              <div
                key={theme.id}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveTheme(theme.id, 'up')}
                    disabled={index === 0}
                    className="h-10 w-10 p-0"
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveTheme(theme.id, 'down')}
                    disabled={index === wizardData.themes.length - 1}
                    className="h-10 w-10 p-0"
                  >
                    ↓
                  </Button>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{theme.text}</p>
                  <p className="text-xs text-gray-500">Order: {theme.sortOrder}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTheme(theme.id)}
                    className="min-h-[48px]"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTheme(theme.id)}
                    className="min-h-[48px]"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-600">No topics added yet. Add at least one topic above.</p>
        </div>
      )}
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Review Your Session</h3>
        <p className="text-sm text-gray-600 mb-6">
          Review the details below. You can go back to make changes, or create the session.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Basics</h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-gray-500">Length</dt>
              <dd className="text-sm text-gray-900">{wizardData.lengthMinutes} minutes</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Title</dt>
              <dd className="text-sm text-gray-900">{wizardData.title}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Outline & Overview</h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-gray-500">Outline or notes</dt>
              <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                {wizardData.summaryFull || <span className="text-gray-400">Not provided</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Overview summary (shown to participants)</dt>
              <dd className="text-sm text-gray-900">
                {wizardData.summaryCondensed || <span className="text-gray-400">Not provided</span>}
              </dd>
            </div>
            {wizardData.welcomeMessage && (
              <div>
                <dt className="text-xs text-gray-500">Welcome Message</dt>
                <dd className="text-sm text-gray-900">
                  {wizardData.welcomeMessage}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Topics ({wizardData.themes.length})
          </h4>
          {wizardData.themes.length > 0 ? (
            <ol className="space-y-1">
              {wizardData.themes.map((theme) => (
                <li key={theme.id} className="text-sm text-gray-900">
                  {theme.sortOrder}. {theme.text}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-400">No topics added</p>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Session</h1>
              <p className="text-sm text-gray-600">
                Step {currentStep} of 4: Set up a new feedback session
              </p>
            </div>
            <Button
              variant="outline"
              className="min-h-[48px]"
              onClick={() => {
                if (confirm('Exit wizard? Your progress will be saved.')) {
                  navigate('/dashboard')
                }
              }}
            >
              Exit
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {renderStepIndicator()}

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && 'Session Basics'}
              {currentStep === 2 && 'Outline & Overview'}
              {currentStep === 3 && 'Topics'}
              {currentStep === 4 && 'Review & Create'}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Enter the basic information for your session'}
              {currentStep === 2 && 'Add your outline and generate an overview for participants'}
              {currentStep === 3 && 'Generate or manually add topics for participants to prioritize'}
              {currentStep === 4 && 'Review your session before creating'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}

            <div className="mt-8 flex gap-3">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="min-h-[56px] flex-1"
                >
                  Back
                </Button>
              )}
              {currentStep < 4 ? (
                <Button onClick={handleNext} className="min-h-[56px] flex-1">
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="min-h-[56px] flex-1"
                >
                  {isSubmitting ? 'Creating...' : 'Create Session'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
