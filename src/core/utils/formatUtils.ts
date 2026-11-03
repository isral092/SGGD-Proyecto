/**
 * Enmascara un correo electrónico para proteger datos personales (PII) en vistas públicas.
 * Ejemplo: "isral19827@gmail.com" -> "is******@gmail.com"
 */
export function enmascararEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return 'Cliente registrado'
  const [usuario, dominio] = email.split('@')
  if (!dominio) return 'Cliente registrado'
  if (!usuario) return `***@${dominio}`
  if (usuario.length <= 2) return `${usuario[0]}***@${dominio}`
  return `${usuario.slice(0, 2)}${'*'.repeat(Math.min(usuario.length - 2, 6))}@${dominio}`
}
