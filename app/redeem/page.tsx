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

  async function loadOptions() {
    if (!t) return;
    if (!businessCode.trim()) {
      setM("Ingresa el código de negocio para buscar descuentos.");
      setOk(false);
      return;
    }

    setLoadingOptions(true);
    setM(null);
    setOk(null);
    setDiscounts([]);
    setD("");

    try {
      const url = `/api/redeem/options?token=${encodeURIComponent(
        t
      )}&businessCode=${encodeURIComponent(businessCode.trim())}`;

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
    } catch (e) {
      setM("Error al cargar los descuentos.");
      setOk(false);
    } finally {
      setLoadingOptions(false);
    }
  }

  async function go() {
    if (!t) return;
    if (!businessCode.trim()) {
      setM("Ingresa el código de negocio.");
      setOk(false);
      return;
    }
    if (!discountCode) {
      setM("Selecciona un descuento para canjear.");
      setOk(false);
      return;
    }

    setLoading(true);
    setM(null);
    try {
      const r = await fetch(`/api/redeem?token=${encodeURIComponent(t)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessCode, discountCode }),
      });
      const j = await r.json();
      setOk(j.ok);
      setM(j.message);
    } finally {
      setLoading(false);
    }
  }

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
            Ingrese el <strong>código del negocio</strong>. Luego cargue los
            descuentos disponibles y seleccione cuál desea canjear.
          </p>

          <div className="grid gap-3">
            <div>
              <label className="label">Código de negocio</label>
              <input
                className="input"
                placeholder="Ej: RESTO"
                value={businessCode}
                onChange={(e) => setB(e.target.value.toUpperCase())}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadOptions}
              disabled={!tokenOk || loadingOptions}
              title={!tokenOk ? "Token no válido" : ""}
            >
              {loadingOptions ? "Buscando descuentos…" : "Buscar descuentos"}
            </button>

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

                {discountCode && (
                  <p className="mt-1 text-xs text-slate-500">
                    {
                      discounts.find((d) => d.code === discountCode)
                        ?.description
                    }
                  </p>
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
