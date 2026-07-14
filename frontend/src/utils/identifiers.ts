let sequence = 0

export function createBusinessId(prefix: string): string {
  const normalizedPrefix = prefix.trim().toUpperCase()

  if (!/^[A-Z][A-Z0-9_]*$/.test(normalizedPrefix)) {
    throw new Error('业务 ID 前缀必须以字母开头，且只能包含字母、数字或下划线')
  }

  sequence += 1
  return `${normalizedPrefix}-${Date.now().toString(36)}-${sequence.toString(36).padStart(4, '0')}`
}
