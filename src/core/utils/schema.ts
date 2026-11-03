import { z } from 'zod'

/** Schema para el formulario de registro de garantía */
export const garantiaRegistroSchema = z.object({
  numero_serie: z
    .string()
    .trim()
    .min(3, 'Serial demasiado corto')
    .transform((val) => val.toUpperCase()),
  modelo_producto: z.string().trim().min(2, 'El modelo es obligatorio'),
  cliente_email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email inválido'),
  fecha_venta: z.string().trim().min(1, 'La fecha de venta es obligatoria'),
  duracion_meses: z.number().int().positive('La duración debe ser mayor a 0'),
})

export type GarantiaRegistroInput = z.infer<typeof garantiaRegistroSchema>

/** Schema para garantía completa (incluye fecha calculada) */
export const garantiaSchema = garantiaRegistroSchema.extend({
  fecha_vencimiento: z.string().trim().min(1, 'La fecha de vencimiento es obligatoria'),
})

/** Schema para creación de reclamación por parte del cliente */
export const reclamacionRegistroSchema = z.object({
  motivo: z.string().trim().min(1, 'Por favor selecciona el motivo de la reclamación'),
  descripcion: z.string().trim().optional().default(''),
  evidencia_url: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine(
      (val) => val === '' || /^https?:\/\/.+/i.test(val),
      'La URL de evidencia debe iniciar con http:// o https://'
    ),
})
