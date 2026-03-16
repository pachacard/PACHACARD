// lib/audit.ts
import { prisma } from "@/lib/prisma";

type AuditInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  module: string;
  entity?: string | null;
  entityId?: string | null;
  description?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

export async function writeAuditLog(data: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: data.actorId ?? null,
        actorEmail: data.actorEmail ?? null,
        action: data.action,
        module: data.module,
        entity: data.entity ?? null,
        entityId: data.entityId ?? null,
        description: data.description ?? null,
        oldValues: data.oldValues as any,
        newValues: data.newValues as any,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("[AUDIT_LOG_ERROR]", error);
  }
}