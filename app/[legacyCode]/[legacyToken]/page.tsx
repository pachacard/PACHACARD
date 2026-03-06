import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { makeCardToken } from "@/lib/token";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    legacyCode: string;
    legacyToken: string;
  };
};

export default async function LegacyRedeemBridgePage({ params }: PageProps) {
  const legacyCode = String(params.legacyCode || "").trim();
  const legacyToken = String(params.legacyToken || "").trim();

  console.log(
    `[legacy-bridge] legacyCode=${legacyCode} legacyToken_present=${!!legacyToken}`
  );

  if (!legacyCode || !legacyToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border bg-white p-6 shadow">
          <h1 className="text-xl font-semibold mb-2">Enlace inválido</h1>
          <p className="text-sm text-gray-600">
            El QR antiguo no contiene la información necesaria para continuar.
          </p>
        </div>
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { legacyContributorCode: legacyCode },
    select: {
      id: true,
      status: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border bg-white p-6 shadow">
          <h1 className="text-xl font-semibold mb-2">Tarjeta no reconocida</h1>
          <p className="text-sm text-gray-600">
            No se encontró un titular activo asociado a este código anterior.
          </p>
        </div>
      </div>
    );
  }

  const newToken = await makeCardToken(user.id);

  redirect(`/redeem?token=${encodeURIComponent(newToken)}`);
}