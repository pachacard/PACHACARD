// lib/rateLimit.ts

/**
 * Rate limiter en memoria (por proceso).
 *
 * Objetivo:
 * - Reducir abuso básico (spam de requests) en endpoints sensibles.
 *
 * Cómo funciona:
 * - Ventana fija (window) en milisegundos: W
 * - Máximo de hits permitidos dentro de la ventana: M
 * - Se guarda un contador por key (ej: ip|user-agent)
 *
 * Limitaciones importantes:
 * - En serverless con múltiples instancias, cada instancia tiene su propio Map:
 *   no es un rate limit global.
 * - Al reiniciar el proceso se pierde el estado.
 * - Sirve como "freno" simple, no como seguridad fuerte.
 *
 * Si necesitas rate limit real global:
 * - Usa Redis/Upstash/Cloudflare Rate Limiting, etc.
 */

const W = Number(process.env.RL_WINDOW_MS || 30_000); // ventana (ms)
const M = Number(process.env.RL_MAX_HITS || 10);      // hits máximos por ventana

type Bucket = { h: number; ts: number };
const buckets = new Map<string, Bucket>();

/**
 * Aplica rate limiting a una key.
 *
 * @param k Identificador del cliente (ej: ip|user-agent)
 * @returns true si puede pasar, false si excedió el límite
 */
export function rateLimit(k: string) {
  const now = Date.now();
  const v = buckets.get(k) || { h: 0, ts: now };

  // Si la ventana expiró, reinicia contador
  if (now - v.ts > W) {
    v.h = 0;
    v.ts = now;
  }

  v.h++;
  buckets.set(k, v);
  return v.h <= M;
}
