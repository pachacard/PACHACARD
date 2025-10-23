import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import QRCode from "qrcode";
import { redirect } from "next/navigation";
import SignOutButton from "@/app/_components/SignOutButton";

export const dynamic = "force-dynamic";

/** Genera un QR estable: iat/exp basados en createdAt (no varía en refresh) */
async function buildStableQr(user: any) {
  const secret = new TextEncoder().encode(process.env.QR_JWT_SECRET || "devsecret");

  const createdAt = new Date(user.createdAt ?? Date.now());
  const iatSec = Math.floor(createdAt.getTime() / 1000);
  const expSec = iatSec + 60 * 60 * 24 * 365; // 1 año desde el alta

  const jwt = await new jose.SignJWT({ tier: user.tier })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setJti(String(user.tokenVersion ?? 1))
    .setIssuedAt(iatSec)
    .setExpirationTime(expSec)
    .sign(secret);

  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_BASE_URL ||
    "http://localhost:3000";

  const url = `${base}/redeem?token=${jwt}`;
  const dataUrl = await QRCode.toDataURL(url);
  return { url, dataUrl };
}

function TierChip({ tier }: { tier: string }) {
  const map: Record<string, string> = {
    BASIC: "bg-slate-100 text-slate-700 border border-slate-200",
    NORMAL: "bg-sky-100 text-sky-700 border border-sky-200",
    PREMIUM: "bg-amber-100 text-amber-700 border border-amber-200",
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${map[tier] ?? "bg-slate-100 text-slate-700"}`}>
      {tier}
    </span>
  );
}
function StatusChip({ status }: { status: string }) {
  const ok = status === "ACTIVE";
  return (
    <span
      className={`px-2 py-0.5 text-xs rounded-full border ${
        ok
          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : "bg-rose-100 text-rose-700 border-rose-200"
      }`}
    >
      {status}
    </span>
  );
}

export default async function MePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: String(session.user.email) },
  });
  if (!user) redirect("/login");

  const qr = await buildStableQr(user);

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-semibold">Mi información</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* PERFIL */}
        <div className="card">
          <div className="card-body">
            <h2 className="card-title mb-1">Perfil</h2>

            <div className="mt-2 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-[var(--brand)]/10 grid place-content-center text-[var(--brand)] font-semibold">
                {(user.name || "?").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="text-lg font-medium leading-tight">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Tier</dt>
                <dd className="mt-0.5"><TierChip tier={String(user.tier)} /></dd>
              </div>
              <div>
                <dt className="text-slate-500">Estado</dt>
                <dd className="mt-0.5"><StatusChip status={String(user.status)} /></dd>
              </div>
              <div>
                <dt className="text-slate-500">Alta</dt>
                <dd className="mt-0.5">
                  {user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">ID de usuario</dt>
                <dd className="mt-0.5 font-mono text-xs text-slate-600 break-all">{user.id}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* MI QR */}
        <div className="card">
          <div className="card-body">
            <h2 className="card-title">Mi QR</h2>
            <p className="text-sm text-slate-600 mt-1">
              Este es el mismo QR que está impreso en tu tarjeta <strong>PACHACARD</strong>.
              Para canjear en comercios, <u>usa únicamente tu tarjeta física</u>.
            </p>

            <div className="mt-4 flex items-start gap-6">
              <div className="shadow-sm rounded-xl border bg-white p-2">
                <img
                  src={qr.dataUrl}
                  alt="QR PACHACARD"
                  className="h-40 w-40 sm:h-48 sm:w-48 object-contain"
                />
              </div>

              <div className="flex-1 min-w-0">
                <ul className="text-sm text-slate-600 list-disc pl-4">
                  <li>El código es estable y no cambia al recargar.</li>
                  <li>Si pierdes la tarjeta, la municipalidad puede <strong>rotar</strong> tu token para invalidar el anterior.</li>
                </ul>
                <p className="text-xs text-slate-500 mt-3">
                  Por seguridad, el enlace del canje no se muestra aquí.
                </p>

                {/* Botón Salir: SOLO en mobile */}
                <div className="md:hidden">
                  <SignOutButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>      
    </div>
  );
}
