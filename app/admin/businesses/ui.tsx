// app/admin/businesses/ui.tsx
"use client";

import { useRef, useState } from "react";

// Exportamos el tipo para poder usarlo en la página (y en otras partes si quieres)
export type Biz = {
  id?: string;
  code: string;
  name: string;
  ruc?: string | null;
  address?: string | null;
  contact?: string | null;
  status: "ACTIVE" | "INACTIVE";
  imageUrl?: string | null;      // URL remota o data URL
  googleMapsUrl?: string | null; // 👈 NUEVO: URL a Google Maps
};

export default function BusinessForm({ item }: { item?: Partial<Biz> | null }) {
  const [f, setF] = useState<Biz>({
    id: item?.id,
    code: item?.code ?? "",
    name: item?.name ?? "",
    ruc: item?.ruc ?? "",
    address: item?.address ?? "",
    contact: item?.contact ?? "",
    status: (item?.status as any) ?? "ACTIVE",
    imageUrl: item?.imageUrl ?? "",
    googleMapsUrl: item?.googleMapsUrl ?? "", // 👈 inicializamos
  });

  const [saving, setSaving] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function sanitizeCode(v: string) {
    // Solo mayúsculas, sin espacios
    return v.replace(/\s+/g, "").toUpperCase();
  }

  /** Lee un archivo local y lo convierte a data URL (base64). */
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
      alert("Solo se permiten imágenes.");
      e.currentTarget.value = "";
      return;
    }

    // Límite de tamaño razonable para no inflar la BD
    const MAX_BYTES = 450 * 1024; // ~450KB
    if (file.size > MAX_BYTES) {
      alert(
        "La imagen es muy grande. Usa una de menor tamaño (~450KB máx.) o sube la imagen a un hosting (Cloudinary/S3) y pega la URL."
      );
      e.currentTarget.value = "";
      return;
    }

    setReadingFile(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setF((p) => ({ ...p, imageUrl: dataUrl }));
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

      // Validaciones rápidas
      if (!f.code.trim() || !f.name.trim()) {
        alert("Código y Nombre son obligatorios.");
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
        // CLAVE: guardamos directamente el string (URL o data:)
        imageUrl: (f.imageUrl ?? "").toString().trim() || null,
        // NUEVO: Google Maps URL (o null si está vacío)
        googleMapsUrl: f.googleMapsUrl?.trim() || null,
      };

      const r = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await r.json().catch(() => ({} as any));
      if (!r.ok || json?.ok === false) {
        throw new Error(json?.message || "Error al guardar");
      }

      location.href = "/admin/businesses";
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="card">
        {/* ÚNICO botón guardar abajo (nada en el header) */}
        <form
          className="card-body space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving) save();
          }}
        >
          <h2 className="card-title">
            {f.id ? "Editar negocio" : "Nuevo negocio"}
          </h2>

          {/* Código + Nombre */}
          <div className="form-grid">
            <div>
              <label className="label">Código (único)</label>
              <input
                className="input"
                placeholder="EJ: CAFE"
                value={f.code}
                onChange={(e) => setF({ ...f, code: e.target.value })}
                onBlur={(e) =>
                  setF({ ...f, code: sanitizeCode(e.target.value) })
                }
                required
              />
              <p className="help">
                Usado en canje. Solo mayúsculas, sin espacios.
              </p>
            </div>
            <div>
              <label className="label">Nombre</label>
              <input
                className="input"
                placeholder="Café Central"
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
                required
              />
            </div>
          </div>

          {/* RUC + Contacto */}
          <div className="form-grid">
            <div>
              <label className="label">RUC</label>
              <input
                className="input"
                placeholder="10012345678"
                value={f.ruc ?? ""}
                onChange={(e) => setF({ ...f, ruc: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Contacto</label>
              <input
                className="input"
                placeholder="+51 999 888 777"
                value={f.contact ?? ""}
                onChange={(e) => setF({ ...f, contact: e.target.value })}
              />
            </div>
          </div>

          {/* Ubicación: Dirección + Google Maps URL */}
          <div className="form-grid">
            <div>
              <label className="label">Dirección</label>
              <input
                className="input"
                placeholder="Av. Principal 123 (opcional)"
                value={f.address ?? ""}
                onChange={(e) => setF({ ...f, address: e.target.value })}
              />
              <p className="help">
                Se muestra de referencia en el detalle del negocio.
              </p>
            </div>
            <div>
              <label className="label">Google Maps URL</label>
              <input
                className="input"
                placeholder="https://maps.app.goo.gl/..."
                value={f.googleMapsUrl ?? ""}
                onChange={(e) => setF({ ...f, googleMapsUrl: e.target.value })}
              />
              <p className="help">
                Pega aquí el enlace de Google Maps del local. Se usa para el
                botón <strong>“Ver en Google Maps”</strong> en el portal.
              </p>
            </div>
          </div>

          {/* Logo: URL + carga local a data URL */}
          <div className="form-grid">
            <div>
              <label className="label">Imagen del negocio</label>
              <div className="space-y-2">
                <input
                  className="input w-full"
                  placeholder="Pega aquí una URL (Cloudinary/S3/https...) o usa 'Cargar archivo' para convertir a data URL"
                  value={f.imageUrl ?? ""}
                  onChange={(e) => setF({ ...f, imageUrl: e.target.value })}
                />

                <div className="flex items-center gap-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={readingFile}
                  />
                  {readingFile && (
                    <span className="text-xs text-slate-500">
                      Procesando imagen…
                    </span>
                  )}
                </div>

                <p className="help">
                  En Vercel no existe /uploads de escritura. Pega una URL remota
                  o carga un archivo (se convierte a <code>data:</code> URL y se
                  guarda inline). Mantén las imágenes ligeras (&lt; 450KB).
                </p>
              </div>
            </div>

            <div>
              <label className="label">Previsualización</label>
              {f.imageUrl ? (
                <>
                  <img
                    src={f.imageUrl}
                    alt="preview"
                    className="h-20 w-20 rounded-xl object-cover border bg-white"
                    onError={(e) =>
                      (e.currentTarget.style.opacity = "0.3")
                    }
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setF({ ...f, imageUrl: "" })}
                    >
                      Quitar
                    </button>
                  </div>
                </>
              ) : (
                <div className="h-20 w-20 rounded-xl bg-slate-200 grid place-content-center text-xs text-slate-500">
                  sin img
                </div>
              )}
            </div>
          </div>

          {/* Estado */}
          <div className="form-grid">
            <div>
              <label className="label">Estado</label>
              <select
                className="select"
                value={f.status}
                onChange={(e) =>
                  setF({ ...f, status: e.target.value as Biz["status"] })
                }
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Único botón Guardar */}
          <div className="pt-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || readingFile}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
