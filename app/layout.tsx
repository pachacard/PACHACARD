// app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import PachaHeader from "@/components/pachacard/PachaHeader";

export const metadata: Metadata = {
  title: "PACHACARD · Municipalidad Distrital de Pachacámac",
  description: "Programa de descuentos y beneficios para contribuyentes.",
  icons: {
    icon: "/icons/pachacard-192.png",   // favicon general
    apple: "/icons/pachacard-192.png",  // icono para iOS / PWA
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#8f1b1b" },
  ],
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Viewport para móviles */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        {/* Manifest para acceso directo tipo app */}
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body
        className={`${inter.variable} font-sans min-h-dvh bg-[var(--bg)] text-[var(--ink)]`}
      >
        {/* Barra superior institucional */}
        <PachaHeader />

        {/* Contenido de la app */}
        <main className="container-app py-6">{children}</main>

        {/* Pie institucional */}
        <footer className="container-app py-8 text-xs text-slate-500">
          © {new Date().getFullYear()} Municipalidad Distrital de Pachacámac ·
          {" "}
          PACHACARD
        </footer>
      </body>
    </html>
  );
}
