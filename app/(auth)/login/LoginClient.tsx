// app/(auth)/login/LoginClient.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

/**
 * Se definen íconos SVG locales para mostrar/ocultar contraseña.
 * Se evita dependencia extra, y se controla el estado desde el componente.
 */
function Eye(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z"
      />
      <circle cx="12" cy="12" r="3" strokeWidth="2" />
    </svg>
  );
}

function EyeOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M10.585 10.585a3 3 0 104.243 4.243M9.88 4.77A8.968 8.968 0 0112 4c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-3.143 4.5M6.61 6.61A9.956 9.956 0 004.458 12c1.274 4.057 5.065 7 9.542 7 1.287 0 2.522-.233 3.656-.66"
      />
    </svg>
  );
}

/**
 * Se muestra una barra superior con logos ( municipalidad).
 * Se usa fallback a PNG si falla la carga de SVG.
 */

/**
 * Barra superior con el escudo de la Municipalidad.
 * Se aumenta el tamaño del logo para que se aprecie mejor.
 */
/**
 * Barra superior con logo de la Municipalidad (login).
 * Logo más grande + pequeño fondo semitransparente para que se lea mejor.
 */
function TopBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-start justify-start py-4 sm:py-5">
          <div className="inline-flex items-center gap-3 rounded-full bg-black/15 px-3 py-2 backdrop-blur-sm">
            <img
              src="/brand/logpa.png"
              alt="Municipalidad de Pachacámac"
              className="
                pointer-events-auto
                h-12 sm:h-14 md:h-16
                w-auto
                drop-shadow-[0_4px_14px_rgba(0,0,0,.45)]
              "
            />
            {/* Texto solo en pantallas medianas hacia arriba */}
            <div className="hidden sm:block text-[11px] leading-tight text-white/90">
              <div className="uppercase tracking-[0.15em] text-[10px]">
                MUNICIPALIDAD DISTRITAL DE
              </div>
              <div className="text-sm font-semibold">Pachacámac</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




/** Se renderiza el fondo institucional con degradados y arte PAC. */
function BrandBackground() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[#8F1B1B]" />
      <div className="absolute inset-0 bg-[url('/brand/pac-web.svg')] bg-cover bg-center opacity-[0.12] mix-blend-luminosity" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(255,255,255,.14),transparent_60%)]" />
    </div>
  );
}

/**
 * Se encapsula el formulario que usa useSearchParams dentro de Suspense.
 * - Se lee el parámetro "error" de NextAuth y se muestra mensaje.
 * - Se maneja estado de inputs y submit.
 * - Se hace signIn("credentials") con callbackUrl.
 */
function LoginInner({ callbackUrl }: { callbackUrl: string }) {
  const search = useSearchParams();
  const errParam = search?.get("error");

  const shouldShowError =
    errParam && errParam !== "MissingCSRF" && errParam !== "SessionRequired";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  // Se activa un “fade in” corto para animación de entrada
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 10);
    return () => clearTimeout(t);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Se solicita CSRF para evitar ciertos errores intermitentes en auth
      await fetch("/api/auth/csrf", { cache: "no-store" }).catch(() => {});
      await signIn("credentials", {
        email,
        password,
        redirect: true,
        callbackUrl,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-0 sm:px-6">
      <div className="pt-16 md:pt-20 pb-10 min-h-[100vh] grid place-items-center">
        <div
          className={[
            "w-full sm:w-[560px] md:w-[640px]",
            "rounded-none sm:rounded-3xl",
            "bg-white ring-1 ring-slate-200",
            "shadow-[0_15px_60px_rgba(0,0,0,.28)]",
            "transition-all duration-500",
            ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          ].join(" ")}
        >
          <div className="p-5 sm:p-8">
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
                Iniciar sesión
              </h1>
              <p className="mt-1 text-slate-600 text-sm">
                Acceso exclusivo para titulares de <b>PACHACARD</b>.
              </p>
            </div>

            {shouldShowError && (
              <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                No se pudo iniciar sesión. Se verifica datos y se intenta otra vez.
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  autoComplete="username"
                  placeholder="tucorreo@pachacard.pe"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="
                    w-full rounded-lg border border-slate-300 bg-white
                    text-slate-900 placeholder-slate-400
                    px-3 py-2.5 outline-none
                    focus:ring-2 focus:ring-[#b3262a]/30 focus:border-[#b3262a]
                    transition
                  "
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="
                      w-full rounded-lg border border-slate-300 bg-white
                      text-slate-900 placeholder-slate-400
                      px-3 py-2.5 pr-12 outline-none
                      focus:ring-2 focus:ring-[#b3262a]/30 focus:border-[#b3262a]
                      transition
                    "
                  />

                  {/* Se alterna visibilidad del password sin afectar el submit */}
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="
                      absolute inset-y-0 right-2 my-1.5
                      inline-flex items-center justify-center
                      w-9 rounded-md border border-slate-300
                      text-slate-600 hover:text-slate-800
                      bg-white hover:bg-slate-50
                      transition
                    "
                  >
                    {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="
                  w-full rounded-lg
                  bg-gradient-to-b from-[#9a1e1e] to-[#7e1515]
                  text-white font-medium py-2.5
                  shadow-[0_6px_20px_rgba(0,0,0,.12)]
                  hover:shadow-[0_10px_28px_rgba(0,0,0,.16)]
                  active:scale-[.995]
                  transition disabled:opacity-70
                "
              >
                {submitting ? "Ingresando…" : "Entrar"}
              </button>
            </form>

            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
              <div className="font-medium text-slate-800 mb-1.5">¿Necesitas ayuda?</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>La contraseña es entregada por la Municipalidad con la PACHACARD.</li>
                <li>Si se olvida, se solicita el cambio al soporte.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Se renderiza la pantalla completa de login con fondo institucional:
 * - Se monta el background + topbar
 * - Se carga el formulario dentro de Suspense (por useSearchParams)
 */
export default function LoginClient({ callbackUrl = "/app" }: { callbackUrl?: string }) {
  return (
    <div className="fixed inset-0 overflow-auto">
      <div className="relative min-h-full">
        <BrandBackground />
        <TopBar />
        <Suspense
          fallback={
            <div className="grid place-items-center min-h-[60vh] text-white/80">
              Cargando…
            </div>
          }
        >
          <LoginInner callbackUrl={callbackUrl} />
        </Suspense>
      </div>
    </div>
  );
}
