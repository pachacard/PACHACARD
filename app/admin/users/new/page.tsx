"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewUserPage() {
  const router = useRouter();
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
      alert("Nombre, correo y contrasena son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(f),
      });
      if (r.ok) router.push("/admin/users");
      else alert("Error al crear usuario");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-shell">
      <div className="container-app py-6 md:py-8">
        <div className="mx-auto max-w-3xl admin-panel">
          <div className="space-y-5">
            <div>
              <div className="admin-kicker">Usuarios</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Nuevo usuario
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Crea una cuenta nueva y define su nivel, rol y estado inicial.
              </p>
            </div>

            <div>
              <label className="label">Nombre completo</label>
              <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>

            <div>
              <label className="label">Correo</label>
              <input
                type="email"
                className="input"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value.trim().toLowerCase() })}
              />
            </div>

            <div>
              <label className="label">Codigo del sistema anterior</label>
              <input
                className="input"
                value={f.legacyContributorCode}
                onChange={(e) => setF({ ...f, legacyContributorCode: e.target.value.trim() })}
                placeholder="Ej. 210763"
              />
              <p className="help">Opcional. Solo para usuarios migrados.</p>
            </div>

            <div>
              <label className="label">Contrasena</label>
              <input type="password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
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

            <div className="flex flex-wrap gap-3 pt-2">
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? "Guardando..." : "Crear usuario"}
              </button>
              <Link href="/admin/users" className="btn btn-outline">Volver</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
