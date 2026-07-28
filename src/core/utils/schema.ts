import { z } from 'zod'

/** Schema para el formulario de registro de garantía */
export const garantiaRegistroSchema = z.object({
  numero_serie: z.string().min(3, 'Serial demasiado corto'),
  modelo_producto: z.string().min(2, 'El modelo es obligatorio'),
  cliente_email: z.string().email('Email inválido'),
  fecha_venta: z.string().min(1, 'La fecha de venta es obligatoria'),
  duracion_meses: z.number().int().positive('La duración debe ser mayor a 0'),
})

export type GarantiaRegistroInput = z.infer<typeof garantiaRegistroSchema>

/** Schema para garantía completa (incluye fecha calculada) */
export const garantiaSchema = garantiaRegistroSchema.extend({
  fecha_vencimiento: z.string().min(1, 'La fecha de vencimiento es obligatoria'),
})
