"use client";

import { useState } from "react";
import QRCode from "qrcode";

export default function QR({
  userId,
  userName,
}: {
  userId: string;
  userName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [png, setPng] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const r = await fetch(`/api/qr/token/${userId}`);
      const j = await r.json();

      if (!j.ok) {
        alert(j.message || "No se pudo generar el QR.");
        return;
      }

      const url = `${location.origin}/redeem?token=${encodeURIComponent(j.token)}`;
      const data = await QRCode.toDataURL(url, { margin: 1, width: 240 });

      setPng(data);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!png) return;

    const safeName = (userName || userId)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);

    const a = document.createElement("a");
    a.href = png;
    a.download = `pachacard-qr-${safeName || "usuario"}.png`;
    a.click();
  }

  return (
    <>
      <button className="btn btn-primary" onClick={load} disabled={loading}>
        {loading ? "Generando..." : "Ver QR y descargar"}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="card" onClick={(event) => event.stopPropagation()}>
            <div className="card-body text-center">
              <h3 className="card-title mb-2">QR del usuario</h3>
              {png && <img src={png} alt="QR" className="mx-auto" />}
              <p className="text-xs text-slate-500 mt-2">
                Escanealo para abrir el canje.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button className="btn btn-primary" onClick={download}>
                  Descargar QR
                </button>
                <button className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
