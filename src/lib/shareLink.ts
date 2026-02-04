export type ShareTokenValidation = 'ok' | 'expired'

export function validateShareToken(
  publishedShareToken: string | null | undefined,
  urlToken: string | null
): ShareTokenValidation {
  const token = publishedShareToken?.trim()

  if (!token) {
    return 'ok'
  }

  if (!urlToken) {
    return 'expired'
  }

  return token === urlToken ? 'ok' : 'expired'
}

export function buildParticipantUrl(
  baseUrl: string,
  slug: string,
  publishedShareToken?: string | null
): string {
  const token = publishedShareToken?.trim()
  if (!token) {
    return `${baseUrl}/s/${slug}`
  }

  return `${baseUrl}/s/${slug}?k=${encodeURIComponent(token)}`
}

export function buildPreviewUrl(
  baseUrl: string,
  slug: string,
  publishedShareToken?: string | null
): string {
  const token = publishedShareToken?.trim()
  if (!token) {
    return `${baseUrl}/s/${slug}?preview=working`
  }

  return `${baseUrl}/s/${slug}?k=${encodeURIComponent(token)}&preview=working`
}
