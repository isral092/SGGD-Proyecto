import CryptoJS from 'crypto-js'

// ==========================================
// ⚠️ ADVERTENCIA DE SEGURIDAD ⚠️
// Este 'SECRET_SALT' se compila y envía al frontend.
// NO es un secreto real. Sirve únicamente para
// propósitos de hashing de verificación de URL, pero 
// no para seguridad criptográfica real.
// Para verdadera seguridad, el hashing debe hacerse 
// en un servidor/backend seguro o Edge Function.
// ==========================================
const SECRET_SALT = import.meta.env.VITE_HASH_SALT ?? 'PROYECTO_2024'

export function generarHashGarantia(serie: string, email: string): string {
  const input = `${serie}-${email}-${SECRET_SALT}`
  return CryptoJS.SHA256(input).toString()
}
