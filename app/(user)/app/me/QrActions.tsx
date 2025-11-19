//app\(user)\app\me\QrActions.tsx
"use client";

import { useState } from "react";

export default function QrActions({
  redeemUrl,
  qrSrc,
}: {
  redeemUrl: string;
  qrSrc: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(redeemUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op
    }
  }

  async function download() {
    try {
      if (qrSrc.startsWith("data:image")) {
        // data URL directo
        const a = document.createElement("a");
        a.href = qrSrc;
        a.download = "mi-qr.png";
        a.click();
        return;
      }
      // URL normal -> blob
      const res = await fetch(qrSrc);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mi-qr.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // no-op
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
