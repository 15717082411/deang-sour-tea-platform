import type { CartLine } from '../domain/types'

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label}必须是安全整数`)
  }
}

export function calculateCartTotal(
  lines: readonly Pick<CartLine, 'unitPriceCents' | 'quantity'>[],
): number {
  return lines.reduce((total, line) => {
    assertSafeInteger(line.unitPriceCents, '商品单价（分）')
    assertSafeInteger(line.quantity, '商品数量')

    if (line.quantity <= 0) {
      throw new RangeError('商品数量必须大于零')
    }

    const lineTotal = line.unitPriceCents * line.quantity
    assertSafeInteger(lineTotal, '商品小计（分）')

    const nextTotal = total + lineTotal
    assertSafeInteger(nextTotal, '购物车总额（分）')
    return nextTotal
  }, 0)
}
