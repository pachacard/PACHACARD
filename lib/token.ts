// lib/token.ts
import * as jose from "jose";

/**
 * Secreto para firmar/verificar JWT de QR.
 *
 * Requisito:
 * - Debe existir QR_JWT_SECRET en variables de entorno.
 *
 * Nota:
 * - Es un secreto simétrico (HS256). Por eso se usa encode() y no llaves públicas/privadas.
 * - Si rotas este secreto en producción, TODOS los QRs existentes quedan inválidos.
 */
const secret = new TextEncoder().encode(process.env.QR_JWT_SECRET!);

/**
 * Genera un token "estable" para tarjetas físicas.
 *
 * Diseño:
 * - Token sin expiración (no se setea exp), pensado para QR impreso.
 * - Solo lleva lo mínimo: sub = userId y kind = "card".
 *
 * Implicaciones de seguridad:
 * - Si no hay expiración, necesitas un mecanismo de revocación/rotación.
 *   En tu sistema eso lo da tokenVersion (cuando lo aplicas) o la desactivación del usuario.
 * - Evita meter datos sensibles dentro del token (email, etc.). El token se asume público (está impreso).
 *
 * Recomendación:
 * - Si deseas rotación por tokenVersion, incluye tv/jti aquí (y valida en redeem).
 *
 * @param userId ID del usuario (User.id)
 * @returns JWT firmado con HS256
 */
export async function makeCardToken(userId: string) {
  return await new jose.SignJWT({ sub: userId, kind: "card" })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret); // sin expiración por diseño
}

/**
 * Verifica y decodifica un token QR.
 *
 * Validaciones que hace jose.jwtVerify:
 * - Firma correcta con el secreto
 * - Algoritmo permitido (HS256)
 * - Si el token tuviera exp/nbf, también lo valida automáticamente
 *
 * Importante:
 * - Esta función NO valida estado del usuario, tier, ni tokenVersion.
 *   Solo valida criptografía/claims estándar.
 *
 * @param token JWT recibido (por query param token=...)
 * @returns payload decodificado (ej: { sub, kind?, tv?, tier? })
 * @throws Error si el token es inválido, alterado o expirado (si tuviera exp)
 */
export async function verifyQrToken(token: string) {
  const { payload } = await jose.jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });
  return payload;
}
