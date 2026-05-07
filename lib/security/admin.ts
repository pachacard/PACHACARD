import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireFreshAdmin() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!session?.user || !userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      sessionVersion: true,
    },
  });

  if (!user || user.status !== "ACTIVE" || user.role !== "ADMIN") {
    return null;
  }

  return { session, user };
}

export async function requireActiveSession() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!session?.user || !userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      sessionVersion: true,
    },
  });

  if (!user || user.status !== "ACTIVE") return null;

  return { session, user };
}
