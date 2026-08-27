import { describe, it, expect } from 'vitest'
import { parseClockSeconds, parseTimeControlBaseSeconds } from './clock'

describe('parseClockSeconds', () => {
  it('parseia H:MM:SS', () => {
    expect(parseClockSeconds('0:05:30')).toBe(330)
  })

  it('parseia M:SS', () => {
    expect(parseClockSeconds('2:45')).toBe(165)
  })

  it('null de entrada devolve null', () => {
    expect(parseClockSeconds(null)).toBeNull()
  })

  it('formato irreconhecível devolve null', () => {
    expect(parseClockSeconds('não é relógio')).toBeNull()
  })
})

describe('parseTimeControlBaseSeconds', () => {
  it('parseia controle simples ("600")', () => {
    expect(parseTimeControlBaseSeconds('600')).toBe(600)
  })

  it('parseia controle com incremento ("600+5"), ignora o incremento', () => {
    expect(parseTimeControlBaseSeconds('600+5')).toBe(600)
  })

  it('parseia controle por correspondência ("1/259200")', () => {
    expect(parseTimeControlBaseSeconds('1/259200')).toBe(259200)
  })

  it('undefined devolve null', () => {
    expect(parseTimeControlBaseSeconds(undefined)).toBeNull()
  })

  it('formato irreconhecível devolve null', () => {
    expect(parseTimeControlBaseSeconds('-')).toBeNull()
  })
})
