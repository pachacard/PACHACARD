"use client";
import { useState } from "react";

export default function ImageUploader({
  value,
  onChange,
  label = "Logo / foto del negocio",
}: {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) return setErr("Sube una imagen (JPG/PNG)");
    if (f.size > 2 * 1024 * 1024) return setErr("Tamaño máximo: 2MB");

    setErr(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const j = await r.json();
    setUploading(false);
    if (!j.ok) return setErr(j.message || "Error al subir");
    onChange(j.url); // <- URL /uploads/...
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-3">
        {value ? (
          <img
            src={value}
            alt="preview"
            className="h-16 w-16 rounded object-cover border"
            onError={(e) => ((e.currentTarget.src = "/placeholder-business.png"))}
          />
        ) : (
          <div className="h-16 w-16 rounded border flex items-center justify-center text-xs text-slate-400">
            Sin foto
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleFile} />
        {uploading && <span className="text-xs text-slate-500">Subiendo…</span>}
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <p className="text-xs text-slate-500">Formatos JPG/PNG. Máx 2MB.</p>
    </div>
  );
}
