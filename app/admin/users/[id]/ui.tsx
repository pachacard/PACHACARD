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
      if (r.ok) alert("Cambios guardados.");
      else alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (!password) return alert("Escribe la nueva contrasena.");
    const r = await fetch(`/api/admin/users/${item.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (r.ok) {
      alert("Contrasena actualizada.");
      setPassword("");
    } else {
      alert("Error al actualizar la contrasena");
    }
  }

  async function rotateQR() {
    if (!confirm("¿Rotar e invalidar los QR anteriores?")) return;
    const r = await fetch(`/api/admin/users/${item.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rotateToken: true }),
    });
    if (r.ok) alert("Token renovado.");
    else alert("Error al rotar el token");
  }

  async function remove() {
    if (!confirm("¿Eliminar usuario? Esta accion es permanente.")) return;
    const r = await fetch(`/api/admin/users/${item.id}`, { method: "DELETE" });
    if (r.ok) location.href = "/admin/users";
    else alert("No se pudo eliminar");
  }

  return (
    <div className="admin-panel">
      <div className="space-y-5">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--brand)]/70">
            Usuarios
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Editar usuario
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Actualiza datos del perfil, permisos y seguridad de la cuenta.
          </p>
        </div>

        <div>
          <label className="label">Nombre completo</label>
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>

        <div>
          <label className="label">Correo</label>
          <input type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value.toLowerCase() })} />
        </div>

        <div>
          <label className="label">Codigo del sistema anterior</label>
          <input
            className="input"
            value={f.legacyContributorCode}
            onChange={(e) => setF({ ...f, legacyContributorCode: e.target.value.trim() })}
            placeholder="Ej. 210763"
          />
          <p className="help">Opcional. Solo para usuarios provenientes del sistema anterior.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Nivel</label>
            <select className="select" value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })}>
              <option value="BASIC">Basico</option>
              <option value="NORMAL">Normal</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="USER">Usuario</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="select" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <button className="btn btn-danger" onClick={remove}>Eliminar usuario</button>
          <a href="/admin/users" className="btn btn-outline">Volver</a>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="grid gap-4 md:grid-cols-3 md:items-end">
            <div className="md:col-span-2">
              <label className="label">Nueva contrasena</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-outline" onClick={changePassword}>Cambiar contrasena</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <button className="btn btn-outline" onClick={rotateQR}>Rotar token y QR</button>
          <p className="help">
            Esto incrementa <code>tokenVersion</code> para invalidar codigos anteriores.
          </p>
        </div>
      </div>
    </div>
  );
}
