import { describe, it, expect } from 'vitest'
import { isImageTooLarge, splitDataUrl, MAX_IMAGE_BYTES } from '../scan'

describe('isImageTooLarge', () => {
  it('acepta imágenes dentro del límite', () => {
    expect(isImageTooLarge(1000)).toBe(false)
    expect(isImageTooLarge(MAX_IMAGE_BYTES)).toBe(false)
  })
  it('rechaza imágenes por encima del límite', () => {
    expect(isImageTooLarge(MAX_IMAGE_BYTES + 1)).toBe(true)
  })
})

describe('splitDataUrl', () => {
  it('separa mimeType y base64', () => {
    const { base64, mimeType } = splitDataUrl('data:image/png;base64,AAAB')
    expect(mimeType).toBe('image/png')
    expect(base64).toBe('AAAB')
  })
  it('usa image/jpeg por defecto si falta el tipo', () => {
    const { mimeType } = splitDataUrl('data:;base64,AAAB')
    expect(mimeType).toBe('image/jpeg')
  })
  it('lanza error si el data URL no tiene coma', () => {
    expect(() => splitDataUrl('imagen-no-valida')).toThrow()
  })
})
