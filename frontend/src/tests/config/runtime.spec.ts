import { describe, expect, it, vi } from 'vitest'
import { initializeRepositoryMode } from '../../config/runtime'

describe('initializeRepositoryMode', () => {
  it('skips API detection for a static demo build', async () => {
    const detectApi = vi.fn().mockResolvedValue('hybrid')
    await initializeRepositoryMode(detectApi, 'true')
    expect(detectApi).not.toHaveBeenCalled()
  })

  it('keeps API detection for local development', async () => {
    const detectApi = vi.fn().mockResolvedValue('demo')
    await initializeRepositoryMode(detectApi, undefined)
    expect(detectApi).toHaveBeenCalledOnce()
  })
})
