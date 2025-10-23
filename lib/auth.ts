// ======================================================
// 📁 lib/auth.ts — NextAuth v5 con augmentations correctas
// ======================================================

import NextAuth, { type DefaultSession, type User as NextAuthUser } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";

// ======================================================
// 🔧 EXTENSIÓN DE TIPOS (sin referencias circulares)
// ======================================================

declare module "next-auth" {
  // Extiende el tipo User que retornas en `authorize`
  interface User {
    id: string;
    role: "ADMIN" | "USER";
    tier: "BASIC" | "NORMAL" | "PREMIUM";
  }

  // Extiende la Session usando DefaultSession (evita ciclo)
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

// ======================================================
// 🧩 UTIL
// ======================================================
function normalizeTier(t: unknown): "BASIC" | "NORMAL" | "PREMIUM" {
  const k = String(t ?? "").trim().toUpperCase();
  return k === "BASIC" || k === "NORMAL" || k === "PREMIUM" ? (k as any) : "BASIC";
}

// ======================================================
// ⚙️ CONFIG — Tipo a prueba de versión
// ======================================================
type AuthConfigInferred = Parameters<typeof NextAuth>[0];

export const authConfig: AuthConfigInferred = {
  // Usa el mismo secreto que el middleware
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
      async authorize(c) {
        const email = String(c?.email || "").toLowerCase().trim();
        const pass = String(c?.password || "");
        if (!email || !pass) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(pass, user.passwordHash);
        if (!ok || user.status !== "ACTIVE") return null;

        // Retorna un User que ya incluye role/tier
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

  pages: { signIn: "/login", error: "/login" },

  callbacks: {
    // Tipado explícito
    async jwt({ token, user }: { token: JWT; user?: NextAuthUser | null }) {
      if (user) {
        token.sub = user.id; // ✅ asegura que session pueda leerlo
        token.id = user.id;
        token.role = (user as any).role ?? "USER";
        token.tier = (user as any).tier ?? "BASIC";
      }
      return token;
    },

    async session({
      session,
      token,
    }: {
      session: import("next-auth").Session;
      token: JWT;
    }) {
      if (session.user) {
        // lee primero de sub; fallback a id
        session.user.id = (token.sub as string) ?? (token.id as string) ?? "";
        session.user.role = (token.role as "ADMIN" | "USER") ?? "USER";
        session.user.tier = (token.tier as "BASIC" | "NORMAL" | "PREMIUM") ?? "BASIC";
      }
      return session;
    },
  },
};

// ======================================================
// 🚀 EXPORTS v5 (App Router)
// ======================================================
export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth(authConfig);
