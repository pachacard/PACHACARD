"use client";

import { useState } from "react";
import type { User } from "@prisma/client";

export default function UserForm({ item }: { item: User }) {
  const [f, setF] = useState({
    name: item.name,
    email: item.email,
    legacyContributorCode: item.legacyContributorCode ?? "",
    tier: item.tier,
    role: item.role,
    status: item.status,
  });
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/users/${item.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f }),
      });
      if (r.ok) alert("Guardado");
      else alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (!password) return alert("Escribe la nueva contraseña");
    const r = await fetch(`/api/admin/users/${item.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (r.ok) {
      alert("Contraseña actualizada");
      setPassword("");
    } else alert("Error al actualizar contraseña");
  }

  async function rotateQR() {
    if (!confirm("Rotar/invalidar QR anterior?")) return;
    const r = await fetch(`/api/admin/users/${item.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rotateToken: true }),
    });
    if (r.ok) alert("Token/QR rotado");
    else alert("Error al rotar");
  }

  async function remove() {
    if (!confirm("¿Eliminar usuario? Esta acción es permanente.")) return;
    const r = await fetch(`/api/admin/users/${item.id}`, { method: "DELETE" });
    if (r.ok) location.href = "/admin/users";
    else alert("No se pudo eliminar");
  }

  return (
    <div className="card">
      <div className="card-body space-y-4">
        <h1 className="card-title">Editar usuario</h1>

        <div>
          <label className="label">Nombre</label>
          <input
            className="input"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value.toLowerCase() })}
          />
        </div>

        <div>
          <label className="label">Código contribuyente anterior</label>
          <input
            className="input"
            value={f.legacyContributorCode}
            onChange={(e) =>
              setF({ ...f, legacyContributorCode: e.target.value.trim() })
            }
            placeholder="Ej. 210763"
          />
          <p className="help">
            Opcional. Solo para usuarios provenientes del sistema anterior.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="label">Tier</label>
            <select
              className="select"
              value={f.tier}
              onChange={(e) => setF({ ...f, tier: e.target.value })}
            >
              <option>BASIC</option>
              <option>NORMAL</option>
              <option>PREMIUM</option>
            </select>
          </div>
          <div>
            <label className="label">Rol</label>
            <select
              className="select"
              value={f.role}
              onChange={(e) => setF({ ...f, role: e.target.value })}
            >
              <option>USER</option>
              <option>ADMIN</option>
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select
              className="select"
              value={f.status}
              onChange={(e) => setF({ ...f, status: e.target.value })}
            >
              <option>ACTIVE</option>
              <option>INACTIVE</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button className="btn btn-danger" onClick={remove}>Eliminar</button>
        </div>

        <hr className="my-2" />

        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="label">Nueva contraseña</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn btn-outline" onClick={changePassword}>
            Cambiar contraseña
          </button>
        </div>

        <div>
          <button className="btn btn-outline" onClick={rotateQR}>
            Rotar token/QR (invalidar anteriores)
          </button>
          <p className="help">
            Incrementa <code>tokenVersion</code> para que QRs antiguos queden inválidos si
            activaste la verificación en el canje.
          </p>
        </div>
      </div>
    </div>
  );
}