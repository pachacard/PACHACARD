// lib/auth.ts
import NextAuth, { type DefaultSession, type User as NextAuthUser } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";

/**
 * Este archivo define la autenticación para App Router usando NextAuth.
 *
 * Objetivo:
 * - Login por credenciales (email + password)
 * - Sesión tipo JWT (no DB sessions)
 * - Propagar a token/sesión: id, role y tier del usuario
 *
 * Decisiones de seguridad:
 * - Comparación de password usando bcrypt
 * - Solo usuarios ACTIVE pueden iniciar sesión
 * - No exponer datos sensibles (passwordHash nunca se retorna)
 */

/* -----------------------------------------------------------------------------
 * Extensión de tipos (TypeScript augmentations)
 *
 * Problema que resuelve:
 * - Por defecto, Session.user solo tiene { name, email, image }.
 * - Tú necesitas id, role y tier en toda la app (y para permisos).
 *
 * Nota:
 * - Se extiende User (lo que devuelve authorize)
 * - Se extiende Session (lo que recibe el frontend)
 * - Se extiende JWT (lo que vive en el token entre requests)
 * --------------------------------------------------------------------------- */

declare module "next-auth" {
  interface User {
    id: string;
    role: "ADMIN" | "USER";
    tier: "BASIC" | "NORMAL" | "PREMIUM";
  }

  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      role: "ADMIN" | "USER";
      tier: "BASIC" | "NORMAL" | "PREMIUM";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "USER";
    tier?: "BASIC" | "NORMAL" | "PREMIUM";
  }
}

/**
 * Normaliza el tier para evitar valores inválidos en runtime.
 *
 * Motivación:
 * - En BD puede haber strings inconsistentes si se migró data o se cargó batch.
 * - Este helper asegura que el sistema nunca rompa por un tier raro.
 *
 * Regla:
 * - Si no es BASIC/NORMAL/PREMIUM, cae a BASIC por defecto.
 *
 * @param t Valor cualquiera (desconocido) proveniente de BD
 * @returns Tier válido
 */
function normalizeTier(t: unknown): "BASIC" | "NORMAL" | "PREMIUM" {
  const k = String(t ?? "").trim().toUpperCase();
  return k === "BASIC" || k === "NORMAL" || k === "PREMIUM" ? (k as any) : "BASIC";
}

/**
 * Tipo auxiliar para que authConfig sea compatible con la versión instalada de NextAuth.
 * Evita pelearte con cambios de tipos entre versiones.
 */
type AuthConfigInferred = Parameters<typeof NextAuth>[0];

/**
 * Configuración principal de NextAuth.
 *
 * Puntos claves:
 * - secret: usa AUTH_SECRET o NEXTAUTH_SECRET (compatibilidad)
 * - trustHost: recomendado en entornos serverless/proxy
 * - session.strategy = "jwt": la sesión vive en el token, no en tabla de sesiones
 * - provider Credentials: autentica contra BD
 *
 * Flujo de datos:
 * authorize() -> retorna User con id/role/tier
 * jwt() -> copia esos campos al token
 * session() -> copia del token a session.user para uso del frontend
 */
export const authConfig: AuthConfigInferred = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      /**
       * authorize:
       * - Valida credenciales
       * - Consulta usuario en BD por email
       * - Compara password con bcrypt
       * - Verifica estado ACTIVE
       * - Retorna un User con campos mínimos y necesarios (id, name, email, role, tier)
       *
       * Si retorna null:
       * - NextAuth considera login fallido
       */
      async authorize(c) {
        const email = String(c?.email || "").toLowerCase().trim();
        const pass = String(c?.password || "");
        if (!email || !pass) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // Comparación segura con bcrypt (hash almacenado en BD)
        const ok = await bcrypt.compare(pass, user.passwordHash);
        if (!ok || user.status !== "ACTIVE") return null;

        // Retornamos lo necesario para construir token y session.
        // No se retorna passwordHash ni datos sensibles.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: (user.role as "ADMIN" | "USER") ?? "USER",
          tier: normalizeTier(user.tier),
        } satisfies NextAuthUser;
      },
    }),
  ],

  // Rutas personalizadas (App Router)
  pages: { signIn: "/login", error: "/login" },

  callbacks: {
    /**
     * jwt callback:
     * Se ejecuta cuando se crea/actualiza el token.
     *
     * Regla:
     * - Si hay "user" (login exitoso), persistimos id/role/tier en el token.
     * - token.sub se setea con user.id para mantener convención (sub = subject/userId).
     */
    async jwt({ token, user }: { token: JWT; user?: NextAuthUser | null }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.role = (user as any).role ?? "USER";
        token.tier = (user as any).tier ?? "BASIC";
      }
      return token;
    },

    /**
     * session callback:
     * Mapea del token hacia session.user (lo que consumes en el frontend).
     *
     * Importante:
     * - En tu app, session.user.id se usa para queries/permiso/acciones.
     * - Lee primero token.sub (estándar JWT), y usa token.id como fallback.
     */
    async session({
      session,
      token,
    }: {
      session: import("next-auth").Session;
      token: JWT;
    }) {
      if (session.user) {
        session.user.id = (token.sub as string) ?? (token.id as string) ?? "";
        session.user.role = (token.role as "ADMIN" | "USER") ?? "USER";
        session.user.tier = (token.tier as "BASIC" | "NORMAL" | "PREMIUM") ?? "BASIC";
      }
      return session;
    },
  },
};

/**
 * Exports recomendados para NextAuth en App Router.
 * - auth: helper para leer sesión en server components / server actions
 * - signIn/signOut: helpers
 * - handlers GET/POST: endpoints que NextAuth necesita para /api/auth/*
 */
export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth(authConfig);
