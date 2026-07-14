import { describe, expect, it } from 'vitest'
import { resolveAssetUrl } from '../../utils/assetUrl'

describe('resolveAssetUrl', () => {
  it('prefixes a root-relative public asset with the deployment base', () => {
    expect(resolveAssetUrl('/images/tea.webp', '/deang-sour-tea-platform/'))
      .toBe('/deang-sour-tea-platform/images/tea.webp')
  })

  it('keeps root deployment paths unchanged', () => {
    expect(resolveAssetUrl('/images/tea.webp', '/')).toBe('/images/tea.webp')
  })

  it('does not duplicate an existing deployment base', () => {
    expect(resolveAssetUrl('/deang-sour-tea-platform/images/tea.webp', '/deang-sour-tea-platform/'))
      .toBe('/deang-sour-tea-platform/images/tea.webp')
  })

  it('normalizes a deployment base without boundary slashes', () => {
    expect(resolveAssetUrl('/images/tea.webp', 'deang-sour-tea-platform'))
      .toBe('/deang-sour-tea-platform/images/tea.webp')
  })

  it.each([
    'https://cdn.example/tea.webp',
    'data:image/png;base64,AA',
    'blob:https://example/id',
    '//cdn.example/a.webp',
  ])('keeps absolute source %s unchanged', (source) => {
    expect(resolveAssetUrl(source, '/deang-sour-tea-platform/')).toBe(source)
  })

  it.each(['', null, undefined])('returns an empty string for an empty source', (source) => {
    expect(resolveAssetUrl(source, '/deang-sour-tea-platform/')).toBe('')
  })
})
