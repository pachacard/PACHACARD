// app/(user)/app/discounts/[id]/page.tsx
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MapPin, Calendar, Tag, Sparkles, Award, X } from "lucide-react";

type Tier = "BASIC" | "NORMAL" | "PREMIUM";

/**
 * Formateo fechas para mostrar en UI.
 * Uso es-PE y si algo falla (por locale), caigo a YYYY-MM-DD.
 */
function formatFechaLarga(date: Date) {
  try {
    return date.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function formatFechaCorta(date: Date) {
  try {
    return date.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Pantalla de detalle de un descuento para el contribuyente.
 * Aquí muestro:
 * - info del descuento + negocio + categorías
 * - estado (disponible / límite usado / agotado)
 * - vigencia y límites
 * - ubicación del negocio y enlace a Google Maps (si existe)
 * - tiers permitidos para ese descuento
 */
export default async function DiscountDetail({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const now = new Date();

  /**
   * Traigo el descuento por id.
   * Incluyo:
   * - business: para nombre, dirección, imagen, maps
   * - categories: para mostrar la categoría principal (badge)
   */
  const d = await prisma.discount.findUnique({
    where: { id: params.id },
    include: {
      business: true,
      categories: { include: { category: true } },
    },
  });

  // Si no existe, Next muestra 404.
  if (!d) return notFound();

  /**
   * Calculo:
   * - mine: cuántas veces yo ya canjeé este descuento
   * - userTier: mi tier real desde BD
   *
   * Leo desde BD porque la BD es mi fuente de verdad.
   */
  let mine = 0;
  let userTier: Tier | undefined = undefined;

  if (session?.user?.email) {
    const me = await prisma.user.findUnique({
      where: { email: String(session.user.email).toLowerCase() },
      select: { id: true, tier: true },
    });

    if (me) {
      userTier = me.tier as Tier;
      mine = await prisma.redemption.count({
        where: { userId: me.id, discountId: d.id },
      });
    }
  }

  /**
   * Flags informativos (no son obligatorios para la UI, pero ya los tengo listos):
   * - isNew: si empezó hace <= 7 días
   * - expiringSoon: si vence en <= 3 días y todavía está vigente
   */
  const MS_DAY = 24 * 60 * 60 * 1000;
  const isNew = now.getTime() - d.startAt.getTime() <= 7 * MS_DAY;
  const expiringSoon =
    d.endAt.getTime() - now.getTime() <= 3 * MS_DAY &&
    d.endAt.getTime() >= now.getTime();

  /**
   * Disponibilidad:
   * - userLimitUsed: yo ya llegué al límite por usuario (limitPerUser)
   * - soldOut: ya se alcanzó el límite total (limitTotal)
   *
   * Con eso armo un badge de estado (texto + clases).
   */
  const limitPerUser = d.limitPerUser ?? null;
  const userLimitUsed = limitPerUser != null && mine >= limitPerUser;
  const soldOut =
    d.limitTotal && (d.usedTotal ?? 0) >= (d.limitTotal ?? 0);

  const avail = soldOut
    ? {
        text: "agotado",
        cls: "bg-rose-100 text-rose-700 border border-rose-200",
      }
    : userLimitUsed
    ? {
        text: "límite usado",
        cls: "bg-amber-100 text-amber-700 border border-amber-200",
      }
    : {
        text: "disponible",
        cls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      };

  // Métricas para la barra de disponibilidad global.
  const totalRestante =
    d.limitTotal != null ? Math.max(0, d.limitTotal - d.usedTotal) : null;

  const usagePercentage =
    d.limitTotal && d.limitTotal > 0
      ? Math.min(100, Math.round((d.usedTotal / d.limitTotal) * 100))
      : null;

  /**
   * Imagen principal:
   * - primero intento imagen del descuento (d.images)
   * - si no hay, uso imagen del negocio
   */
  const fromDiscount = Array.isArray(d.images) ? d.images[0] : d.images;
  const src = fromDiscount || d.business?.imageUrl || "";
  const isExternal = /^https?:\/\//i.test(src);

  // Categoría principal (badge)
  const mainCategory = d.categories[0]?.category?.name ?? "Descuento";

  /**
   * Tiers disponibles para este descuento.
   * Esto viene de los flags tierBasic/tierNormal/tierPremium.
   */
  const tiersDisponibles: Tier[] = [];
  if (d.tierBasic) tiersDisponibles.push("BASIC");
  if (d.tierNormal) tiersDisponibles.push("NORMAL");
  if (d.tierPremium) tiersDisponibles.push("PREMIUM");

  /**
   * Google Maps:
   * Solo muestro link si parece URL http/https válida.
   */
  const googleMapsUrl =
    d.business?.googleMapsUrl && /^https?:\/\//i.test(d.business.googleMapsUrl)
      ? d.business.googleMapsUrl
      : null;

  /**
   * Estilos del chip de tier.
   * Si el tier del chip coincide con mi tier, lo resalto con un ring.
   */
  const tierChipClasses = (tier: Tier) => {
    const base =
      "px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 border shadow-sm";
    const colors: Record<Tier, string> = {
      BASIC: "bg-amber-50 text-amber-800 border-amber-200",
      NORMAL: "bg-slate-50 text-slate-800 border-slate-200",
      PREMIUM: "bg-yellow-50 text-yellow-900 border-yellow-300",
    };
    const highlight = userTier === tier ? " ring-1 ring-[var(--brand)]/60" : "";
    return `${base} ${colors[tier]}${highlight}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Hero con imagen del descuento o del negocio */}
      <div className="relative w-full h-64 bg-slate-200">
        {src ? (
          // Uso <img> para evitar restricciones si es URL externa.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={d.business?.name ?? "Negocio"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-content-center text-slate-400">
            Sin imagen
          </div>
        )}

        {/* Overlay para que el texto se lea sobre la imagen */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Cerrar: vuelvo a /app */}
        <a
          href="/app"
          className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </a>

        {/* Estado del descuento */}
        <span
          className={`absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-medium shadow-md ${avail.cls}`}
        >
          {avail.text}
        </span>

        {/* Bloque con categoría, título y negocio */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="inline-flex max-w-full flex-col rounded-2xl bg-white/90 px-4 py-3 shadow-xl">
            <span className="mb-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              {mainCategory}
            </span>
            <p className="text-sm font-semibold text-slate-800 line-clamp-2">
              {d.title}
            </p>
            <p className="text-xs text-slate-600">
              {d.business?.name ?? "Negocio asociado"}
            </p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="container-app -mt-4 space-y-6">
        {/* Descripción */}
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-[var(--brand)]" />
            Descripción
          </h2>
          {d.description ? (
            <p className="text-sm text-slate-700">{d.description}</p>
          ) : (
            <p className="text-sm text-slate-500">
              Este beneficio no tiene una descripción detallada.
            </p>
          )}
        </section>

        {/* Vigencia + límite por usuario */}
        <section className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl border border-slate-100 bg-gradient-to-br from-sky-50 to-sky-100 p-4 shadow-sm">
            <Calendar className="mb-2 h-5 w-5 text-sky-600" />
            <p className="text-xs font-medium text-sky-700">Válido hasta</p>
            <p className="text-sm font-semibold text-sky-900">
              {formatFechaLarga(d.endAt)}
            </p>
          </div>

          <div className="flex flex-col rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 shadow-sm">
            <Tag className="mb-2 h-5 w-5 text-violet-600" />
            <p className="text-xs font-medium text-violet-700">Límite de canjes</p>
            <p className="text-sm font-semibold text-violet-900">
              {d.limitPerUser != null ? `${d.limitPerUser} por usuario` : "Sin límite por usuario"}
            </p>

            {limitPerUser != null && (
              <p className="mt-1 text-[11px] text-violet-700/80">
                {mine > 0 ? `Ya usé ${mine} / ${limitPerUser}` : "Aún no usé este beneficio."}
              </p>
            )}
          </div>
        </section>

        {/* Ubicación */}
        <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50 p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-xl bg-emerald-500 p-2">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">Ubicación del negocio</p>
              <p className="text-xs text-emerald-800 mt-1">
                {d.business?.address || "Dirección no registrada."}
              </p>
            </div>
          </div>

          {googleMapsUrl ? (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white shadow-md transition-transform active:scale-95"
            >
              <MapPin className="h-4 w-4" />
              Abrir en Google Maps
            </a>
          ) : (
            <p className="rounded-xl bg-white/60 px-3 py-2 text-xs text-emerald-800">
              Próximamente agrego la ubicación en Google Maps para este negocio.
            </p>
          )}
        </section>

        {/* Cómo canjear */}
        <section className="rounded-3xl border-l-4 border-amber-500 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500">
              <Award className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-amber-900">
                ¿Cómo canjear?
              </p>
              <p className="text-xs text-amber-900">
                Presento mi tarjeta PACHACARD física con QR. El comercio escanea el código
                para validar y aplicar el descuento. No hay canje desde el portal web.
              </p>
            </div>
          </div>
        </section>

        {/* Tiers disponibles */}
        {tiersDisponibles.length > 0 && (
          <section className="space-y-2 rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Disponible para:</p>
            <div className="flex flex-wrap gap-2">
              {tiersDisponibles.map((t) => (
                <span key={t} className={tierChipClasses(t)}>
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Barra de disponibilidad total */}
        {usagePercentage != null && d.limitTotal != null && (
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-slate-500">Disponibilidad total</span>
              <span className="text-xs text-slate-700">
                {totalRestante} restantes de {d.limitTotal}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  usagePercentage > 80
                    ? "bg-rose-500"
                    : usagePercentage > 50
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {usagePercentage}% del límite total utilizado.
            </p>
          </section>
        )}

        {/* Volver */}
        <div className="pt-2">
          <a
            href="/app"
            className="flex w-full items-center justify-center rounded-xl bg-slate-900 py-3 text-sm font-medium text-white shadow-md transition-transform active:scale-95"
          >
            Volver a mis descuentos
          </a>
        </div>
      </div>
    </div>
  );
}
