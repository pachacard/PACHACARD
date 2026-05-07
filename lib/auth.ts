// lib/auth.ts
import NextAuth, { type DefaultSession, type User as NextAuthUser } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";
import { headers } from "next/headers";
import {
  assertLoginAllowed,
  clearLoginFailures,
  registerLoginFailure,
} from "@/lib/security/authThrottle";

declare module "next-auth" {
  interface User {
    id: string;
    role: "ADMIN" | "USER";
    tier: "BASIC" | "NORMAL" | "PREMIUM";
    sessionVersion?: number;
  }

  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      role: "ADMIN" | "USER";
      tier: "BASIC" | "NORMAL" | "PREMIUM";
      sessionVersion?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "USER";
    tier?: "BASIC" | "NORMAL" | "PREMIUM";
    sessionVersion?: number;
  }
}

function normalizeTier(t: unknown): "BASIC" | "NORMAL" | "PREMIUM" {
  const k = String(t ?? "").trim().toUpperCase();
  return k === "BASIC" || k === "NORMAL" || k === "PREMIUM" ? (k as any) : "BASIC";
}

type AuthConfigInferred = Parameters<typeof NextAuth>[0];

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

      async authorize(c) {
        const email = String(c?.email || "").toLowerCase().trim();
        const pass = String(c?.password || "");
        if (!email || !pass) return null;

        const h = headers();
        const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const throttleKey = `${email}:${ip}`;

        await assertLoginAllowed(throttleKey);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await registerLoginFailure(throttleKey);
          return null;
        }

        const ok = await bcrypt.compare(pass, user.passwordHash);
        if (!ok || user.status !== "ACTIVE") {
          await registerLoginFailure(throttleKey);
          return null;
        }

        await clearLoginFailures(throttleKey);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: (user.role as "ADMIN" | "USER") ?? "USER",
          tier: normalizeTier(user.tier),
          sessionVersion: user.sessionVersion,
        } satisfies NextAuthUser;
      },
    }),
  ],

  pages: { signIn: "/login", error: "/login" },

  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: NextAuthUser | null }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.role = (user as any).role ?? "USER";
        token.tier = (user as any).tier ?? "BASIC";
        token.sessionVersion = (user as any).sessionVersion ?? 1;
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
        session.user.id = (token.sub as string) ?? (token.id as string) ?? "";
        session.user.role = (token.role as "ADMIN" | "USER") ?? "USER";
        session.user.tier = (token.tier as "BASIC" | "NORMAL" | "PREMIUM") ?? "BASIC";
        session.user.sessionVersion = Number(token.sessionVersion ?? 1);
      }
      return session;
    },
  },
};

export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth(authConfig);
