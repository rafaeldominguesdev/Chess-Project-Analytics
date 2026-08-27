import { describe, it, expect } from 'vitest'
import { detectGamePhase } from './gamePhase'

describe('detectGamePhase', () => {
  it('lance 5, material cheio → abertura', () => {
    expect(detectGamePhase(5, 78)).toBe('abertura')
  })

  it('lance 10 (limite), material cheio → ainda abertura', () => {
    expect(detectGamePhase(10, 78)).toBe('abertura')
  })

  it('lance 11, material cheio → meio-jogo', () => {
    expect(detectGamePhase(11, 78)).toBe('meio-jogo')
  })

  it('lance 30, material alto → meio-jogo', () => {
    expect(detectGamePhase(30, 40)).toBe('meio-jogo')
  })

  it('lance 30, material baixo (peças maiores já saíram) → final', () => {
    expect(detectGamePhase(30, 18)).toBe('final')
  })

  it('lance 11, material exatamente no limiar (20) → final', () => {
    expect(detectGamePhase(11, 20)).toBe('final')
  })
})
