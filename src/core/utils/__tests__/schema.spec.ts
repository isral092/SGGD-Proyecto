import { describe, it, expect } from 'vitest'
import {
  garantiaRegistroSchema,
  reclamacionRegistroSchema,
  nuevoEmpleadoSchema,
} from '../schema'

describe('schema - garantiaRegistroSchema', () => {
  it('limpia espacios en blanco y normaliza serie a mayusculas y email a minusculas', () => {
    const data = garantiaRegistroSchema.parse({
      numero_serie: '  sn-990 ',
      modelo_producto: '  Laptop Pro 15 ',
      cliente_email: '  CLIENTE@Gmail.COM ',
      fecha_venta: '2026-08-15',
      duracion_meses: 12,
    })

    expect(data.numero_serie).toBe('SN-990')
    expect(data.modelo_producto).toBe('Laptop Pro 15')
    expect(data.cliente_email).toBe('cliente@gmail.com')
  })

  it('rechaza cadenas compuestas unicamente por espacios en blanco', () => {
    const res = garantiaRegistroSchema.safeParse({
      numero_serie: '     ',
      modelo_producto: '   ',
      cliente_email: 'cliente@gmail.com',
      fecha_venta: '2026-08-15',
      duracion_meses: 12,
    })

    expect(res.success).toBe(false)
    expect(res.error?.issues[0]?.message).toBe('Serial demasiado corto')
  })

  it('rechaza email invalido o duracion no positiva', () => {
    const res = garantiaRegistroSchema.safeParse({
      numero_serie: 'SN-100',
      modelo_producto: 'Monitor',
      cliente_email: 'correo-invalido',
      fecha_venta: '2026-08-15',
      duracion_meses: 0,
    })

    expect(res.success).toBe(false)
  })
})

describe('schema - reclamacionRegistroSchema', () => {
  it('acepta reclamacion con evidencia vacia o con URL http/https valida', () => {
    const sinUrl = reclamacionRegistroSchema.safeParse({
      motivo: 'defecto_fabricacion',
      descripcion: '  Pantalla con linea vertical  ',
      evidencia_url: '',
    })
    expect(sinUrl.success).toBe(true)

    const conUrl = reclamacionRegistroSchema.safeParse({
      motivo: 'averia',
      descripcion: 'No enciende',
      evidencia_url: 'https://ejemplo.com/evidencia.jpg',
    })
    expect(conUrl.success).toBe(true)
  })

  it('rechaza motivo vacio o URL de evidencia sin protocolo http/https', () => {
    const motivoVacio = reclamacionRegistroSchema.safeParse({
      motivo: '   ',
      descripcion: 'Algo',
      evidencia_url: '',
    })
    expect(motivoVacio.success).toBe(false)

    const urlInvalida = reclamacionRegistroSchema.safeParse({
      motivo: 'otro',
      descripcion: 'Algo',
      evidencia_url: 'texto-que-no-es-url',
    })
    expect(urlInvalida.success).toBe(false)
  })
})

describe('schema - nuevoEmpleadoSchema', () => {
  it('valida y normaliza datos correctos para un nuevo empleado', () => {
    const data = nuevoEmpleadoSchema.parse({
      nombre: '  Carlos Gomez  ',
      email: '  CARLOS@EMPRESA.COM ',
      password: 'password123',
      rol: 'empleado',
    })
    expect(data.nombre).toBe('Carlos Gomez')
    expect(data.email).toBe('carlos@empresa.com')
    expect(data.rol).toBe('empleado')
  })

  it('rechaza contraseñas de menos de 6 caracteres y roles invalidos', () => {
    const passCorta = nuevoEmpleadoSchema.safeParse({
      nombre: 'Ana',
      email: 'ana@empresa.com',
      password: '123',
      rol: 'empleado',
    })
    expect(passCorta.success).toBe(false)

    const rolInvalido = nuevoEmpleadoSchema.safeParse({
      nombre: 'Ana',
      email: 'ana@empresa.com',
      password: 'password123',
      rol: 'superadmin',
    })
    expect(rolInvalido.success).toBe(false)
  })
})
