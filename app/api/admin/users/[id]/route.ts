// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

/**
 * Endpoint admin para gestionar un usuario específico.
 *
 * PUT:
 * - Actualiza datos básicos (name, email, legacyContributorCode, tier, role, status)
 * - Opcional: cambia contraseña (password -> passwordHash)
 * - Opcional: rota tokenVersion (invalida QRs anteriores si ENFORCE_TV está activo en canje)
 *
 * DELETE:
 * - Elimina un usuario.
 *   Nota: en vez de borrar, a veces conviene solo poner status=INACTIVE
 *   para no perder auditoría/historial.
 */

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const b = await req.json();

  // Traemos el estado anterior para auditoría
  const before = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      legacyContributorCode: true,
      tier: true,
      role: true,
      status: true,
      tokenVersion: true,
    },
  });

  if (!before) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  // Solo agregamos al update lo que realmente llegó
  const data: any = {};

  if (typeof b.name === "string") data.name = b.name.trim();
  if (typeof b.email === "string") data.email = b.email.toLowerCase().trim();
  if (typeof b.legacyContributorCode === "string") {
    data.legacyContributorCode = b.legacyContributorCode.trim() || null;
  }
  if (typeof b.tier === "string") data.tier = b.tier;
  if (typeof b.role === "string") data.role = b.role;
  if (typeof b.status === "string") data.status = b.status;

  const passwordChanged = typeof b.password === "string" && !!b.password;
  const rotatedQr = !!b.rotateToken;

  // Cambio de contraseña (opcional)
  // Guardamos solo hash, nunca password plano
  if (passwordChanged) {
    data.passwordHash = await bcrypt.hash(b.password, 10);
  }

  // Rotar tokenVersion: invalida QRs previos si tu canje lo valida (ENFORCE_TV)
  if (rotatedQr) {
    data.tokenVersion = { increment: 1 };
  }

  try {
    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        legacyContributorCode: true,
        tier: true,
        role: true,
        status: true,
        tokenVersion: true,
      },
    });

    let action = "UPDATE";
    let description = "Actualización de usuario desde panel admin";

    if (rotatedQr && passwordChanged) {
      action = "UPDATE";
      description = "Actualización de usuario con rotación de QR y cambio de contraseña";
    } else if (rotatedQr) {
      action = "ROTATE_QR";
      description = "Rotación de token/QR de usuario desde panel admin";
    } else if (passwordChanged) {
      action = "CHANGE_PASSWORD";
      description = "Cambio de contraseña de usuario desde panel admin";
    }

    await writeAuditLog({
      actorId: (session.user as any).id ?? null,
      actorEmail: session.user.email ?? null,
      action,
      module: "USERS",
      entity: "User",
      entityId: updated.id,
      description,
      oldValues: before,
      newValues: {
        ...updated,
        passwordChanged: passwordChanged || undefined,
      },
      ip: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2002") {
      const target = e?.meta?.target;

      if (Array.isArray(target) && target.includes("legacyContributorCode")) {
        return NextResponse.json(
          { ok: false, error: "Código contribuyente anterior duplicado" },
          { status: 409 }
        );
      }

      if (Array.isArray(target) && target.includes("email")) {
        return NextResponse.json(
          { ok: false, error: "Email duplicado" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { ok: false, error: "Registro duplicado" },
        { status: 409 }
      );
    }

    console.error(e);
    return NextResponse.json({ ok: false, error: "Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const before = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      legacyContributorCode: true,
      tier: true,
      role: true,
      status: true,
      tokenVersion: true,
    },
  });

  if (!before) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });

    await writeAuditLog({
      actorId: (session.user as any).id ?? null,
      actorEmail: session.user.email ?? null,
      action: "DELETE",
      module: "USERS",
      entity: "User",
      entityId: params.id,
      description: "Eliminación de usuario desde panel admin",
      oldValues: before,
      ip: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Error" }, { status: 500 });
  }
}