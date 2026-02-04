import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generatePptx, type DeckOutline, type DeckSlide } from '@/lib/generatePptx';
import { Sparkles, FileDown, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { buildSuggestionGroupsFromResponses } from '@/lib/suggestions';

interface ThemeResult {
  themeId: string;
  text: string;
  sortOrder: number;
  more: number;
  less: number;
  total: number;
  net: number;
}

interface Response {
  id: string;
  participantName: string | null;
  participantEmail: string | null;
  freeFormText: string | null;
  createdAt: Date;
}

interface DeckBuilderPanelProps {
  sessionTitle: string;
  sessionSummary: string;
  lengthMinutes: number;
  themeResults: ThemeResult[];
  responses: Response[];
  presenterName?: string;
  heading?: string;
  description?: string;
  analyzeLabel?: string;
}


export function DeckBuilderPanel({
  sessionTitle,
  sessionSummary,
  lengthMinutes,
  themeResults,
  responses,
  presenterName,
  heading = 'Deck Builder',
  description = 'Generate a presentation outline from audience feedback, then export to PowerPoint. Your outline should represent what you could cover — participants will help prioritize.',
  analyzeLabel = 'Analyze Responses',
}: DeckBuilderPanelProps) {
  const { toast } = useToast();
  const [outline, setOutline] = useState<DeckOutline | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isGeneratingPptx, setIsGeneratingPptx] = useState(false);
  const [expandedSlides, setExpandedSlides] = useState<Set<number>>(new Set());

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const suggestionData = buildSuggestionGroupsFromResponses(responses);
      const response = await fetch('/api/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionTitle,
          sessionSummary,
          lengthMinutes,
          themeResults: themeResults.map((t) => ({
            text: t.text,
            more: t.more,
            less: t.less,
            net: t.net,
          })),
          responses: responses.map((r) => ({
            participantName: r.participantName,
            freeFormText: r.freeFormText,
          })),
          suggestedThemes: suggestionData.groups.map((group) => ({
            label: group.label,
            count: group.count,
          })),
          rawSuggestions: suggestionData.rawSuggestions,
        }),
      });

      // Get response details for better error handling
      const contentType = response.headers.get('content-type') || '';
      const responseText = await response.text();
      const isDev = import.meta.env.DEV;

      if (isDev && response.status === 404) {
        throw new Error('AI analysis is not available in local dev. Use vercel dev or deploy to Vercel.');
      }

      // Check if response is JSON
      if (!contentType.includes('application/json')) {
        console.error('Non-JSON response:', response.status, responseText.slice(0, 200));
        if (isDev) {
          throw new Error('AI analysis is not available in local dev. Use vercel dev or deploy to Vercel.');
        }
        throw new Error('AI analysis is unavailable. The server returned an unexpected response.');
      }

      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('JSON parse failed:', responseText.slice(0, 200));
        throw new Error('AI analysis is unavailable. Server returned invalid data.');
      }

      // Check for error response
      if (!response.ok) {
        const errorMsg = data.error?.message || data.error || 'Failed to analyze responses';
        // Provide helpful message for missing API key
        if (data.error?.code === 'missing_openai_key') {
          throw new Error('AI analysis requires OPENAI_API_KEY to be configured in environment variables.');
        }
        throw new Error(errorMsg);
      }

      setOutline(data as DeckOutline);
      // Expand all slides by default
      setExpandedSlides(new Set((data as DeckOutline).slides.map((_, i) => i)));

      toast({
        title: 'Outline generated',
        description: `Created ${(data as DeckOutline).slides.length} slides based on audience feedback.`,
      });
    } catch (err) {
      console.error('Analyze error:', err);
      const message = err instanceof Error ? err.message : 'Failed to analyze responses';
      setAnalyzeError(message);
      toast({
        variant: 'destructive',
        title: 'Analysis failed',
        description: message,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGeneratePptx = async () => {
    if (!outline) return;

    setIsGeneratingPptx(true);
    try {
      await generatePptx({ outline, presenterName });
      toast({
        title: 'PowerPoint generated',
        description: 'Your presentation has been downloaded.',
      });
    } catch (err) {
      console.error('PPTX generation error:', err);
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: 'Unable to create PowerPoint file.',
      });
    } finally {
      setIsGeneratingPptx(false);
    }
  };

  // Outline editing functions
  const updateDeckTitle = (title: string) => {
    if (!outline) return;
    setOutline({ ...outline, deckTitle: title });
  };

  const updateSlideTitle = (slideIndex: number, title: string) => {
    if (!outline) return;
    const newSlides = [...outline.slides];
    newSlides[slideIndex] = { ...newSlides[slideIndex], title };
    setOutline({ ...outline, slides: newSlides });
  };

  const updateBulletText = (slideIndex: number, bulletIndex: number, text: string) => {
    if (!outline) return;
    const newSlides = [...outline.slides];
    const newBullets = [...newSlides[slideIndex].bullets];
    newBullets[bulletIndex] = { ...newBullets[bulletIndex], text };
    newSlides[slideIndex] = { ...newSlides[slideIndex], bullets: newBullets };
    setOutline({ ...outline, slides: newSlides });
  };

  const updateSubBullet = (slideIndex: number, bulletIndex: number, subIndex: number, text: string) => {
    if (!outline) return;
    const newSlides = [...outline.slides];
    const newBullets = [...newSlides[slideIndex].bullets];
    const subBullets = [...(newBullets[bulletIndex].subBullets || [])];
    subBullets[subIndex] = text;
    newBullets[bulletIndex] = { ...newBullets[bulletIndex], subBullets };
    newSlides[slideIndex] = { ...newSlides[slideIndex], bullets: newBullets };
    setOutline({ ...outline, slides: newSlides });
  };

  const addSlide = () => {
    if (!outline) return;
    const newSlide: DeckSlide = {
      title: '',
      bullets: [{ text: '' }],
    };
    const newSlides = [...outline.slides, newSlide];
    setOutline({ ...outline, slides: newSlides });
    setExpandedSlides(new Set([...expandedSlides, newSlides.length - 1]));
  };

  const removeSlide = (slideIndex: number) => {
    if (!outline || outline.slides.length <= 1) return;
    const newSlides = outline.slides.filter((_, i) => i !== slideIndex);
    setOutline({ ...outline, slides: newSlides });
  };

  const addBullet = (slideIndex: number) => {
    if (!outline) return;
    const newSlides = [...outline.slides];
    const newBullets = [...newSlides[slideIndex].bullets, { text: '' }];
    newSlides[slideIndex] = { ...newSlides[slideIndex], bullets: newBullets };
    setOutline({ ...outline, slides: newSlides });
  };

  const removeBullet = (slideIndex: number, bulletIndex: number) => {
    if (!outline) return;
    const newSlides = [...outline.slides];
    const newBullets = newSlides[slideIndex].bullets.filter((_, i) => i !== bulletIndex);
    newSlides[slideIndex] = { ...newSlides[slideIndex], bullets: newBullets };
    setOutline({ ...outline, slides: newSlides });
  };

  const addSubBullet = (slideIndex: number, bulletIndex: number) => {
    if (!outline) return;
    const newSlides = [...outline.slides];
    const newBullets = [...newSlides[slideIndex].bullets];
    const subBullets = [...(newBullets[bulletIndex].subBullets || []), ''];
    newBullets[bulletIndex] = { ...newBullets[bulletIndex], subBullets };
    newSlides[slideIndex] = { ...newSlides[slideIndex], bullets: newBullets };
    setOutline({ ...outline, slides: newSlides });
  };

  const removeSubBullet = (slideIndex: number, bulletIndex: number, subIndex: number) => {
    if (!outline) return;
    const newSlides = [...outline.slides];
    const newBullets = [...newSlides[slideIndex].bullets];
    const subBullets = (newBullets[bulletIndex].subBullets || []).filter((_, i) => i !== subIndex);
    newBullets[bulletIndex] = {
      ...newBullets[bulletIndex],
      subBullets: subBullets.length > 0 ? subBullets : undefined,
    };
    newSlides[slideIndex] = { ...newSlides[slideIndex], bullets: newBullets };
    setOutline({ ...outline, slides: newSlides });
  };

  const toggleSlideExpanded = (slideIndex: number) => {
    const newExpanded = new Set(expandedSlides);
    if (newExpanded.has(slideIndex)) {
      newExpanded.delete(slideIndex);
    } else {
      newExpanded.add(slideIndex);
    }
    setExpandedSlides(newExpanded);
  };

  const hasResponses = themeResults.length > 0 || responses.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          {heading}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analyze button - only show if no outline yet */}
        {!outline && (
          <>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !hasResponses}
              className="w-full min-h-[48px]"
            >
              {isAnalyzing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Analyzing responses...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {analyzeLabel}
                </>
              )}
            </Button>

            {!hasResponses && (
              <p className="text-sm text-gray-500 text-center">
                Waiting for participant feedback. Generate test responses above or share the link.
              </p>
            )}

            {analyzeError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{analyzeError}</p>
                {analyzeError.includes('OPENAI_API_KEY') && (
                  <p className="text-xs text-red-600 mt-1">
                    Set the OPENAI_API_KEY environment variable in your deployment settings.
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyze}
                  className="mt-2"
                >
                  Try again
                </Button>
              </div>
            )}
          </>
        )}

        {/* Outline editor */}
        {outline && (
          <div className="space-y-4">
            {/* Deck title */}
            <div>
              <label className="text-sm font-medium text-gray-700">Deck Title</label>
              <Input
                value={outline.deckTitle}
                onChange={(e) => updateDeckTitle(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Slides */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Slides ({outline.slides.length})
                </label>
                <Button variant="outline" size="sm" onClick={addSlide} className="h-8">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Slide
                </Button>
              </div>

              {/* Interest scoring guide */}
              {outline.slides.some(s => s.interest) && (
                <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                  Sections marked <span className="text-red-600 font-medium">Low interest</span> reflect "cover less" signals. Keep or remove them based on your plan.
                </p>
              )}

              {outline.slides.map((slide, slideIndex) => (
                <div
                  key={slideIndex}
                  className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
                >
                  {/* Slide header */}
                  <div
                    className="flex items-center gap-2 p-3 bg-white cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSlideExpanded(slideIndex)}
                  >
                    {expandedSlides.has(slideIndex) ? (
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-gray-500 shrink-0">
                      {slideIndex + 1}.
                    </span>
                    <span className={`text-sm font-medium truncate flex-1 min-w-0 ${slide.title ? 'text-gray-900' : 'text-gray-400'}`}>
                      {slide.title || 'New Slide'}
                    </span>
                    {slide.interest && (
                      <span
                        className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded ${
                          slide.interest.label === 'high'
                            ? 'bg-green-100 text-green-700'
                            : slide.interest.label === 'low'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                        title={`${slide.interest.more} more / ${slide.interest.less} less`}
                      >
                        {slide.interest.label === 'high' ? 'High' : slide.interest.label === 'low' ? 'Low' : 'Neutral'}
                        {' '}
                        ({slide.interest.score > 0 ? '+' : ''}{slide.interest.score})
                      </span>
                    )}
                    {outline.slides.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSlide(slideIndex);
                        }}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Slide content (expanded) */}
                  {expandedSlides.has(slideIndex) && (
                    <div className="p-3 pt-0 space-y-3">
                      {/* Slide title input */}
                      <Input
                        value={slide.title}
                        onChange={(e) => updateSlideTitle(slideIndex, e.target.value)}
                        placeholder="Slide title"
                        className="text-sm"
                      />

                      {/* Low-interest helper */}
                      {slide.interest?.label === 'low' && (
                        <p className="text-xs text-gray-500">
                          Consider removing — participants signaled lower interest in this topic.
                        </p>
                      )}

                      {/* Bullets */}
                      <div className="space-y-2">
                        {slide.bullets.map((bullet, bulletIndex) => (
                          <div key={bulletIndex} className="space-y-1">
                            {/* Main bullet */}
                            <div className="flex items-start gap-2">
                              <span className="text-gray-400 mt-2.5">•</span>
                              <Textarea
                                value={bullet.text}
                                onChange={(e) => updateBulletText(slideIndex, bulletIndex, e.target.value)}
                                placeholder="New point"
                                className="flex-1 text-sm min-h-[38px] resize-none"
                                rows={1}
                              />
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addSubBullet(slideIndex, bulletIndex)}
                                  className="h-7 w-7 p-0 text-gray-400 hover:text-violet-600"
                                  title="Add sub-bullet"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                {slide.bullets.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeBullet(slideIndex, bulletIndex)}
                                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Sub-bullets */}
                            {bullet.subBullets?.map((subBullet, subIndex) => (
                              <div key={subIndex} className="flex items-start gap-2 ml-6">
                                <span className="text-gray-300 mt-2.5">—</span>
                                <Input
                                  value={subBullet}
                                  onChange={(e) =>
                                    updateSubBullet(slideIndex, bulletIndex, subIndex, e.target.value)
                                  }
                                  placeholder="New sub-point"
                                  className="flex-1 text-xs h-8"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSubBullet(slideIndex, bulletIndex, subIndex)}
                                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 shrink-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ))}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addBullet(slideIndex)}
                          className="text-xs text-gray-500 hover:text-violet-600"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add bullet
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full min-h-[44px]"
              >
                {isAnalyzing ? 'Regenerating...' : 'Regenerate Outline'}
              </Button>

              <Button
                onClick={handleGeneratePptx}
                disabled={isGeneratingPptx}
                className="w-full min-h-[48px]"
              >
                {isGeneratingPptx ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating PowerPoint...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Generate PowerPoint
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
