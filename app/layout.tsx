// app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import PachaHeader from "@/components/pachacard/PachaHeader";

export const metadata: Metadata = {
  title: "PACHACARD · Municipalidad de Pachacámac",
  description: "Programa de descuentos y beneficios para contribuyentes.",
  icons: {
    icon: "/icons/pachacard-192.png",   // icono general
    apple: "/icons/pachacard-192.png",  // icono para iOS
  },
};

// Viewport + themeColor para móviles
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
        {/* Manifest para que en Android use el logo y nombre al crear acceso directo */}
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body
        className={`${inter.variable} font-sans min-h-dvh bg-[var(--bg)] text-[var(--ink)]`}
      >
        <PachaHeader />
        <main className="container-app py-6">{children}</main>
        <footer className="container-app py-8 text-xs text-slate-500">
          © {new Date().getFullYear()} Municipalidad de Pachacámac · PACHACARD
        </footer>
      </body>
    </html>
  );
}
