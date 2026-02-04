import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Plus } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  encodeTopicBlock,
  decodeTopicBlock,
  parseOutlineToTopicBlocks,
} from '@/lib/topicBlocks'

const WIZARD_STORAGE_KEY = 'feedbacker-wizard-state'

interface Theme {
  id: string
  text: string // Encoded block: "Title\n- Sub1\n- Sub2"
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
  const { user, presenter, presenterStatus, isLoading, refetchPresenter } = useAuth()
  const { toast } = useToast()

  const [currentStep, setCurrentStep] = useState(1)
  const [wizardData, setWizardData] = useState<WizardData>(emptyWizardData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Theme editing state
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [addingTopic, setAddingTopic] = useState(false)
  const [newTopicText, setNewTopicText] = useState('')

  // Navigation protection state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const [savedDraft, setSavedDraft] = useState<{ data: WizardData; savedAt: string } | null>(null)

  // Detect if user has entered any data (dirty state)
  const isDirty =
    wizardData.title.trim() !== '' ||
    wizardData.lengthMinutes !== '' ||
    wizardData.welcomeMessage.trim() !== '' ||
    wizardData.summaryFull.trim() !== '' ||
    wizardData.summaryCondensed.trim() !== '' ||
    wizardData.themes.length > 0

  // Debounced save to localStorage
  const saveDraftToStorage = useCallback(() => {
    if (isDirty) {
      const dataToSave = { ...wizardData, savedAt: new Date().toISOString() }
      localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(dataToSave))
    }
  }, [wizardData, isDirty])

  // Check for saved draft on mount and offer restore
  useEffect(() => {
    const savedStr = localStorage.getItem(WIZARD_STORAGE_KEY)
    if (savedStr) {
      try {
        const parsed = JSON.parse(savedStr)
        const hasContent =
          parsed.title?.trim() ||
          parsed.lengthMinutes ||
          parsed.summaryFull?.trim() ||
          (parsed.themes && parsed.themes.length > 0)

        if (hasContent) {
          setSavedDraft({ data: parsed, savedAt: parsed.savedAt || new Date().toISOString() })
          setShowRestorePrompt(true)
        } else {
          localStorage.removeItem(WIZARD_STORAGE_KEY)
        }
      } catch {
        localStorage.removeItem(WIZARD_STORAGE_KEY)
      }
    }
  }, [])

  // Save wizard state to localStorage when dirty (debounced)
  useEffect(() => {
    if (!isDirty) return
    const timeout = setTimeout(saveDraftToStorage, 300)
    return () => clearTimeout(timeout)
  }, [saveDraftToStorage, isDirty])

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

  // Popstate interception for browser back button
  useEffect(() => {
    if (!isDirty) return

    window.history.pushState({ wizardGuard: true }, '')

    const handlePopstate = () => {
      if (isDirty) {
        window.history.pushState({ wizardGuard: true }, '')
        setShowUnsavedDialog(true)
        setPendingNavigation('/dashboard')
      }
    }

    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [isDirty])

  // iOS back-forward cache handling (pagehide/pageshow)
  useEffect(() => {
    const handlePageHide = () => {
      // Persist immediately when page is being hidden (iOS bfcache)
      if (isDirty) {
        const dataToSave = { ...wizardData, savedAt: new Date().toISOString() }
        localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(dataToSave))
      }
    }

    const handlePageShow = (e: PageTransitionEvent) => {
      // If page was restored from bfcache, check for draft
      if (e.persisted) {
        const savedStr = localStorage.getItem(WIZARD_STORAGE_KEY)
        if (savedStr) {
          try {
            const parsed = JSON.parse(savedStr)
            const hasContent =
              parsed.title?.trim() ||
              parsed.lengthMinutes ||
              parsed.summaryFull?.trim() ||
              (parsed.themes && parsed.themes.length > 0)

            if (hasContent && !showRestorePrompt) {
              setSavedDraft({ data: parsed, savedAt: parsed.savedAt || new Date().toISOString() })
              setShowRestorePrompt(true)
            }
          } catch {
            // Invalid draft
          }
        }
      }
    }

    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [isDirty, wizardData, showRestorePrompt])

  const dialogOpen = showUnsavedDialog

  const confirmLeave = () => {
    clearWizardState()
    if (pendingNavigation) {
      navigate(pendingNavigation)
    }
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }

  const cancelLeave = () => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }

  const handleRestoreDraft = () => {
    if (savedDraft) {
      setWizardData(savedDraft.data)
    }
    setSavedDraft(null)
    setShowRestorePrompt(false)
  }

  const handleDiscardDraft = () => {
    localStorage.removeItem(WIZARD_STORAGE_KEY)
    setSavedDraft(null)
    setShowRestorePrompt(false)
  }

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
          description: 'Presentation length must be a positive number.',
        })
        return
      }
      if (!wizardData.title.trim()) {
        toast({
          variant: 'destructive',
          title: 'Title required',
          description: 'Please enter a presentation title.',
        })
        return
      }
    }

    if (currentStep === 2) {
      if (!wizardData.summaryFull.trim()) {
        toast({
          variant: 'destructive',
          title: 'Outline required',
          description: 'Please describe what you plan to cover.',
        })
        return
      }

      createTopicsFromOutline()
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleAddTheme = () => {
    if (!newTopicText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Empty theme',
        description: 'Please enter theme text.',
      })
      return
    }

    // Parse textarea: first line = title, rest = subtopics
    const lines = newTopicText.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return

    const title = lines[0]
    const subtopics = lines.slice(1).map(l =>
      l.replace(/^[-*•—]\s*/, '').trim()
    ).filter(Boolean)

    // Encode into single text field
    const encodedText = encodeTopicBlock(title, subtopics)

    const newTheme: Theme = {
      id: crypto.randomUUID(),
      text: encodedText,
      sortOrder: wizardData.themes.length + 1,
    }

    setWizardData({
      ...wizardData,
      themes: [...wizardData.themes, newTheme],
    })
    setNewTopicText('')
    setAddingTopic(false)
  }

  const handleEditTheme = (themeId: string) => {
    const theme = wizardData.themes.find((t) => t.id === themeId)
    if (theme) {
      setEditingThemeId(themeId)
      setAddingTopic(false)
      // Decode for editing: show as multiline text
      const decoded = decodeTopicBlock(theme.text)
      const lines = [decoded.title]
      if (decoded.subtopics.length > 0) {
        lines.push(...decoded.subtopics.map(s => `- ${s}`))
      }
      setEditingText(lines.join('\n'))
    }
  }

  const handleSaveTheme = () => {
    if (!editingThemeId) return

    if (!editingText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Empty theme',
        description: 'Theme text cannot be empty.',
      })
      return
    }

    // Parse and re-encode
    const lines = editingText.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return

    const title = lines[0]
    const subtopics = lines.slice(1).map(l =>
      l.replace(/^[-*•—]\s*/, '').trim()
    ).filter(Boolean)

    const encodedText = encodeTopicBlock(title, subtopics)

    setWizardData({
      ...wizardData,
      themes: wizardData.themes.map((t) =>
        t.id === editingThemeId ? { ...t, text: encodedText } : t
      ),
    })
    setEditingThemeId(null)
    setEditingText('')
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

  const createTopicsFromOutline = () => {
    const outline = wizardData.summaryFull.trim()
    if (!outline || wizardData.themes.length > 0) {
      return
    }

    // Use shared parser that returns encoded blocks
    const encodedBlocks = parseOutlineToTopicBlocks(outline)

    if (encodedBlocks.length > 0) {
      const newThemes: Theme[] = encodedBlocks.map((encodedText, index) => ({
        id: crypto.randomUUID(),
        text: encodedText,
        sortOrder: index + 1,
      }))

      setWizardData({
        ...wizardData,
        themes: newThemes,
      })
    }
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

    if (presenterStatus !== 'ready' || !presenter) {
      toast({
        variant: 'destructive',
        title: 'Profile required',
        description: 'Please complete your profile before creating a session.',
      })
      navigate('/dashboard/profile')
      return
    }

    setIsSubmitting(true)

    try {
      const slug = generateSlug()

      // Build published topics snapshot
      const publishedTopics = wizardData.themes.map((theme) => ({
        themeId: theme.id,
        text: theme.text,
        sortOrder: theme.sortOrder,
      }))

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          presenter_id: user.id,
          state: 'active',
          length_minutes: parseInt(wizardData.lengthMinutes, 10),
          title: wizardData.title.trim(),
          welcome_message: wizardData.welcomeMessage.trim() || '',
          summary_full: wizardData.summaryFull.trim() || '',
          summary_condensed: wizardData.summaryCondensed.trim() || '',
          slug,
          topics_source: 'generated',
          published_welcome_message: wizardData.welcomeMessage.trim() || '',
          published_summary_condensed: wizardData.summaryCondensed.trim() || '',
          published_summary_full: wizardData.summaryFull.trim() || '',
          published_topics: publishedTopics.length > 0 ? publishedTopics : [],
          published_at: new Date().toISOString(),
          has_unpublished_changes: false,
        })
        .select()
        .single()

      if (sessionError) {
        console.error('[SessionCreateWizard] Session insert failed:', {
          error: sessionError,
          code: sessionError.code,
          message: sessionError.message,
          details: sessionError.details,
          hint: sessionError.hint,
        })

        if (sessionError.code === '23505') {
          toast({
            variant: 'destructive',
            title: 'Slug conflict',
            description: 'Please try again.',
          })
        } else if (sessionError.code === '23503') {
          toast({
            variant: 'destructive',
            title: 'Profile required',
            description: 'Please complete your profile before creating a session.',
          })
          navigate('/dashboard/profile')
        } else if (sessionError.code === '42501' || sessionError.message?.includes('policy')) {
          toast({
            variant: 'destructive',
            title: 'Permission denied',
            description: 'Please sign in again and try once more.',
          })
        } else {
          toast({
            variant: 'destructive',
            title: 'Presentation creation failed',
            description: `${sessionError.message || 'Unable to create presentation'}. Check the console for details.`,
          })
        }
        return
      }

      if (wizardData.themes.length > 0) {
        const themesInsert = wizardData.themes.map((theme) => ({
          id: theme.id,
          session_id: sessionData.id,
          text: theme.text, // Already encoded
          sort_order: theme.sortOrder,
        }))

        const { error: themesError } = await supabase.from('themes').insert(themesInsert)

        if (themesError) {
          console.error('[SessionCreateWizard] Themes insert failed:', themesError)
          toast({
            variant: 'destructive',
            title: 'Topics creation failed',
            description: `${themesError.message || 'Presentation created but topics could not be added'}. Check the console for details.`,
          })
        }
      }

      toast({
        title: 'Presentation published',
        description: 'Your presentation is now live and collecting participant feedback.',
      })

      clearWizardState()
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
    const steps = ['Title, Presenter & Length', 'Outline', 'Topics', 'Review']
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
          Presentation Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          type="text"
          placeholder="e.g., Q4 Product Roadmap Review"
          value={wizardData.title}
          onChange={(e) => setWizardData({ ...wizardData, title: e.target.value })}
          className="min-h-[48px]"
        />
        <p className="text-xs text-gray-500">Give your presentation a clear, descriptive title</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="presenterName">
          Presenter <span className="text-red-500">*</span>
        </Label>
        <Input
          id="presenterName"
          type="text"
          placeholder="Your name"
          value={presenter?.name || ''}
          disabled
          className="min-h-[48px] bg-gray-50"
        />
        <p className="text-xs text-gray-500">This name will be shown to participants.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lengthMinutes">
          Presentation Length (minutes) <span className="text-red-500">*</span>
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
        <Label htmlFor="welcomeMessage">Message to your audience</Label>
        {!wizardData.welcomeMessage && (
          <div className="rounded-md bg-gray-50 border border-gray-200 p-3 mb-2">
            <p className="text-sm text-gray-700 mb-2">
              Hi — please review the topics below and tell me which ones you'd like more time on and which ones matter less. Thank you for your feedback.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWizardData({ ...wizardData, welcomeMessage: "Hi — please review the topics below and tell me which ones you'd like more time on and which ones matter less. Thank you for your feedback." })}
              className="h-8 text-xs"
            >
              Use suggested message
            </Button>
          </div>
        )}
        <Textarea
          id="welcomeMessage"
          placeholder="Message shown to participants..."
          value={wizardData.welcomeMessage}
          onChange={(e) => setWizardData({ ...wizardData, welcomeMessage: e.target.value })}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">
          Appears at the top of the participant page.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="summaryCondensed">Overview summary (optional)</Label>
        <Textarea
          id="summaryCondensed"
          placeholder="Short description shown before the topics (1–2 sentences)"
          value={wizardData.summaryCondensed}
          onChange={(e) => setWizardData({ ...wizardData, summaryCondensed: e.target.value })}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">
          You can leave this blank.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="summaryFull">
          Your outline <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Textarea
            id="summaryFull"
            placeholder={`Market context
— why now
— why later

Analysis

Case study`}
            value={wizardData.summaryFull}
            onChange={(e) => setWizardData({ ...wizardData, summaryFull: e.target.value })}
            rows={8}
            className="resize-none"
          />
        </div>
        <p className="text-xs text-gray-500">
          Write your outline. We'll organize it into topics your audience will prioritize.
        </p>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">
          Topics{wizardData.themes.length > 0 ? ` (${wizardData.themes.length})` : ''}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAddingTopic(true)
            setEditingThemeId(null)
            setEditingText('')
            setNewTopicText('')
          }}
          className="min-h-[40px]"
          disabled={addingTopic}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add topic
        </Button>
      </div>

      {/* Inline editor for adding a new topic */}
      {addingTopic && (
        <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
          <Textarea
            value={newTopicText}
            onChange={(e) => setNewTopicText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleAddTheme()
              }
              if (e.key === 'Escape') {
                setAddingTopic(false)
                setNewTopicText('')
              }
            }}
            placeholder="Title on first line, then sub-bullets with dashes (- Sub 1)"
            rows={3}
            className="w-full min-h-[60px] resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddTheme} className="min-h-[40px]">
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAddingTopic(false)
                setNewTopicText('')
              }}
              className="min-h-[40px]"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Topic list with inline editing */}
      {wizardData.themes.length > 0 ? (
        <div className="space-y-2">
          {wizardData.themes.map((theme, index) => {
            const decoded = decodeTopicBlock(theme.text)
            return (
              <div
                key={theme.id}
                className="rounded-lg border border-gray-200 bg-white p-3"
              >
                {editingThemeId === theme.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault()
                          handleSaveTheme()
                        }
                        if (e.key === 'Escape') {
                          setEditingThemeId(null)
                          setEditingText('')
                        }
                      }}
                      rows={3}
                      className="w-full min-h-[60px] resize-none"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500">Title on first line, then sub-bullets with dashes (- Sub 1).</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveTheme} className="min-h-[40px]">
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingThemeId(null)
                          setEditingText('')
                        }}
                        className="min-h-[40px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
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
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 break-words">{decoded.title}</p>
                      {decoded.subtopics.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {decoded.subtopics.map((sub, idx) => (
                            <li key={idx} className="text-xs text-gray-600 pl-2 flex items-start gap-1">
                              <span className="text-gray-400">—</span>
                              <span className="break-words">{sub}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
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
                )}
              </div>
            )
          })}
        </div>
      ) : !addingTopic ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-600">No topics yet. Click "Add topic" to get started.</p>
        </div>
      ) : null}
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Review Your Presentation</h3>
        <p className="text-sm text-gray-600 mb-6">
          Review the details below. You can go back to make changes, or publish to start collecting feedback.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Presentation Title, Presenter and Length</h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-gray-500">Title</dt>
              <dd className="text-sm text-gray-900">{wizardData.title}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Presenter</dt>
              <dd className="text-sm text-gray-900">{presenter?.name || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Length</dt>
              <dd className="text-sm text-gray-900">{wizardData.lengthMinutes} minutes</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Participant-Visible Content</h4>
          <dl className="space-y-3">
            {wizardData.welcomeMessage && (
              <div>
                <dt className="text-xs text-gray-500">Welcome Message</dt>
                <dd className="text-sm text-gray-900">
                  {wizardData.welcomeMessage}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-500">Presentation Overview</dt>
              <dd className="text-sm text-gray-900">
                {wizardData.summaryCondensed || <span className="text-gray-400">Not provided</span>}
              </dd>
            </div>
          </dl>
        </div>

        {/* Internal reference - collapsed by default */}
        {wizardData.summaryFull && (
          <details className="group border rounded-lg">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50">
              <span>Internal reference (not visible to participants)</span>
              <svg className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 pt-2">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {wizardData.summaryFull}
              </p>
            </div>
          </details>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Topics ({wizardData.themes.length})
          </h4>
          {wizardData.themes.length > 0 ? (
            <div className="space-y-3">
              {wizardData.themes.map((theme) => {
                const decoded = decodeTopicBlock(theme.text)
                return (
                  <div key={theme.id}>
                    <p className="text-sm font-medium text-gray-900">
                      {theme.sortOrder}. {decoded.title}
                    </p>
                    {decoded.subtopics.length > 0 && (
                      <ul className="mt-1 ml-6 space-y-0.5">
                        {decoded.subtopics.map((sub, idx) => (
                          <li key={idx} className="text-xs text-gray-600">
                            — {sub}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No topics added</p>
          )}
        </div>
      </div>
    </div>
  )

  // Guard: require presenter profile to create sessions
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (presenterStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (presenterStatus === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Unable to load profile</h1>
          <p className="text-gray-600">There was a problem loading your profile.</p>
          <Button onClick={() => refetchPresenter()} className="min-h-[48px]">
            Retry
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="min-h-[48px] ml-3">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (presenterStatus === 'not_found') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Profile Required</h1>
          <p className="mb-6 text-gray-600">
            Please complete your profile before creating a session.
          </p>
          <Button onClick={() => navigate('/dashboard/profile')} className="min-h-[48px]">
            Set Up Profile
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Presentation</h1>
              <p className="text-sm text-gray-600">
                Step {currentStep} of 4
              </p>
            </div>
            <Button
              variant="outline"
              className="min-h-[48px]"
              onClick={() => {
                if (isDirty) {
                  setShowUnsavedDialog(true)
                  setPendingNavigation('/dashboard')
                } else {
                  navigate('/dashboard')
                }
              }}
            >
              Back to dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {renderStepIndicator()}

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && 'Presentation Title, Presenter and Length'}
              {currentStep === 2 && 'Outline & Overview'}
              {currentStep === 3 && 'Topics'}
              {currentStep === 4 && 'Review & Publish'}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Step 1 of 4: Set up a new presentation'}
              {currentStep === 2 && "Add a welcome message, an overview for participants, and your outline. Next, you'll review the topics we organize from it."}
              {currentStep === 3 && 'We organized your outline into topics. Review wording and order, then add or remove topics.'}
              {currentStep === 4 && 'Review your presentation before publishing. Once published, participants can submit feedback.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="min-h-[56px] w-full sm:flex-1"
                >
                  Back
                </Button>
              )}
              {currentStep < 4 ? (
                <Button onClick={handleNext} className="min-h-[56px] w-full sm:flex-1">
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="min-h-[56px] w-full sm:flex-1"
                >
                  {isSubmitting ? 'Publishing...' : 'Confirm & Publish'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Unsaved changes dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) cancelLeave() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              Leave without saving? Your presentation draft will be lost.
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
            <DialogTitle>Resume previous presentation?</DialogTitle>
            <DialogDescription>
              {savedDraft && (
                <>
                  You have an unfinished presentation draft from {new Date(savedDraft.savedAt).toLocaleString()}.
                  Would you like to continue where you left off?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDiscardDraft}>
              Start fresh
            </Button>
            <Button onClick={handleRestoreDraft}>
              Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
