import CryptoJS from 'crypto-js'

/**
 * Salt usado para generar el hash del certificado.
 * Debe coincidir con el valor usado al registrar garantías existentes.
 * En producción, definir VITE_HASH_SALT en variables de entorno.
 */
const SECRET_SALT = import.meta.env.VITE_HASH_SALT ?? 'PROYECTO_2024'

export function generarHashGarantia(serie: string, email: string): string {
  const input = `${serie}-${email}-${SECRET_SALT}`
  return CryptoJS.SHA256(input).toString()
}
