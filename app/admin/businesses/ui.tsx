"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export type Biz = {
  id?: string;
  code: string;
  name: string;
  ruc?: string | null;
  address?: string | null;
  contact?: string | null;
  status: "ACTIVE" | "INACTIVE";
  imageUrl?: string | null;
  googleMapsUrl?: string | null;
};

export default function BusinessForm({ item }: { item?: Partial<Biz> | null }) {
  const router = useRouter();
  const [f, setF] = useState<Biz>({
    id: item?.id,
    code: item?.code ?? "",
    name: item?.name ?? "",
    ruc: item?.ruc ?? "",
    address: item?.address ?? "",
    contact: item?.contact ?? "",
    status: (item?.status as Biz["status"]) ?? "ACTIVE",
    imageUrl: item?.imageUrl ?? "",
    googleMapsUrl: item?.googleMapsUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function sanitizeCode(v: string) {
    return v.replace(/\s+/g, "").toUpperCase();
  }

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Solo se permiten imagenes.");
      e.currentTarget.value = "";
      return;
    }
    if (file.size > 450 * 1024) {
      alert("La imagen es muy grande. Usa un archivo mas ligero o pega una URL remota.");
      e.currentTarget.value = "";
      return;
    }
    setReadingFile(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setF((prev) => ({ ...prev, imageUrl: dataUrl }));
    } catch (err: any) {
      alert(err?.message || "No se pudo procesar la imagen");
    } finally {
      setReadingFile(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    setSaving(true);
    try {
      const isNew = !f.id;
      const url = isNew ? "/api/admin/businesses" : `/api/admin/businesses/${f.id}`;
      const method = isNew ? "POST" : "PUT";
      if (!f.code.trim() || !f.name.trim()) {
        alert("El codigo y el nombre son obligatorios.");
        setSaving(false);
        return;
      }
      const body = {
        code: sanitizeCode(f.code),
        name: f.name.trim(),
        ruc: f.ruc?.trim() || null,
        address: f.address?.trim() || null,
        contact: f.contact?.trim() || null,
        status: f.status ?? "ACTIVE",
        imageUrl: (f.imageUrl ?? "").toString().trim() || null,
        googleMapsUrl: f.googleMapsUrl?.trim() || null,
      };
      const r = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await r.json().catch(() => ({} as any));
      if (!r.ok || json?.ok === false) throw new Error(json?.message || "Error al guardar");
      router.push("/admin/businesses");
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-shell">
      <div className="container-app py-6 md:py-8">
        <div className="mx-auto max-w-4xl admin-panel">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!saving) save();
            }}
          >
            <div>
              <div className="admin-kicker">Negocios</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {f.id ? "Editar negocio" : "Nuevo negocio"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Completa los datos principales, la ubicacion y la imagen visible en el portal.
              </p>
            </div>

            <div className="form-grid">
              <div>
                <label className="label">Codigo unico</label>
                <input
                  className="input"
                  placeholder="EJ: CAFE"
                  value={f.code}
                  onChange={(e) => setF({ ...f, code: e.target.value })}
                  onBlur={(e) => setF({ ...f, code: sanitizeCode(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="label">Nombre comercial</label>
                <input
                  className="input"
                  placeholder="Cafe Central"
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-grid">
              <div>
                <label className="label">RUC</label>
                <input className="input" value={f.ruc ?? ""} onChange={(e) => setF({ ...f, ruc: e.target.value })} />
              </div>
              <div>
                <label className="label">Contacto</label>
                <input className="input" value={f.contact ?? ""} onChange={(e) => setF({ ...f, contact: e.target.value })} />
              </div>
            </div>

            <div className="form-grid">
              <div>
                <label className="label">Direccion</label>
                <input className="input" value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} />
              </div>
              <div>
                <label className="label">Enlace de Google Maps</label>
                <input
                  className="input"
                  placeholder="https://maps.app.goo.gl/..."
                  value={f.googleMapsUrl ?? ""}
                  onChange={(e) => setF({ ...f, googleMapsUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]">
              <div>
                <label className="label">Imagen del negocio</label>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <input
                    className="input w-full bg-white"
                    placeholder="Pega una URL remota o carga un archivo"
                    value={f.imageUrl ?? ""}
                    onChange={(e) => setF({ ...f, imageUrl: e.target.value })}
                  />
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} disabled={readingFile} />
                  <p className="help">Tambien puedes cargar una imagen liviana para guardarla inline.</p>
                  {readingFile && <div className="text-xs text-slate-500">Procesando imagen...</div>}
                </div>
              </div>

              <div>
                <label className="label">Previsualizacion</label>
                <div className="flex min-h-[180px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white">
                  {f.imageUrl ? (
                    <div className="space-y-3 text-center">
                      <img
                        src={f.imageUrl}
                        alt="Vista previa"
                        className="mx-auto h-24 w-24 rounded-2xl border bg-white object-cover"
                        onError={(e) => {
                          e.currentTarget.style.opacity = "0.3";
                        }}
                      />
                      <button type="button" className="btn btn-outline" onClick={() => setF({ ...f, imageUrl: "" })}>
                        Quitar imagen
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">Sin imagen cargada</div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-grid">
              <div>
                <label className="label">Estado</label>
                <select
                  className="select"
                  value={f.status}
                  onChange={(e) => setF({ ...f, status: e.target.value as Biz["status"] })}
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" className="btn btn-primary" disabled={saving || readingFile}>
                {saving ? "Guardando..." : "Guardar negocio"}
              </button>
              <Link href="/admin/businesses" className="btn btn-outline">
                Volver
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
