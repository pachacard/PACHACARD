// app/(user)/app/me/QrActions.tsx
"use client";

import { useState } from "react";

/**
 * Se muestran acciones rápidas del QR:
 * - Se copia el enlace de canje al portapapeles.
 * - Se descarga la imagen del QR (data URL o URL normal).
 */
export default function QrActions({
  redeemUrl,
  qrSrc,
}: {
  redeemUrl: string;
  qrSrc: string;
}) {
  const [copied, setCopied] = useState(false);

  // Se copia el enlace usando Clipboard API
  async function copy() {
    try {
      await navigator.clipboard.writeText(redeemUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Se ignora si el navegador bloquea el clipboard
    }
  }

  // Se descarga la imagen del QR
  async function download() {
    try {
      // Si ya es data URL, se descarga directo
      if (qrSrc.startsWith("data:image")) {
        const a = document.createElement("a");
        a.href = qrSrc;
        a.download = "mi-qr.png";
        a.click();
        return;
      }

      // Si es URL normal, se convierte a blob para descargar
      const res = await fetch(qrSrc);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "mi-qr.png";
      a.click();

      URL.revokeObjectURL(url);
    } catch {
      // Se ignora si falla la descarga
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={copy} className="btn btn-secondary">
        {copied ? "¡Copiado!" : "Copiar enlace"}
      </button>
      <button type="button" onClick={download} className="btn btn-outline">
        Descargar QR
      </button>
    </div>
  );
}
