"use client";

import { useMemo, useState } from "react";
import type { Business, Discount } from "@prisma/client";

type Props = {
  item?: (Discount & {
    categories?: { categoryId: string }[];
  }) | null;
  businesses: Pick<Business, "id" | "name" | "code">[];
  categories: { id: string; name: string; icon: string | null }[];
};

type Tier = "BASIC" | "NORMAL" | "PREMIUM";

function translateStatus(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "Publicado";
    case "ARCHIVED":
      return "Archivado";
    default:
      return "Borrador";
  }
}

export default function DiscountForm({ item, businesses, categories }: Props) {
  const isEdit = !!item?.id;
  const initialTier: Tier = item?.tierBasic ? "BASIC" : item?.tierNormal ? "NORMAL" : item?.tierPremium ? "PREMIUM" : "BASIC";

  const [tier, setTier] = useState<Tier>(initialTier);
  const [f, setF] = useState({
    code: item?.code ?? "",
    status: item?.status ?? "DRAFT",
    title: item?.title ?? "",
    description: item?.description ?? "",
    startAt: (item?.startAt ? new Date(item.startAt) : new Date()).toISOString().slice(0, 16),
    endAt: (item?.endAt ? new Date(item.endAt) : new Date(Date.now() + 24 * 60 * 60 * 1000)).toISOString().slice(0, 16),
    limitPerUser: item?.limitPerUser ?? "",
    limitTotal: item?.limitTotal ?? "",
    businessId: (item as any)?.businessId ?? "",
    imageUrl: ((typeof (item as any)?.images === "string" ? (item as any).images : "") ?? ""),
  });

  const initialSelectedCats = useMemo(() => item?.categories?.map((x) => x.categoryId) ?? [], [item?.categories]);
  const [selectedCats, setSelectedCats] = useState<string[]>(initialSelectedCats);

  function toggleCat(id: string) {
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    const body = {
      ...f,
      limitPerUser: f.limitPerUser === "" ? null : Number(f.limitPerUser),
      limitTotal: f.limitTotal === "" ? null : Number(f.limitTotal),
      tierBasic: tier === "BASIC",
      tierNormal: tier === "NORMAL",
      tierPremium: tier === "PREMIUM",
      categoryIds: selectedCats,
      images: f.imageUrl?.trim() || null,
    };
    const url = isEdit ? `/api/admin/discounts/${item!.id}` : `/api/admin/discounts`;
    const method = isEdit ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      if (isEdit) alert("Cambios guardados.");
      else location.href = "/admin/discounts";
    } else {
      const text = await r.text().catch(() => "");
      alert(`Error al guardar: ${r.status} ${text}`);
    }
  }

  async function removeItem() {
    if (!isEdit) return;
    if (!confirm("¿Eliminar descuento?")) return;
    const r = await fetch(`/api/admin/discounts/${item!.id}`, { method: "DELETE" });
    if (r.ok) location.href = "/admin/discounts";
  }

  function duplicateAsNew() {
    if (!isEdit || !item?.id) return;
    location.href = `/admin/discounts/new?from=${item.id}`;
  }

  return (
    <div className="admin-shell">
      <div className="container-app py-6 md:py-8">
        <div className="mx-auto max-w-5xl admin-panel">
          <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--brand)]/70">Descuentos</div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {isEdit ? "Editar descuento" : "Nuevo descuento"}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Configura vigencia, negocio asociado, categorias y reglas de uso del beneficio.
                </p>
              </div>
              <span className="admin-chip">{translateStatus(f.status)}</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Codigo</label>
                <input className="input" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="label">Estado</label>
                <select className="select" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                  <option value="DRAFT">Borrador</option>
                  <option value="PUBLISHED">Publicado</option>
                  <option value="ARCHIVED">Archivado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Titulo</label>
              <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            </div>

            <div>
              <label className="label">Descripcion</label>
              <textarea className="input min-h-28" value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} />
            </div>

            <div>
              <label className="label">Imagen del descuento</label>
              <div className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
                <input
                  className="input"
                  placeholder="https://... o /uploads/archivo.jpg"
                  value={f.imageUrl}
                  onChange={(e) => setF({ ...f, imageUrl: e.target.value })}
                />
                <div className="flex min-h-16 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                  {f.imageUrl ? <img src={f.imageUrl} alt="Vista previa" className="h-12 w-12 rounded-xl border object-cover" /> : <span className="text-xs text-slate-500">Sin imagen</span>}
                </div>
              </div>
            </div>

            <div>
              <label className="label">Nivel del beneficio</label>
              <div className="flex flex-wrap gap-3">
                {(["BASIC", "NORMAL", "PREMIUM"] as Tier[]).map((option) => (
                  <label
                    key={option}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      tier === option ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <input type="radio" name="tier" className="sr-only" checked={tier === option} onChange={() => setTier(option)} />
                    {option === "BASIC" ? "Basico" : option === "NORMAL" ? "Normal" : "Premium"}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Inicio</label>
                <input className="input" type="datetime-local" value={f.startAt} onChange={(e) => setF({ ...f, startAt: e.target.value })} />
              </div>
              <div>
                <label className="label">Fin</label>
                <input className="input" type="datetime-local" value={f.endAt} onChange={(e) => setF({ ...f, endAt: e.target.value })} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Limite por usuario</label>
                <input className="input" type="number" value={f.limitPerUser ?? ""} onChange={(e) => setF({ ...f, limitPerUser: e.target.value })} />
              </div>
              <div>
                <label className="label">Limite total</label>
                <input className="input" type="number" value={f.limitTotal ?? ""} onChange={(e) => setF({ ...f, limitTotal: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label">Negocio asociado</label>
              <select className="select" value={f.businessId} onChange={(e) => setF({ ...f, businessId: e.target.value })}>
                <option value="">Sin negocio asignado</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <label className="label !mb-0">Categorias</label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedCats(categories.map((c) => c.id))}>Seleccionar todo</button>
                  <button type="button" className="btn btn-outline" onClick={() => setSelectedCats([])}>Limpiar</button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((c) => {
                  const checked = selectedCats.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-sm transition ${
                        checked ? "border-[var(--brand)]/30 bg-[var(--brand)]/5" : "border-slate-200 bg-white"
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleCat(c.id)} />
                      {c.icon ? <img src={c.icon} alt="" className="h-5 w-5 rounded object-contain" /> : null}
                      <span>{c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" className="btn btn-primary" onClick={save}>
                {isEdit ? "Guardar cambios" : "Crear descuento"}
              </button>
              {isEdit && (
                <>
                  <button type="button" className="btn btn-secondary" onClick={duplicateAsNew}>Duplicar</button>
                  <button type="button" className="btn btn-danger" onClick={removeItem}>Eliminar</button>
                </>
              )}
              <a href="/admin/discounts" className="btn btn-outline">Volver</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
