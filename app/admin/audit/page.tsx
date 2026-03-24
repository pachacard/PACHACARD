import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

function prettyJson(value: unknown) {
  if (value == null) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function fmtDate(value: Date | string) {
  const d = new Date(value);
  return d.toLocaleString("es-PE");
}

export default async function AuditPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="admin-shell">
      <div className="container-app space-y-6 py-6 md:py-8">
        <section className="admin-panel">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-[var(--brand)]/8 p-3 text-[var(--brand)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--brand)]/70">
                Modulo
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Auditoria del sistema
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Ultimos 100 eventos registrados del panel administrativo y acciones criticas.
              </p>
            </div>
          </div>
        </section>

        {logs.length === 0 ? (
          <div className="admin-panel text-sm text-slate-500">
            No hay registros de auditoria todavia.
          </div>
        ) : (
          <section className="grid gap-4">
            {logs.map((log) => (
              <div key={log.id} className="admin-panel">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="admin-chip">{log.module}</span>
                  <span className="admin-chip">{log.action}</span>
                  {log.entity && <span className="admin-chip">{log.entity}</span>}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">Actor</div>
                    <div className="mt-1 text-slate-600">{log.actorEmail || "-"}</div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">Fecha</div>
                    <div className="mt-1 text-slate-600">{fmtDate(log.createdAt)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">ID de entidad</div>
                    <div className="mt-1 break-all text-slate-600">{log.entityId || "-"}</div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">IP</div>
                    <div className="mt-1 text-slate-600">{log.ip || "-"}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="font-medium text-slate-900">Descripcion</div>
                    <div className="mt-1 text-slate-600">{log.description || "-"}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="font-medium text-slate-900">Navegador o dispositivo</div>
                    <div className="mt-1 break-all text-xs text-slate-500">
                      {log.userAgent || "-"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="mb-2 font-medium text-slate-900">Valores anteriores</div>
                    <pre className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs whitespace-pre-wrap text-slate-700">
                      {prettyJson(log.oldValues)}
                    </pre>
                  </div>

                  <div>
                    <div className="mb-2 font-medium text-slate-900">Valores nuevos</div>
                    <pre className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs whitespace-pre-wrap text-slate-700">
                      {prettyJson(log.newValues)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
