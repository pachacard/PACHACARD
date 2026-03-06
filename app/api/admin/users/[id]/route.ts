// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

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

  // Cambio de contraseña (opcional)
  // Guardamos solo hash, nunca password plano
  if (typeof b.password === "string" && b.password) {
    data.passwordHash = await bcrypt.hash(b.password, 10);
  }

  // Rotar tokenVersion: invalida QRs previos si tu canje lo valida (ENFORCE_TV)
  if (b.rotateToken) {
    data.tokenVersion = { increment: 1 };
  }

  try {
    await prisma.user.update({
      where: { id: params.id },
      data,
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

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Error" }, { status: 500 });
  }
}