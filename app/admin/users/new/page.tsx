"use client";

import { useState } from "react";

export default function NewUserPage() {
  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    legacyContributorCode: "",
    tier: "BASIC",
    role: "USER",
    status: "ACTIVE",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!f.name || !f.email || !f.password) {
      alert("Nombre, email y contraseña son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(f),
      });
      if (r.ok) location.href = "/admin/users";
      else alert("Error al crear usuario");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-app py-6 max-w-xl">
      <div className="card">
        <div className="card-body space-y-3">
          <h1 className="card-title">Nuevo usuario</h1>

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
              onChange={(e) => setF({ ...f, email: e.target.value.trim().toLowerCase() })}
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
            <p className="help">Opcional. Solo para usuarios del sistema anterior.</p>
          </div>

          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              className="input"
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
            />
            <p className="help">Se almacenará hasheada.</p>
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

          <div className="pt-2">
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Crear"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}