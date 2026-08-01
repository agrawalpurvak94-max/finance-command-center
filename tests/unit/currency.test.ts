import { describe, expect, it } from 'vitest'
import { formatINR } from '@/utils/currency'

describe('formatINR', () => {
  it('formats whole rupees with Indian digit grouping', () => {
    expect(formatINR(842100)).toBe('₹8,42,100')
  })

  it('formats crore-scale values with full grouping', () => {
    expect(formatINR(14208500)).toBe('₹1,42,08,500')
  })

  it('formats zero', () => {
    expect(formatINR(0)).toBe('₹0')
  })
})
