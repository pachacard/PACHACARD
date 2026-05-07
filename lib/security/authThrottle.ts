import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
const LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 15);

export class LoginLockedError extends Error {
  constructor() {
    super("LOGIN_LOCKED");
  }
}

export async function assertLoginAllowed(key: string) {
  const row = await prisma.loginThrottle.findUnique({ where: { key } });

  if (row?.lockedUntil && row.lockedUntil > new Date()) {
    throw new LoginLockedError();
  }
}

export async function registerLoginFailure(key: string) {
  const now = new Date();

  const row = await prisma.loginThrottle.upsert({
    where: { key },
    create: { key, attempts: 1, lastAttemptAt: now },
    update: {
      attempts: { increment: 1 },
      lastAttemptAt: now,
      lockedUntil: null,
    },
  });

  const attempts = row.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await prisma.loginThrottle.update({
      where: { key },
      data: {
        attempts: 0,
        lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000),
      },
    });
  }
}

export async function clearLoginFailures(key: string) {
  await prisma.loginThrottle.deleteMany({ where: { key } });
}
