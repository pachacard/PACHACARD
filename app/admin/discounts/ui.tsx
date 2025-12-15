// app/admin/discounts/ui.tsx
"use client";

import { useMemo, useState } from "react";
import type { Discount, Business } from "@prisma/client";

/** Props del formulario de descuentos en Admin */
type Props = {
  /** item puede venir con relaciones (solo necesitamos categoryIds) */
  item?: (Discount & {
    categories?: { categoryId: string }[];
  }) | null;

  businesses: Pick<Business, "id" | "name" | "code">[];

  /** catálogo de categorías para checkboxes */
  categories: { id: string; name: string; icon: string | null }[];
};

// Selector (único) de tier para mapear a flags boolean
type Tier = "BASIC" | "NORMAL" | "PREMIUM";

export default function DiscountForm({ item, businesses, categories }: Props) {
  const isEdit = !!item?.id;

  // Deduces el tier inicial desde los 3 flags del item
  const initialTier: Tier = item?.tierBasic
    ? "BASIC"
    : item?.tierNormal
    ? "NORMAL"
    : item?.tierPremium
    ? "PREMIUM"
    : "BASIC";

  // Estado del tier (selector único → luego lo mapeamos a 3 boolean)
  const [tier, setTier] = useState<Tier>(initialTier);

  // Estado de los campos básicos
  const [f, setF] = useState({
    code: item?.code ?? "",
    status: item?.status ?? "DRAFT", // DRAFT | PUBLISHED | ARCHIVED
    title: item?.title ?? "",
    description: item?.description ?? "",
    startAt: (item?.startAt ? new Date(item.startAt) : new Date())
      .toISOString()
      .slice(0, 16),
    endAt: (item?.endAt
      ? new Date(item.endAt)
      : new Date(Date.now() + 24 * 60 * 60 * 1000))
      .toISOString()
      .slice(0, 16),
    limitPerUser: item?.limitPerUser ?? "",
    limitTotal: item?.limitTotal ?? "",
    businessId: (item as any)?.businessId ?? "",
    // Imagen del descuento (usamos Discount.images como string URL)
    imageUrl:
      (typeof (item as any)?.images === "string" ? (item as any).images : "") ??
      "",
  });

  // Estado de categorías seleccionadas (ids)
  const initialSelectedCats = useMemo(
    () => item?.categories?.map((x) => x.categoryId) ?? [],
    [item?.categories]
  );

  const [selectedCats, setSelectedCats] = useState<string[]>(
    initialSelectedCats
  );

  function toggleCat(id: string) {
    setSelectedCats((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function clearCats() {
    setSelectedCats([]);
  }

  function selectAllCats() {
    setSelectedCats(categories.map((c) => c.id));
  }

  async function save() {
    const body = {
      ...f,
      limitPerUser: f.limitPerUser === "" ? null : Number(f.limitPerUser),
      limitTotal: f.limitTotal === "" ? null : Number(f.limitTotal),
      tierBasic: tier === "BASIC",
      tierNormal: tier === "NORMAL",
      tierPremium: tier === "PREMIUM",
      // categorías elegidas (ids)
      categoryIds: selectedCats,
      // guardamos 1 URL en Discount.images
      images: f.imageUrl?.trim() || null,
    };

    const url = isEdit
      ? `/api/admin/discounts/${item!.id}`
      : `/api/admin/discounts`;
    const method = isEdit ? "PUT" : "POST";

    const r = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (r.ok) {
      if (isEdit) {
        alert("Guardado");
      } else {
        location.href = "/admin/discounts";
      }
    } else {
      const text = await r.text().catch(() => "");
      alert(`Error al guardar: ${r.status} ${text}`);
    }
  }

  async function removeItem() {
    if (!isEdit) return;
    if (!confirm("¿Eliminar descuento?")) return;
    const r = await fetch(`/api/admin/discounts/${item!.id}`, {
      method: "DELETE",
    });
    if (r.ok) location.href = "/admin/discounts";
  }

  // ✅ NUEVO: ir a "Nuevo descuento" precargando los datos de este
  async function duplicateAsNew() {
    if (!isEdit || !item?.id) return;
    location.href = `/admin/discounts/new?from=${item.id}`;
  }

  return (
    <div className="max-w-4xl">
      <div className="card">
        <div className="card-body space-y-6">
          <h2 className="card-title">
            {isEdit ? "Editar descuento" : "Nuevo descuento"}
          </h2>

          {/* Datos principales */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">Código (legible)</label>
              <input
                className="input"
                value={f.code}
                onChange={(e) =>
                  setF({ ...f, code: e.target.value.toUpperCase() })
                }
              />
            </div>
            <div>
              <label className="label">Estado</label>
              <select
                className="select"
                value={f.status}
                onChange={(e) => setF({ ...f, status: e.target.value })}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Título</label>
            <input
              className="input"
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input"
              value={f.description ?? ""}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>

          {/* Imagen del descuento (URL) */}
          <div>
            <label className="label">Imagen del descuento (URL)</label>
            <div className="flex items-center gap-3">
              <input
                className="input flex-1"
                placeholder="https://... o /uploads/archivo.jpg"
                value={f.imageUrl}
                onChange={(e) => setF({ ...f, imageUrl: e.target.value })}
              />
              {f.imageUrl ? (
                <img
                  src={f.imageUrl}
                  alt="preview"
                  className="h-10 w-10 rounded-md object-cover border"
                />
              ) : (
                <div className="h-10 w-10 rounded-md bg-slate-200 grid place-content-center text-[10px] text-slate-500">
                  sin img
                </div>
              )}
            </div>
            <p className="help text-xs text-slate-500 mt-1">
              Si no colocas una imagen, en la tarjeta se usará el logo del
              negocio (si existe).
            </p>
          </div>

          {/* Tier único */}
          <div>
            <label className="label">Tier</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="tier"
                  checked={tier === "BASIC"}
                  onChange={() => setTier("BASIC")}
                />
                Básico
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="tier"
                  checked={tier === "NORMAL"}
                  onChange={() => setTier("NORMAL")}
                />
                Normal
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="tier"
                  checked={tier === "PREMIUM"}
                  onChange={() => setTier("PREMIUM")}
                />
                Premium
              </label>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">Inicio</label>
              <input
                className="input"
                type="datetime-local"
                value={f.startAt}
                onChange={(e) => setF({ ...f, startAt: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Fin</label>
              <input
                className="input"
                type="datetime-local"
                value={f.endAt}
                onChange={(e) => setF({ ...f, endAt: e.target.value })}
              />
            </div>
          </div>

          {/* Límites */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">Límite por usuario</label>
              <input
                className="input"
                type="number"
                value={f.limitPerUser ?? ""}
                onChange={(e) => setF({ ...f, limitPerUser: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Límite total</label>
              <input
                className="input"
                type="number"
                value={f.limitTotal ?? ""}
                onChange={(e) => setF({ ...f, limitTotal: e.target.value })}
              />
            </div>
          </div>

          {/* 1 → N: un descuento pertenece a 1 negocio (opcional) */}
          <div>
            <label className="label">Negocio</label>
            <select
              className="select"
              value={f.businessId}
              onChange={(e) => setF({ ...f, businessId: e.target.value })}
            >
              <option value="">— sin negocio asignado —</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Categorías (N:M) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label !mb-0">Categorías</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={selectAllCats}
                >
                  Seleccionar todo
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={clearCats}
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categories.map((c) => {
                const checked = selectedCats.includes(c.id);
                return (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCat(c.id)}
                    />
                    {c.icon ? (
                      <img
                        src={c.icon}
                        alt=""
                        className="h-5 w-5 object-contain rounded"
                      />
                    ) : null}
                    <span>{c.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
            >
              {isEdit ? "Guardar" : "Crear"}
            </button>

            {isEdit && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={duplicateAsNew}
                >
                  Duplicar
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={removeItem}
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
