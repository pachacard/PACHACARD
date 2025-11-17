// app/redeem/page.tsx
"use client";

import { useEffect, useState } from "react";

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
};

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

  return (
    <div className="max-w-xl mx-auto">
      <div className="card">
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="card-title">Canje de descuento</h1>
          </div>

          {/* Banda con dueño del QR */}
          <div className="rounded-lg border bg-white/50 p-3">
            {tokenOk && inspect?.user ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium shadow-sm bg-emerald-100 text-emerald-700 border border-emerald-200">
                  token verificado
                </span>
                <div>
                  <div className="font-medium">
                    {inspect.user.name}{" "}
                    <span className="text-slate-500">
                      ({inspect.user.email})
                    </span>
                  </div>
                  <div className="text-slate-600 text-xs">
                    Cuenta:{" "}
                    <span className="uppercase">{inspect.user.tier}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium shadow-sm bg-rose-100 text-rose-700 border border-rose-200">
                  token no válido
                </span>
                <span className="ml-2 text-slate-600">
                  {inspect?.message ?? "No se pudo verificar el token."}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-slate-600">
            Ingrese el <strong>código del negocio</strong>. Los descuentos
            disponibles se cargarán automáticamente y podrá seleccionar cuál
            desea canjear.
          </p>

          <div className="grid gap-3">
            <div>
              <label className="label">Código de negocio</label>
              <input
                className="input"
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
            </div>

            {discounts.length > 0 && (
              <div>
                <label className="label">Descuento a canjear</label>
                <select
                  className="input"
                  value={discountCode}
                  onChange={(e) => setD(e.target.value)}
                >
                  <option value="">Selecciona un descuento</option>
                  {discounts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.label}
                    </option>
                  ))}
                </select>

                {selectedDiscount && (
                  <>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedDiscount.description}
                    </p>
                    {selectedDiscount.limitPerUser != null && (
                      <p className="mt-1 text-xs text-slate-500">
                        Te quedan{" "}
                        <span className="font-semibold">
                          {selectedDiscount.remaining ?? 0}
                        </span>{" "}
                        canjes de este descuento (límite por usuario:{" "}
                        {selectedDiscount.limitPerUser}).
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={go}
            disabled={!t || loading || !tokenOk || !discountCode}
            title={!tokenOk ? "Token no válido" : ""}
          >
            {loading ? "Validando…" : "Validar y Canjear"}
          </button>

          {m && (
            <div
              className={`text-sm ${
                ok ? "text-green-700" : "text-red-700"
              }`}
            >
              {ok ? "✓ " : "✗ "}
              {m}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
