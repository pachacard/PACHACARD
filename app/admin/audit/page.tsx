import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="container-app py-6">
      <div className="card">
        <div className="card-body space-y-4">
          <div>
            <h1 className="card-title">Auditoría del sistema</h1>
            <p className="help">
              Últimos 100 eventos registrados del panel administrativo y acciones críticas.
            </p>
          </div>

          {logs.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-gray-600">
              No hay registros de auditoría todavía.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border px-2 py-1 text-xs font-medium">
                      {log.module}
                    </span>
                    <span className="inline-flex rounded-full border px-2 py-1 text-xs font-medium">
                      {log.action}
                    </span>
                    {log.entity && (
                      <span className="inline-flex rounded-full border px-2 py-1 text-xs font-medium">
                        {log.entity}
                      </span>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="font-medium">Actor</div>
                      <div>{log.actorEmail || "-"}</div>
                    </div>

                    <div>
                      <div className="font-medium">Fecha</div>
                      <div>{fmtDate(log.createdAt)}</div>
                    </div>

                    <div>
                      <div className="font-medium">Entity ID</div>
                      <div className="break-all">{log.entityId || "-"}</div>
                    </div>

                    <div>
                      <div className="font-medium">IP</div>
                      <div>{log.ip || "-"}</div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="font-medium">Descripción</div>
                      <div>{log.description || "-"}</div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="font-medium">User Agent</div>
                      <div className="break-all text-xs text-gray-600">
                        {log.userAgent || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-3">
                    <div>
                      <div className="font-medium mb-1">Valores anteriores</div>
                      <pre className="rounded-lg border bg-gray-50 p-3 text-xs overflow-auto whitespace-pre-wrap">
                        {prettyJson(log.oldValues)}
                      </pre>
                    </div>

                    <div>
                      <div className="font-medium mb-1">Valores nuevos</div>
                      <pre className="rounded-lg border bg-gray-50 p-3 text-xs overflow-auto whitespace-pre-wrap">
                        {prettyJson(log.newValues)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}