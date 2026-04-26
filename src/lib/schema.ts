import { z } from 'zod'

export const garantiaSchema = z.object({
  numero_serie: z.string().min(5, 'La serie debe tener al menos 5 caracteres'),
  modelo_producto: z.string().min(2, 'El modelo es obligatorio'),
  cliente_email: z.string().email('El formato del correo es inválido'),
  fecha_vencimiento: z.string().min(1, 'La fecha es obligatoria'),
})
