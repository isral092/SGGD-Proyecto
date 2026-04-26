import CryptoJS from 'crypto-js'

// Usamos una constante para la "sal" del hash.
// En producción, esto debería venir de una variable de entorno.
const SECRET_SALT = 'SGGD_2026_PROD'

export const generarHashGarantia = (serie: string, email: string): string => {
  // Combinamos datos únicos para crear una huella digital única
  const input = `${serie}-${email}-${SECRET_SALT}`
  return CryptoJS.SHA256(input).toString()
}
