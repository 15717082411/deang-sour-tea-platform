import type { CartLine } from '../domain/types'

export function calculateCartTotal(
  lines: readonly Pick<CartLine, 'unitPriceCents' | 'quantity'>[],
): number {
  return lines.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0)
}
