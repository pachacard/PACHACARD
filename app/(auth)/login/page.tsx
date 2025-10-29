// app/(auth)/login/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

type Props = { searchParams?: { callbackUrl?: string } };

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth();

  // Respetar callbackUrl si viene; fallback a /app
  const callbackUrl =
    typeof searchParams?.callbackUrl === "string" && searchParams!.callbackUrl
      ? searchParams!.callbackUrl
      : "/app";

  // Si ya está autenticado, NO muestres el login
  if (session?.user) {
    redirect(callbackUrl);
  }

  // Renderiza el formulario cliente
  return <LoginClient callbackUrl={callbackUrl} />;
}
