export function sanitizeRedirect(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  return value
}
