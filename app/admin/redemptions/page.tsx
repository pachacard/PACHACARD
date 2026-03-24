"use client";

import { Download, Filter, Ticket } from "lucide-react";
import { useEffect, useState } from "react";

type Filters = {
  from: string;
  to: string;
  businessCode: string;
  discountCode: string;
  userEmail: string;
};

export default function Redemptions() {
  const [items, setItems] = useState<any[]>([]);
  const [f, setF] = useState<Filters>({
    from: "",
    to: "",
    businessCode: "",
    discountCode: "",
    userEmail: "",
  });

  async function load() {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v) params.set(k, String(v));
    });
    const r = await fetch(`/api/admin/redemptions?${params.toString()}`);
    const j = await r.json();
    if (j.ok) setItems(j.items);
  }

  useEffect(() => {
    load();
  }, []);

  function exportCsv() {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v) params.set(k, String(v));
    });
    params.set("export", "csv");
    location.href = `/api/admin/redemptions?${params.toString()}`;
  }

  return (
    <div className="admin-shell">
      <div className="container-app space-y-6 py-6 md:py-8">
        <section className="admin-panel">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--brand)]/70">
                Modulo
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Historial de canjes
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Filtra transacciones por fecha, negocio, descuento o usuario y exporta
                los resultados cuando lo necesites.
              </p>
            </div>
          </div>
        </section>

        <section className="admin-panel">
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="label">Desde</label>
              <input
                className="input"
                type="datetime-local"
                value={f.from}
                onChange={(e) => setF({ ...f, from: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input
                className="input"
                type="datetime-local"
                value={f.to}
                onChange={(e) => setF({ ...f, to: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Codigo del negocio</label>
              <input
                className="input"
                value={f.businessCode}
                onChange={(e) =>
                  setF({ ...f, businessCode: e.target.value.toUpperCase() })
                }
              />
            </div>
            <div>
              <label className="label">Codigo del descuento</label>
              <input
                className="input"
                value={f.discountCode}
                onChange={(e) =>
                  setF({ ...f, discountCode: e.target.value.toUpperCase() })
                }
              />
            </div>
            <div>
              <label className="label">Correo del usuario</label>
              <input
                className="input"
                value={f.userEmail}
                onChange={(e) => setF({ ...f, userEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn btn-primary gap-2" onClick={load}>
              <Filter className="h-4 w-4" />
              Filtrar
            </button>
            <button className="btn btn-outline gap-2" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
        </section>

        <section className="grid gap-3">
          {items.map((r) => (
            <div key={r.id} className="admin-table-row">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-4">
                  <div className="rounded-2xl bg-[var(--brand)]/8 p-3 text-[var(--brand)]">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-slate-950">
                      {r.discount.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Codigo: {r.discount.code} | Negocio: {r.business.code}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      Usuario: {r.user.email} | Nivel: {r.user.tier}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(r.redeemedAt).toLocaleString("es-PE")}
                    </div>
                  </div>
                </div>
                <span className="admin-chip">Canje validado</span>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="admin-panel text-sm text-slate-500">No hay registros para mostrar.</div>
          )}
        </section>
      </div>
    </div>
  );
}
