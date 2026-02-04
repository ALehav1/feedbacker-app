export interface SuggestionGroup {
  label: string;
  count: number;
  normalized: string;
}

const bulletPrefix = /^[-•]\s+/;
const labeledPrefix = /^(topic|suggestion|cover|idea)\s*[:-]\s*/i;
const trailingPunctuation = /^[\s\u2022.,;:!?()"'-]+|[\s\u2022.,;:!?()"'-]+$/g;
const suggestedStart = '[SUGGESTED_TOPICS]';
const suggestedEnd = '[/SUGGESTED_TOPICS]';
const suggestedBlockRegex = /\[SUGGESTED_TOPICS\]([\s\S]*?)\[\/SUGGESTED_TOPICS\]/i;

export function normalizeSuggestion(text: string): string {
  return text
    .toLowerCase()
    .replace(trailingPunctuation, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractSuggestions(text: string | null | undefined): string[] {
  const raw = (text || '').trim();
  if (!raw) return [];

  const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
  const extracted: string[] = [];

  for (const line of lines) {
    if (bulletPrefix.test(line)) {
      const cleaned = line.replace(bulletPrefix, '').trim();
      if (cleaned) extracted.push(cleaned);
      continue;
    }

    if (labeledPrefix.test(line)) {
      const cleaned = line.replace(labeledPrefix, '').trim();
      if (cleaned) extracted.push(cleaned);
    }
  }

  if (extracted.length > 0) return extracted;

  if (raw.length <= 120) {
    return [raw];
  }

  return [];
}

export function extractSuggestionsFromSuggestedRaw(text: string | null | undefined): string[] {
  const raw = (text || '').trim();
  if (!raw) return [];

  const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
  const extracted: string[] = [];

  for (const line of lines) {
    if (bulletPrefix.test(line)) {
      continue;
    }
    extracted.push(line);
  }

  return extracted;
}

export function serializeSuggestionsAndFreeform(
  suggestedTopicsRaw: string | null | undefined,
  freeformText: string | null | undefined
): string | null {
  const suggestions = (suggestedTopicsRaw || '').trim();
  const freeform = (freeformText || '').trim();

  if (!suggestions && !freeform) return null;

  if (!suggestions) return freeform || null;

  const block = `${suggestedStart}\n${suggestions}\n${suggestedEnd}`;
  if (!freeform) return block;

  return `${block}\n\n${freeform}`;
}

export function parseSuggestionsAndFreeform(
  stored: string | null | undefined
): { suggestedTopicsRaw: string | null; freeformText: string | null } {
  const raw = (stored || '').trim();
  if (!raw) {
    return { suggestedTopicsRaw: null, freeformText: null };
  }

  const match = raw.match(suggestedBlockRegex);
  if (!match) {
    return { suggestedTopicsRaw: null, freeformText: raw };
  }

  const suggestedTopicsRaw = match[1]?.trim() || null;
  const withoutBlock = raw.replace(suggestedBlockRegex, '').trim();

  return {
    suggestedTopicsRaw,
    freeformText: withoutBlock || null,
  };
}

export function groupSuggestions(items: string[]): SuggestionGroup[] {
  const groups = new Map<string, SuggestionGroup>();

  for (const item of items) {
    const normalized = normalizeSuggestion(item);
    if (!normalized) continue;

    const existing = groups.get(normalized);
    if (existing) {
      existing.count += 1;
      continue;
    }

    groups.set(normalized, {
      label: item.trim(),
      count: 1,
      normalized,
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
}

export function buildSuggestionGroupsFromResponses(
  responses: Array<{ freeFormText: string | null }>
): { groups: SuggestionGroup[]; rawSuggestions: string[] } {
  const rawSuggestions: string[] = [];

  responses.forEach(response => {
    const parsed = parseSuggestionsAndFreeform(response.freeFormText);
    const extracted = parsed.suggestedTopicsRaw
      ? extractSuggestionsFromSuggestedRaw(parsed.suggestedTopicsRaw)
      : extractSuggestions(parsed.freeformText);
    rawSuggestions.push(...extracted);
  });

  return {
    groups: groupSuggestions(rawSuggestions),
    rawSuggestions,
  };
}
