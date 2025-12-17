"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type RedeemPostResp = {
  ok: boolean;
  message: string;
  redemptionId?: string;
  remainingAfter?: number | null; 
};

function getTierTheme(tier?: string) {
  const t = (tier ?? "").toUpperCase();

  if (t === "BASIC") {
    return {
      headerBg: "bg-gradient-to-r from-[#eab308] to-[#a16207]",
      membershipChip: "bg-white/10 text-white",
    };
  }

  if (t === "NORMAL") {
    return {
      headerBg: "bg-gradient-to-r from-[#9a1e1e] to-[#7e1515]",
      membershipChip: "bg-white/10 text-white",
    };
  }

  return {
    headerBg: "bg-gradient-to-r from-[#111827] to-[#020617]",
    membershipChip: "bg-amber-400/95 text-amber-950 shadow-sm",
  };
}

function normCode(v: string) {
  return (v ?? "").trim().toUpperCase();
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

  /**
   * Para que la confirmación salga SOLO a partir del 2do canje en esta pantalla.
   */
  const [hasRedeemedOnce, setHasRedeemedOnce] = useState(false);

  /**
   * Modal de confirmación (en vez de window.confirm)
   */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRedeem, setPendingRedeem] = useState<{
    businessCode: string;
    discountCode: string;
  } | null>(null);

  /**
   * ANTI "NEGOCIO INVÁLIDO" FANTASMA:
   * - AbortController cancela requests viejos
   * - seq hace que solo el último request pueda cambiar estado
   */
  const optionsAbortRef = useRef<AbortController | null>(null);
  const optionsSeqRef = useRef(0);

  useEffect(() => {
    const token = new URL(location.href).searchParams.get("token");
    setT(token);

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
          cache: "no-store",
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

  // helper para sacar % del label si no viene en el payload
  const getPercentage = (d: DiscountOption): number | null => {
    if (typeof d.percentage === "number") return d.percentage;
    const match = d.label.match(/(\d+)\s*%/);
    return match ? Number(match[1]) : null;
  };

  const selectedDiscount = useMemo(
    () => discounts.find((d) => d.code === discountCode),
    [discounts, discountCode]
  );

  /**
   * Carga automática cuando cambia el código de negocio
   */
  useEffect(() => {
    if (!t || !tokenOk) return;

    const codeTrim = normCode(businessCode);

    // Si se borró el input: limpiamos todo y cancelamos requests viejos
    if (!codeTrim) {
      optionsSeqRef.current += 1;
      optionsAbortRef.current?.abort();
      optionsAbortRef.current = null;

      setDiscounts([]);
      setD("");
      setM(null);
      setOk(null);
      return;
    }

    const handle = setTimeout(() => {
      // ✅ IMPORTANTE: mientras tipeas NO conserves mensajes viejos
      void loadOptions(t, codeTrim, { keepSelected: false, keepMessage: false });
    }, 450);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessCode, t, tokenOk]);

  /**
   * loadOptions (mejorado):
   * - Permite "refrescar" descuentos sin resetear selección ni borrar mensajes.
   * - Evita race conditions (abort + seq)
   */
  async function loadOptions(
    token: string,
    code: string,
    opts?: { keepSelected?: boolean; keepMessage?: boolean }
  ) {
    const keepSelected = !!opts?.keepSelected;
    const keepMessage = !!opts?.keepMessage;

    const prevSelected = keepSelected ? discountCode : "";

    // seq: solo el último request manda
    const seq = ++optionsSeqRef.current;

    // cancelar request anterior
    if (optionsAbortRef.current) {
      optionsAbortRef.current.abort();
    }
    const controller = new AbortController();
    optionsAbortRef.current = controller;

    setLoadingOptions(true);

    // Si NO queremos mantener mensajes (caso tipeo), limpiamos
    if (!keepMessage) {
      setM(null);
      setOk(null);
    }

    try {
      const url = `/api/redeem/options?token=${encodeURIComponent(
        token
      )}&businessCode=${encodeURIComponent(code)}`;

      const r = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });

      const j = await r.json();

      // si ya hay request más nuevo, ignora este
      if (seq !== optionsSeqRef.current) return;

      if (!j.ok) {
        setM(j.message || "No se pudieron cargar los descuentos.");
        setOk(false);
        setDiscounts([]);
        if (!keepSelected) setD("");
        return;
      }

      const incoming: DiscountOption[] = j.discounts || [];
      setDiscounts(incoming);

      // Mantener selección si todavía existe
      if (keepSelected && prevSelected) {
        const stillThere = incoming.some((d) => d.code === prevSelected);
        setD(stillThere ? prevSelected : "");
      } else {
        setD("");
      }

      // ✅ Si llegaron descuentos, NO debe quedarse un error viejo tipo “Negocio inválido”
      // (pero si keepMessage=true y ok=true por un canje exitoso, lo conservamos)
      if (incoming.length > 0) {
        if (!keepMessage || ok === false) {
          setM(null);
          setOk(null);
        }
      } else {
        setM("No hay descuentos disponibles para este negocio.");
        setOk(false);
      }
    } catch (err: any) {
      // abort = normal cuando tipeas rápido, no mostramos error
      if (controller.signal.aborted) return;

      if (seq !== optionsSeqRef.current) return;

      setM("Error al cargar los descuentos.");
      setOk(false);
      setDiscounts([]);
      if (!keepSelected) setD("");
    } finally {
      if (seq === optionsSeqRef.current) {
        setLoadingOptions(false);
      }
    }
  }

  /**
   * POST real del canje + "F5 sin refrescar"
   */
  async function performRedeem(codeTrim: string, discCode: string) {
    if (!t) return;

    setLoading(true);
    setM(null);

    try {
      const r = await fetch(`/api/redeem?token=${encodeURIComponent(t)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessCode: codeTrim, discountCode: discCode }),
        cache: "no-store",
      });

      const j: RedeemPostResp = await r.json();
      setOk(j.ok);
      setM(j.message);

      if (j.ok) {
        setHasRedeemedOnce(true);

        // Si el backend devuelve remainingAfter, actualizamos instantáneo
        if (typeof j.remainingAfter !== "undefined") {
          setDiscounts((prev) =>
            prev.map((d) =>
              d.code === discCode ? { ...d, remaining: j.remainingAfter ?? null } : d
            )
          );
        }

        // Soft refresh: refresca opciones SIN recargar página
        // Mantiene selección y mantiene el mensaje de éxito.
        await loadOptions(t, codeTrim, { keepSelected: true, keepMessage: true });
      }
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handler del botón
   * - 1er canje: directo
   * - 2do+ canje: modal bonito
   */
  async function go() {
    if (!t) return;

    const codeTrim = normCode(businessCode);
    const discCode = normCode(discountCode);

    if (!codeTrim) {
      setM("Ingresa el código de negocio.");
      setOk(false);
      return;
    }
    if (!discCode) {
      setM("Selecciona un descuento para canjear.");
      setOk(false);
      return;
    }

    if (hasRedeemedOnce) {
      setPendingRedeem({ businessCode: codeTrim, discountCode: discCode });
      setConfirmOpen(true);
      return;
    }

    await performRedeem(codeTrim, discCode);
  }

  const modalAfterRemaining =
    typeof selectedDiscount?.remaining === "number"
      ? Math.max(selectedDiscount.remaining - 1, 0)
      : null;

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-10">
      <div className="mx-auto w-full max-w-4xl px-4">
        {/* HEADER */}
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
                  <p className="text-xs md:text-sm opacity-90">{inspect.user.email}</p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 md:items-end">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${tierTheme.membershipChip}`}
                >
                  NIVEL DE MEMBRESÍA:{" "}
                  <span className="ml-1 font-bold">{inspect.user.tier}</span>
                </span>

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

        {/* MAIN */}
        <main className="mt-6 space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
            <h2 className="text-base font-semibold text-slate-900 md:text-lg">
              Seleccionar descuento a aplicar
            </h2>
            <p className="mt-1 text-xs text-slate-600 md:text-sm">
              Ingrese el <strong>código del negocio</strong>. Los descuentos disponibles
              se cargarán automáticamente y podrá seleccionar cuál desea canjear.
            </p>

            {/* Código negocio */}
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
                <p className="mt-1 text-xs text-slate-500">Buscando descuentos…</p>
              )}

              {!loadingOptions &&
                businessCode.trim() &&
                discounts.length === 0 &&
                m && <p className="mt-2 text-xs text-amber-700">{m}</p>}
            </div>

            {/* Cards */}
            {discounts.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 md:text-sm">
                  <span>
                    {discounts.length} descuento{discounts.length !== 1 ? "s" : ""}{" "}
                    disponible{discounts.length !== 1 ? "s" : ""} para este negocio
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

                          <p className="font-semibold text-slate-900">{d.label}</p>

                          {d.description && (
                            <p className="mt-1 text-xs text-slate-600">{d.description}</p>
                          )}

                          {d.limitPerUser != null && (
                            <p className="mt-2 text-[11px] text-slate-600">
                              Límite por usuario:{" "}
                              <span className="font-semibold">{d.limitPerUser}</span>
                              {typeof d.remaining === "number" && (
                                <>
                                  {" "}
                                  · Te quedan{" "}
                                  <span className="font-semibold">{d.remaining}</span>{" "}
                                  canje{d.remaining === 1 ? "" : "s"}
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

            {/* Mensaje general */}
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

            {/* Acciones */}
            <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-[11px] text-slate-500 md:text-xs">
                Al confirmar el canje, se registrará el uso del descuento y se descontará
                del límite disponible del usuario.
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

      {/* MODAL (solo 2do canje) */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!loading) setConfirmOpen(false);
            }}
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Confirmar segundo canje
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Ya realizaste un canje en esta pantalla. Confirma para evitar canjes por
                  error.
                </p>
              </div>
              <button
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                disabled={loading}
                onClick={() => setConfirmOpen(false)}
                aria-label="Cerrar"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Cliente</span>
                <span className="font-semibold">{inspect?.user?.name ?? "-"}</span>
              </div>
              <div className="mt-2 flex justify-between gap-3">
                <span className="text-slate-500">Negocio</span>
                <span className="font-semibold">{normCode(businessCode)}</span>
              </div>
              <div className="mt-2 flex justify-between gap-3">
                <span className="text-slate-500">Descuento</span>
                <span className="font-semibold">
                  {selectedDiscount?.label ?? discountCode}
                </span>
              </div>

              {typeof selectedDiscount?.remaining === "number" && (
                <div className="mt-2 flex justify-between gap-3">
                  <span className="text-slate-500">Después del canje</span>
                  <span className="font-semibold">
                    quedará: {modalAfterRemaining} canje(s)
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={loading}
                onClick={() => setConfirmOpen(false)}
              >
                Cancelar
              </button>

              <button
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                disabled={loading || !pendingRedeem}
                onClick={async () => {
                  if (!pendingRedeem) return;
                  setConfirmOpen(false);
                  await performRedeem(pendingRedeem.businessCode, pendingRedeem.discountCode);
                  setPendingRedeem(null);
                }}
              >
                {loading ? "Registrando…" : "Sí, canjear"}
              </button>
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              Tip: si vas a canjear otra tarjeta, escanea el otro QR (abre otro link).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
