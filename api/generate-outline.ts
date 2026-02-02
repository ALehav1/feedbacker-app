import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

interface ThemeResult {
  text: string;
  more: number;
  less: number;
  net: number;
}

interface ResponseData {
  participantName: string | null;
  freeFormText: string | null;
}

interface RequestBody {
  sessionTitle: string;
  sessionSummary: string;
  lengthMinutes: number;
  themeResults: ThemeResult[];
  responses: ResponseData[];
}

interface InterestData {
  score: number;
  label: 'high' | 'neutral' | 'low';
  more: number;
  less: number;
}

interface DeckSlide {
  title: string;
  bullets: Array<{
    text: string;
    subBullets?: string[];
  }>;
  speakerNotes?: string;
  interest?: InterestData;
}

interface DeckOutline {
  deckTitle: string;
  slides: DeckSlide[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json');

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed' } });
  }

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY not configured');
    return res.status(500).json({ error: { code: 'missing_openai_key', message: 'OPENAI_API_KEY is not set for this environment.' } });
  }

  try {
    const body = req.body as RequestBody;
    const { sessionTitle, sessionSummary, lengthMinutes, themeResults, responses } = body;

    // Validate required fields
    if (!sessionTitle || !themeResults) {
      return res.status(400).json({ error: { code: 'missing_fields', message: 'Missing required fields' } });
    }

    // Require at least one response or theme vote
    if (themeResults.length === 0 && (!responses || responses.length === 0)) {
      return res.status(400).json({ error: { code: 'no_feedback', message: 'At least one participant response is required to generate an outline.' } });
    }

    // Build context for AI
    const topicSummary = themeResults
      .map((t, i) => `${i + 1}. "${t.text}" (Net interest: ${t.net > 0 ? '+' : ''}${t.net}, ${t.more} more / ${t.less} less)`)
      .join('\n');

    const freeFormResponses = responses
      .filter(r => r.freeFormText)
      .map(r => `- ${r.participantName || 'Anonymous'}: "${r.freeFormText}"`)
      .join('\n');

    // Calculate target slide count based on presentation length
    const targetSlides = Math.max(6, Math.min(15, Math.floor(lengthMinutes / 5) + 3));

    const prompt = `You are helping a presenter create a slide deck outline based on audience feedback.

## Presentation Info
- Title: ${sessionTitle}
- Length: ${lengthMinutes} minutes
- Summary: ${sessionSummary || 'Not provided'}

## Audience Topic Priorities (sorted by interest)
${topicSummary || 'No topic votes yet'}

## Audience Open-Ended Feedback
${freeFormResponses || 'No written feedback yet'}

## Your Task
Create a presentation outline with approximately ${targetSlides} slides that:
1. Prioritizes topics with higher net interest scores
2. Addresses themes from the open-ended feedback where relevant
3. Includes an engaging opening and clear conclusion
4. Has 2-4 bullet points per slide (with optional sub-bullets for detail)

## Output Format
Respond with ONLY valid JSON matching this exact structure:
{
  "deckTitle": "string",
  "slides": [
    {
      "title": "string",
      "bullets": [
        {
          "text": "string",
          "subBullets": ["string"] // optional
        }
      ],
      "speakerNotes": "string" // optional, brief note for presenter
    }
  ]
}`;

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a presentation design assistant. Always respond with valid JSON only, no markdown formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response (handle potential markdown code blocks)
    let outline: DeckOutline;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      outline = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid response format from AI');
    }

    // Validate structure
    if (!outline.deckTitle || !Array.isArray(outline.slides)) {
      throw new Error('Invalid outline structure');
    }

    // Add interest scoring to slides by matching to theme results
    const normalizeText = (text: string) => text.toLowerCase().trim();

    for (const slide of outline.slides) {
      const slideTitle = normalizeText(slide.title);

      // Find best matching theme by checking if slide title contains theme text or vice versa
      let bestMatch: ThemeResult | null = null;
      let bestMatchScore = 0;

      for (const theme of themeResults) {
        const themeText = normalizeText(theme.text);

        // Check for substring match (either direction)
        const slideContainsTheme = slideTitle.includes(themeText);
        const themeContainsSlide = themeText.includes(slideTitle);

        // Also check for significant word overlap
        const slideWords = new Set(slideTitle.split(/\s+/).filter(w => w.length > 3));
        const themeWords = themeText.split(/\s+/).filter(w => w.length > 3);
        const matchingWords = themeWords.filter(w => slideWords.has(w)).length;
        const overlapScore = themeWords.length > 0 ? matchingWords / themeWords.length : 0;

        // Calculate match score
        let matchScore = 0;
        if (slideContainsTheme || themeContainsSlide) {
          matchScore = 1.0;
        } else if (overlapScore >= 0.5) {
          matchScore = overlapScore;
        }

        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          bestMatch = theme;
        }
      }

      // Add interest data if we found a match with reasonable confidence
      if (bestMatch && bestMatchScore >= 0.5) {
        const score = bestMatch.more - bestMatch.less;
        let label: 'high' | 'neutral' | 'low';
        if (score >= 1) {
          label = 'high';
        } else if (score <= -1) {
          label = 'low';
        } else {
          label = 'neutral';
        }

        slide.interest = {
          score,
          label,
          more: bestMatch.more,
          less: bestMatch.less,
        };
      }
    }

    return res.status(200).json(outline);
  } catch (error) {
    console.error('Generate outline error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate outline';
    // Detect OpenAI-specific errors
    const isOpenAIError = error instanceof Error && (
      error.message.includes('API key') ||
      error.message.includes('rate limit') ||
      error.message.includes('quota')
    );
    return res.status(500).json({
      error: {
        code: isOpenAIError ? 'openai_error' : 'generation_failed',
        message,
      },
    });
  }
}
