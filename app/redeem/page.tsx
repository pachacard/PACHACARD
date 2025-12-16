// app/redeem/page.tsx
"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

type InspectResp = {
  ok: boolean;
  message: string;
  user?: { id: string; name: string; email: string; tier: string };
};

type DiscountOption = {
  code: string;
  label: string;
  description?: string | null;
  limitPerUser?: number | null;
  remaining?: number | null;
  percentage?: number | null;
  category?: string | null;
};

function getTierTheme(tier?: string) {
  const t = (tier ?? "").toUpperCase();

  // BASIC: amarillo mostaza (un poco oscuro)
  if (t === "BASIC") {
    return {
      headerBg: "bg-gradient-to-r from-[#eab308] to-[#a16207]", // mostaza
      membershipChip: "bg-white/10 text-white", // chip claro normal
    };
  }

  // NORMAL: rojo institucional
  if (t === "NORMAL") {
    return {
      headerBg: "bg-gradient-to-r from-[#9a1e1e] to-[#7e1515]",
      membershipChip: "bg-white/10 text-white",
    };
  }

  // PREMIUM (por defecto): negro/dark + chip dorado
  return {
    headerBg: "bg-gradient-to-r from-[#111827] to-[#020617]", // slate-900 → casi negro
    membershipChip:
      "bg-amber-400/95 text-amber-950 shadow-sm", // dorado, exclusivo
  };
}

export default function Redeem() {
  const [t, setT] = useState<string | null>(null);
  const [inspect, setInspect] = useState<InspectResp | null>(null);

  const [businessCode, setB] = useState("");
  const [discountCode, setD] = useState("");
  const [discounts, setDiscounts] = useState<DiscountOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [m, setM] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Para evitar doble canje accidental del mismo código
  const [lastRedeem, setLastRedeem] = useState<{
    businessCode: string;
    discountCode: string;
  } | null>(null);

  useEffect(() => {
    const token = new URL(location.href).searchParams.get("token");
    setT(token);

    // Verifica a quién pertenece el token
    (async () => {
      if (!token) {
        setInspect({
          ok: false,
          message: "Abra esta pantalla desde el QR de la tarjeta.",
        });
        return;
      }
      try {
        const r = await fetch(`/api/redeem?token=${encodeURIComponent(token)}`, {
          method: "GET",
        });
        const j: InspectResp = await r.json();
        setInspect(j);
      } catch {
        setInspect({
          ok: false,
          message: "No se pudo verificar el token.",
        });
      }
    })();
  }, []);

  const tokenOk = !!inspect?.ok;
  const tierTheme = getTierTheme(inspect?.user?.tier);

  // Carga automática de descuentos cuando cambia el código de negocio
  useEffect(() => {
    if (!t || !tokenOk) return;

    const codeTrim = businessCode.trim().toUpperCase();

    if (!codeTrim) {
      setDiscounts([]);
      setD("");
      setM(null);
      setOk(null);
      return;
    }

    const handle = setTimeout(() => {
      void loadOptions(t, codeTrim);
    }, 500); // medio segundo de espera después de dejar de tipear

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessCode, t, tokenOk]);

  async function loadOptions(token: string, code: string) {
    setLoadingOptions(true);
    setM(null);
    setOk(null);
    setDiscounts([]);
    setD("");

    try {
      const url = `/api/redeem/options?token=${encodeURIComponent(
        token
      )}&businessCode=${encodeURIComponent(code)}`;

      const r = await fetch(url);
      const j = await r.json();

      if (!j.ok) {
        setM(j.message || "No se pudieron cargar los descuentos.");
        setOk(false);
        return;
      }

      setDiscounts(j.discounts || []);
      if (!j.discounts || j.discounts.length === 0) {
        setM("No hay descuentos disponibles para este negocio.");
        setOk(false);
      }
    } catch {
      setM("Error al cargar los descuentos.");
      setOk(false);
    } finally {
      setLoadingOptions(false);
    }
  }

  async function go() {
    if (!t) return;

    const codeTrim = businessCode.trim().toUpperCase();

    if (!codeTrim) {
      setM("Ingresa el código de negocio.");
      setOk(false);
      return;
    }
    if (!discountCode) {
      setM("Selecciona un descuento para canjear.");
      setOk(false);
      return;
    }

    // Confirmación si ya se canjeó un momento antes el mismo descuento
    if (
      lastRedeem &&
      lastRedeem.businessCode === codeTrim &&
      lastRedeem.discountCode === discountCode
    ) {
      const again = window.confirm(
        "Ya registraste un canje para este negocio y este descuento hace un momento.\n\n¿Deseas realizar otro canje?"
      );
      if (!again) return;
    }

    setLoading(true);
    setM(null);
    try {
      const r = await fetch(`/api/redeem?token=${encodeURIComponent(t)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessCode: codeTrim, discountCode }),
      });
      const j = await r.json();
      setOk(j.ok);
      setM(j.message);

      if (j.ok) {
        setLastRedeem({ businessCode: codeTrim, discountCode });
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedDiscount = discounts.find((d) => d.code === discountCode);

  // helper para sacar % del label si no viene en el payload
  const getPercentage = (d: DiscountOption): number | null => {
    if (typeof d.percentage === "number") return d.percentage;
    const match = d.label.match(/(\d+)\s*%/);
    return match ? Number(match[1]) : null;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-10">
      <div className="mx-auto w-full max-w-4xl px-4">
        {/* HEADER DEL USUARIO (dinámico por tier) */}
        <header
          className={`rounded-2xl p-4 md:p-6 shadow-md text-white ${
            tokenOk ? tierTheme.headerBg : "bg-rose-600"
          }`}
        >
          {!inspect ? (
            <p className="text-sm opacity-90">Verificando token…</p>
          ) : tokenOk && inspect.user ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/10 text-lg font-semibold">
                  {(inspect.user.name || "?").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] opacity-80">
                    Cuenta Pachacard
                  </p>
                  <p className="text-base md:text-lg font-semibold leading-tight">
                    {inspect.user.name}
                  </p>
                  <p className="text-xs md:text-sm opacity-90">
                    {inspect.user.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 md:items-end">
                {/* Chip de nivel de membresía (dorado solo para PREMIUM) */}
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${tierTheme.membershipChip}`}
                >
                  NIVEL DE MEMBRESÍA:{" "}
                  <span className="ml-1 font-bold">
                    {inspect.user.tier}
                  </span>
                </span>

                {/* Chip de tarjeta válida */}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium shadow-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Tarjeta válida
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                Token no válido
              </span>
              <p className="text-sm opacity-95">
                {inspect?.message ?? "No se pudo verificar el token."}
              </p>
            </div>
          )}
        </header>

        {/* BLOQUE PRINCIPAL DE CANJE */}
        <main className="mt-6 space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
            <h2 className="text-base font-semibold text-slate-900 md:text-lg">
              Seleccionar descuento a aplicar
            </h2>
            <p className="mt-1 text-xs text-slate-600 md:text-sm">
              Ingrese el <strong>código del negocio</strong>. Los descuentos
              disponibles se cargarán automáticamente y podrá seleccionar cuál
              desea canjear.
            </p>

            {/* Código de negocio */}
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Código de negocio
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-brand/0 focus:border-[var(--brand,#7e1515)] focus:ring-2 focus:ring-[var(--brand,#7e1515)]/20"
                placeholder="Ej: RESTO"
                value={businessCode}
                onChange={(e) => setB(e.target.value.toUpperCase())}
                disabled={!tokenOk}
              />
              {loadingOptions && (
                <p className="mt-1 text-xs text-slate-500">
                  Buscando descuentos…
                </p>
              )}
              {!loadingOptions &&
                businessCode.trim() &&
                discounts.length === 0 &&
                m && (
                  <p className="mt-2 text-xs text-amber-700">{m}</p>
                )}
            </div>

            {/* Lista de descuentos en tarjetas */}
            {discounts.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 md:text-sm">
                  <span>
                    {discounts.length} descuento
                    {discounts.length !== 1 ? "s" : ""} disponible
                    {discounts.length !== 1 ? "s" : ""} para este negocio
                  </span>
                  {businessCode.trim() && (
                    <span className="font-mono text-[11px] uppercase">
                      Código: {businessCode.trim().toUpperCase()}
                    </span>
                  )}
                </div>

                {discounts.map((d) => {
                  const selected = discountCode === d.code;
                  const pct = getPercentage(d);

                  return (
                    <button
                      key={d.code}
                      type="button"
                      onClick={() => setD(d.code)}
                      className={`w-full rounded-2xl border p-3 text-left text-sm transition md:p-4 ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-emerald-400 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {/* Chips superiores */}
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {pct !== null && (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                                {pct}% OFF
                              </span>
                            )}
                            {d.category && (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                                {d.category}
                              </span>
                            )}
                            {selected && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-medium text-white">
                                <CheckCircle2 className="h-3 w-3" />
                                Seleccionado
                              </span>
                            )}
                          </div>

                          <p className="font-semibold text-slate-900">
                            {d.label}
                          </p>
                          {d.description && (
                            <p className="mt-1 text-xs text-slate-600">
                              {d.description}
                            </p>
                          )}

                          {d.limitPerUser != null && (
                            <p className="mt-2 text-[11px] text-slate-600">
                              Límite por usuario:{" "}
                              <span className="font-semibold">
                                {d.limitPerUser}
                              </span>
                              {typeof d.remaining === "number" && (
                                <>
                                  {" "}
                                  · Te quedan{" "}
                                  <span className="font-semibold">
                                    {d.remaining}
                                  </span>{" "}
                                  canje
                                  {d.remaining === 1 ? "" : "s"}
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mensaje de éxito/error general */}
            {m && (!discounts.length || ok !== null) && (
              <div
                className={`mt-4 rounded-lg border px-3 py-2 text-xs md:text-sm ${
                  ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {ok ? "✓ " : "✗ "}
                {m}
              </div>
            )}

            {/* Acciones inferior */}
            <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-[11px] text-slate-500 md:text-xs">
                Al confirmar el canje, se registrará el uso del descuento y se
                descontará del límite disponible del usuario.
              </p>
              <button
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 md:w-auto"
                onClick={go}
                disabled={!t || loading || !tokenOk || !discountCode}
                title={!tokenOk ? "Token no válido" : ""}
              >
                {loading ? "Registrando canje…" : "Confirmar canje"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
