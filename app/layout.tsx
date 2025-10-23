import { Inter } from "next/font/google";
import "./globals.css";
import PachaHeader from "./_components/PachaHeader";

export const metadata = {
  title: "PACHACARD · Municipalidad de Pachacámac",
  description: "Programa de descuentos y beneficios para contribuyentes.",
};

// ✅ Usa viewport para themeColor (evita warnings)
export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#8f1b1b" },
  ],
};

// 🔤 Fuente moderna (Inter)
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>
      {/* Aplica Inter como fuente base + colores globales */}
      <body className={`${inter.variable} font-sans min-h-dvh bg-[var(--bg)] text-[var(--ink)]`}>
        <PachaHeader />
        <main className="container-app py-6">{children}</main>
        <footer className="container-app py-8 text-xs text-slate-500">
          © {new Date().getFullYear()} Municipalidad de Pachacámac · PACHACARD
        </footer>
      </body>
    </html>
  );
}
