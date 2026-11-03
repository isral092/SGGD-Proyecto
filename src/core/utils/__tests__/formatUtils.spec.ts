import { describe, it, expect } from 'vitest'
import { enmascararEmail } from '../formatUtils'

describe('formatUtils - enmascararEmail', () => {
  it('enmascara un correo estandar mostrando solo los primeros 2 caracteres y el dominio', () => {
    expect(enmascararEmail('isral19827@gmail.com')).toBe('is******@gmail.com')
    expect(enmascararEmail('juan@empresa.mx')).toBe('ju**@empresa.mx')
  })

  it('maneja usuarios cortos de 1 o 2 caracteres sin exponer el usuario completo', () => {
    expect(enmascararEmail('ab@gmail.com')).toBe('a***@gmail.com')
    expect(enmascararEmail('a@gmail.com')).toBe('a***@gmail.com')
  })

  it('devuelve un fallback seguro cuando el email es vacio, nulo o invalido', () => {
    expect(enmascararEmail('')).toBe('Cliente registrado')
    expect(enmascararEmail(null)).toBe('Cliente registrado')
    expect(enmascararEmail(undefined)).toBe('Cliente registrado')
    expect(enmascararEmail('correo-sin-arroba.com')).toBe('Cliente registrado')
    expect(enmascararEmail('usuario@')).toBe('Cliente registrado')
  })
})
