const ABSOLUTE_URL = /^[a-z][a-z\d+.-]*:/i

export function resolveAssetUrl(
  source: string | null | undefined,
  base = import.meta.env.BASE_URL,
): string {
  if (!source || ABSOLUTE_URL.test(source) || source.startsWith('//')) return source ?? ''
  const normalizedBase = `/${base.replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '') + '/'
  if (normalizedBase === '/' || source.startsWith(normalizedBase)) return source
  return `${normalizedBase}${source.replace(/^\/+/, '')}`
}
