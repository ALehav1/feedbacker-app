/**
 * DEV-ONLY: Response Generator Panel for Testing
 *
 * This component generates test participant responses for verifying
 * multi-participant behavior. Only rendered when import.meta.env.DEV is true.
 *
 * Used to test:
 * - Dashboard response count matches SessionDetail response count
 * - Audience feedback list shows all responses immediately
 * - Results aggregation reflects multiple responses correctly
 * - Refresh and navigation do not change counts or drop responses
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

interface DevResponseGeneratorProps {
  sessionId: string
  onResponsesGenerated: () => void
}

// Seed data for generating varied test responses
const SEED_RESPONSES = [
  {
    name: 'Alice Test',
    email: 'alice.test@example.com',
    freeform: 'Great session! Would love more detail on the technical implementation.',
    // Each seed has different topic selection patterns
    selectionPattern: 'first-two-more', // selects first 2 topics as "more"
  },
  {
    name: 'Bob Tester',
    email: 'bob.tester@example.com',
    freeform: 'Interesting overview. The market context section was particularly valuable.',
    selectionPattern: 'first-more-second-less', // mixed selections
  },
  {
    name: 'Carol Demo',
    email: 'carol.demo@example.com',
    freeform: 'Please cover the Q&A section in more depth next time.',
    selectionPattern: 'all-more', // all topics as "more"
  },
  {
    name: 'Dave Example',
    email: 'dave.example@example.com',
    freeform: 'Concise and well-structured presentation.',
    selectionPattern: 'alternating', // alternates more/less
  },
  {
    name: null, // Anonymous
    email: null,
    freeform: 'Anonymous feedback: The pacing was just right.',
    selectionPattern: 'last-two-more',
  },
  {
    name: 'Eve Reviewer',
    email: 'eve.reviewer@example.com',
    freeform: null, // No additional comments
    selectionPattern: 'random',
  },
]

function getSelections(
  themeIds: string[],
  pattern: string,
  seedIndex: number
): { themeId: string; selection: 'more' | 'less' }[] {
  const selections: { themeId: string; selection: 'more' | 'less' }[] = []

  themeIds.forEach((themeId, idx) => {
    let selection: 'more' | 'less' | null = null

    switch (pattern) {
      case 'first-two-more':
        if (idx < 2) selection = 'more'
        break
      case 'first-more-second-less':
        if (idx === 0) selection = 'more'
        else if (idx === 1) selection = 'less'
        break
      case 'all-more':
        selection = 'more'
        break
      case 'alternating':
        selection = idx % 2 === 0 ? 'more' : 'less'
        break
      case 'last-two-more':
        if (idx >= themeIds.length - 2) selection = 'more'
        break
      case 'random':
      default:
        // Use seed index to create deterministic "random" pattern
        selection = (idx + seedIndex) % 3 === 0 ? 'less' : 'more'
        break
    }

    if (selection) {
      selections.push({ themeId, selection })
    }
  })

  // Ensure at least one selection
  if (selections.length === 0 && themeIds.length > 0) {
    selections.push({ themeId: themeIds[0], selection: 'more' })
  }

  return selections
}

export function DevResponseGenerator({ sessionId, onResponsesGenerated }: DevResponseGeneratorProps) {
  const { toast } = useToast()
  const [count, setCount] = useState(3)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [generatedIds, setGeneratedIds] = useState<string[]>([])

  const handleGenerate = async () => {
    if (count < 1 || count > 10) {
      toast({
        variant: 'destructive',
        title: 'Invalid count',
        description: 'Please enter a number between 1 and 10.',
      })
      return
    }

    setIsGenerating(true)

    try {
      // First, fetch active themes for this session
      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select('id')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (themesError) {
        console.error('Error fetching themes:', themesError)
        toast({
          variant: 'destructive',
          title: 'Failed to fetch themes',
          description: 'Could not load session themes.',
        })
        return
      }

      const themeIds = (themesData || []).map((t: { id: string }) => t.id)

      if (themeIds.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No themes found',
          description: 'This session has no topics. Add topics before generating responses.',
        })
        return
      }

      const newResponseIds: string[] = []
      const timestamp = Date.now()

      for (let i = 0; i < count; i++) {
        const seedIndex = i % SEED_RESPONSES.length
        const seed = SEED_RESPONSES[seedIndex]
        const participantToken = crypto.randomUUID()

        // Generate unique email for each response
        const email = seed.email
          ? seed.email.replace('@', `-${timestamp}-${i}@`)
          : `anon-${participantToken}@feedbacker.app`

        // Insert response
        const { data: responseData, error: responseError } = await supabase
          .from('responses')
          .insert({
            session_id: sessionId,
            participant_email: email,
            name: seed.name ? `${seed.name} (seed #${i + 1})` : null,
            followup_email: seed.email ? email : null,
            free_form_text: seed.freeform ? `${seed.freeform} (Generated #${i + 1})` : null,
            participant_token: participantToken,
          })
          .select()
          .single()

        if (responseError) {
          console.error('Error creating response:', responseError)
          toast({
            variant: 'destructive',
            title: 'Failed to create response',
            description: `Error on response #${i + 1}: ${responseError.message}`,
          })
          continue
        }

        newResponseIds.push(responseData.id)

        // Get selections for this seed
        const selections = getSelections(themeIds, seed.selectionPattern, seedIndex)

        // Insert theme selections
        const themeSelectionsData = selections.map((s) => ({
          response_id: responseData.id,
          theme_id: s.themeId,
          selection: s.selection,
        }))

        const { error: selectionsError } = await supabase
          .from('theme_selections')
          .insert(themeSelectionsData)

        if (selectionsError) {
          console.error('Error creating theme selections:', selectionsError)
          // Clean up the response if selections failed
          await supabase.from('responses').delete().eq('id', responseData.id)
          newResponseIds.pop()
          toast({
            variant: 'destructive',
            title: 'Failed to create selections',
            description: `Error on response #${i + 1}`,
          })
        }
      }

      setGeneratedIds((prev) => [...prev, ...newResponseIds])

      toast({
        title: 'Responses generated',
        description: `Successfully created ${newResponseIds.length} test responses.`,
      })

      // Notify parent to refresh results
      onResponsesGenerated()
    } catch (err) {
      console.error('Unexpected error:', err)
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: 'An unexpected error occurred.',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClearGenerated = async () => {
    if (generatedIds.length === 0) {
      toast({
        title: 'Nothing to clear',
        description: 'No generated responses to remove.',
      })
      return
    }

    setIsClearing(true)

    try {
      // Delete theme_selections first (foreign key constraint)
      const { error: selectionsError } = await supabase
        .from('theme_selections')
        .delete()
        .in('response_id', generatedIds)

      if (selectionsError) {
        console.error('Error deleting selections:', selectionsError)
      }

      // Then delete responses
      const { error: responsesError } = await supabase
        .from('responses')
        .delete()
        .in('id', generatedIds)

      if (responsesError) {
        console.error('Error deleting responses:', responsesError)
        toast({
          variant: 'destructive',
          title: 'Failed to clear',
          description: 'Could not delete generated responses.',
        })
        return
      }

      toast({
        title: 'Cleared',
        description: `Removed ${generatedIds.length} generated responses.`,
      })

      setGeneratedIds([])
      onResponsesGenerated()
    } catch (err) {
      console.error('Unexpected error:', err)
      toast({
        variant: 'destructive',
        title: 'Clear failed',
        description: 'An unexpected error occurred.',
      })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-amber-900 flex items-center gap-2">
          <span className="rounded bg-amber-200 px-1.5 py-0.5 text-xs font-mono">DEV</span>
          Response Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-amber-800">
          Generate test participant responses to verify multi-participant behavior.
        </p>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            className="w-20 h-9 text-sm"
            disabled={isGenerating}
          />
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="sm"
            className="h-9"
            data-testid="dev-generate-responses-btn"
          >
            {isGenerating ? 'Generating...' : `Generate ${count} response${count !== 1 ? 's' : ''}`}
          </Button>
        </div>

        {generatedIds.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-amber-200">
            <span className="text-xs text-amber-700">
              {generatedIds.length} generated in this session
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearGenerated}
              disabled={isClearing}
              className="h-8 text-xs"
            >
              {isClearing ? 'Clearing...' : 'Clear generated'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
