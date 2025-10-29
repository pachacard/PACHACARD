// app/api/debug/session/route.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // evita prerender

export async function GET() {
  try {
    const s = await auth();
    return NextResponse.json({
      ok: !!s?.user,
      user: s?.user ?? null,
      // útil para revisar qué ve el server
      raw: s ?? null,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
