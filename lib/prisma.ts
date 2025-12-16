// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * Patrón Singleton para PrismaClient en Next.js (especialmente en desarrollo).
 *
 * Problema:
 * - En dev, Next.js hace hot reload y puede re-ejecutar módulos varias veces.
 * - Si creas PrismaClient en cada reload, abres demasiadas conexiones y puedes tumbar la BD.
 *
 * Solución:
 * - Cachear la instancia en globalThis durante desarrollo.
 * - En producción, se crea una instancia normal por runtime (serverless puede recrearse por invocación).
 *
 * Nota:
 * - En entornos serverless, aun así se recomienda mantener la instancia reutilizable en el runtime
 *   mientras esté "caliente" (lo cual este patrón permite).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Instancia compartida de Prisma.
 *
 * Opcional:
 * - Activar logs para depuración:
 *   log: ["query", "error", "warn"]
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // log: ["query", "error", "warn"],
  });

// Solo cacheamos en dev para evitar conexiones duplicadas en hot-reload
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
