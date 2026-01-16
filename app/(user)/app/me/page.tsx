// app/(user)/app/me/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import QRCode from "qrcode";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";
import QrActions from "./QrActions";

export const dynamic = "force-dynamic";

/**
 * Se genera un QR estable para la tarjeta:
 * - El token JWT se firma con QR_JWT_SECRET.
 * - iat/exp se basan en createdAt para que el QR no cambie en cada refresh.
 * - jti se setea con tokenVersion para permitir rotación/invalidez de QRs anteriores.
 */
async function buildStableQr(user: any) {
  const secret = new TextEncoder().encode(process.env.QR_JWT_SECRET || "devsecret");

  const createdAt = new Date(user.createdAt ?? Date.now());
  const iatSec = Math.floor(createdAt.getTime() / 1000);
  const expSec = iatSec + 60 * 60 * 24 * 365; // 1 año desde el alta

  const jwt = await new jose.SignJWT({ tier: user.tier })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id)) // sub = userId
    .setJti(String(user.tokenVersion ?? 1)) // versión del token
    .setIssuedAt(iatSec)
    .setExpirationTime(expSec)
    .sign(secret);

  // Se arma la URL base según entorno (Vercel/Local)
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_BASE_URL ||
    "http://localhost:3000";

  // Se construye la URL de canje y se convierte a imagen (data URL)
  const url = `${base}/redeem?token=${jwt}`;
  const dataUrl = await QRCode.toDataURL(url);

  return { url, dataUrl };
}

/** Se renderiza un chip visual para el tier (BASIC / NORMAL / PREMIUM). */
function TierChip({ tier }: { tier: string }) {
  const map: Record<string, string> = {
    BASIC: "from-slate-500 to-slate-700",
    NORMAL: "from-sky-500 to-sky-700",
    PREMIUM: "from-amber-400 to-amber-600",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full bg-gradient-to-r ${
        map[tier] ?? "from-slate-400 to-slate-600"
      } px-3 py-1 text-xs font-semibold text-white shadow-sm`}
    >
      {tier}
    </span>
  );
}

/** Se muestra el estado de la cuenta según user.status. */
function StatusPill({ status }: { status: string }) {
  const ok = status === "ACTIVE";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        ok
          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
          : "bg-rose-100 text-rose-700 border border-rose-200"
      }`}
    >
      {ok ? "Verificado" : "Inactivo"}
    </span>
  );
}

/**
 * Se muestra la pantalla "Mi información":
 * - Se valida sesión y se obtiene al usuario desde BD.
 * - Se genera el QR estable (JWT + imagen).
 * - Se calcula cuántos canjes tiene registrados el usuario.
 */
export default async function MePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: String(session.user.email) },
  });
  if (!user) redirect("/login");

  const qr = await buildStableQr(user);

  // Se cuenta cuántos canjes tiene el usuario en la tabla Redemption
  const redemptionsCount = await prisma.redemption.count({
    where: { userId: user.id },
  });

  return (
    <div className="container-app py-6 md:py-8 space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold">Mi información</h1>
        <p className="mt-1 text-sm text-slate-600">
          Revisa los datos de tu cuenta PACHACARD y tu código QR de canje.
        </p>
      </header>

      {/* Tarjeta principal de cuenta */}
      <section className="rounded-2xl bg-gradient-to-r from-[#7e1515] via-[#b62020] to-[#7e1515] text-white shadow-xl">
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/15 grid place-content-center text-lg font-semibold">
                {(user.name || "?").slice(0, 1).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="text-xs text-white/80 mb-1">Cuenta PACHACARD</p>
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-xs text-white/80 truncate">
                  {user.email?.toString().toLowerCase()}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <TierChip tier={String(user.tier)} />
              <StatusPill status={String(user.status)} />
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/10 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/70">
                Nivel de membresía
              </p>
              <p className="text-sm font-semibold">{String(user.tier ?? "—")}</p>
            </div>

            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-white/70">
                Alta
              </p>
              <p className="text-sm">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("es-PE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Datos + beneficios */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="card-body">
            <h2 className="card-title mb-2">Información personal</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--brand,#7e1515)]">
                  ✉️
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Correo electrónico</p>
                  <p className="truncate text-sm font-medium text-slate-900">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--brand,#7e1515)]">
                  🎟️
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Canjes realizados</p>
                  <p className="truncate text-sm font-mono text-slate-900">
                    {redemptionsCount} {redemptionsCount === 1 ? "canje" : "canjes"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h2 className="card-title mb-2">
              Beneficios de tu nivel {String(user.tier ?? "").toUpperCase()}
            </h2>

            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">✔</span>
                <span>Acceso a descuentos exclusivos en comercios afiliados al programa.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">✔</span>
                <span>Beneficios vigentes mientras se esté al día en tributos municipales.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">✔</span>
                <span>Acceso a todos los descuentos disponibles para el tier.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">✔</span>
                <span>Atención preferente en coordinaciones relacionadas a PACHACARD.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Ayuda + QR */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="card">
          <div className="card-body">
            <h2 className="card-title mb-2">¿Necesitas ayuda?</h2>

            <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-amber-400 p-4 text-sm text-amber-900">
              <p className="font-semibold mb-1">Contacta a la Municipalidad de Pachacámac</p>
              <p className="mb-2">
                Si hay problemas con la cuenta PACHACARD, pérdida de tarjeta o dudas sobre beneficios,
                se puede coordinar por los canales indicados.
              </p>
              <ul className="space-y-1">
                <li>• Central telefónica: 921561684</li>
                <li>• Correo de consultas: pachacardmuni@gmail.com</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h2 className="card-title mb-1">Mi QR</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Este código es el que se imprime en la tarjeta <strong>PACHACARD</strong>.
              Para canjear en comercios se usa la tarjeta física; el QR web queda como referencia.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row items-start gap-4">
              <div className="rounded-2xl border bg-white p-2 shadow-sm">
                <img
                  src={qr.dataUrl}
                  alt="QR PACHACARD"
                  className="h-36 w-36 sm:h-40 sm:w-40 object-contain"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-3 text-xs sm:text-sm text-slate-600">
                <ul className="list-disc pl-4">
                  <li>El código es estable y no cambia al recargar.</li>
                  <li>Si se pierde la tarjeta, se rota el token para invalidar el QR anterior.</li>
                </ul>

               
                <QrActions redeemUrl={qr.url} qrSrc={qr.dataUrl} />

                <div className="pt-2 border-t border-slate-200 md:hidden">
                  <SignOutButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
