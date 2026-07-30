import type { Metadata } from "next";
import { Playfair_Display, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Activity, ShieldAlert, Server, ArrowRight } from "lucide-react";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WARDEN // Gateway",
  description: "Enterprise API Security Gateway — Minimalist Security Operations Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${sourceSerif.variable} ${jetbrains.variable} min-h-screen flex flex-col md:flex-row`}
      >
        {/* ===== SIDEBAR ===== */}
        <aside
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          className="w-full md:w-64 border-b-4 md:border-b-0 md:border-r-4 border-black bg-white flex flex-col z-10"
        >
          {/* Logo / Brand */}
          <div className="p-6 border-b-4 border-black">
            <h1
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              className="text-3xl font-black tracking-tighter leading-none"
            >
              WARDEN
            </h1>
            <p className="text-[10px] tracking-widest mt-2 uppercase opacity-60">
              API Security Gateway
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 flex flex-col">
            {/* Active item */}
            <a
              href="#"
              className="flex items-center justify-between p-4 border-b border-black bg-black text-white cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Activity size={18} strokeWidth={2} />
                <span className="text-xs uppercase tracking-widest font-bold">
                  Live Telemetry
                </span>
              </div>
              <ArrowRight size={16} strokeWidth={2} />
            </a>

            {/* Inactive items — instant invert on hover */}
            <a
              href="#"
              className="flex items-center justify-between p-4 border-b border-black hover:bg-black hover:text-white cursor-pointer"
              style={{ transition: "none" }}
            >
              <div className="flex items-center gap-3">
                <ShieldAlert size={18} strokeWidth={1.5} />
                <span className="text-xs uppercase tracking-widest">
                  Vulnerability Audits
                </span>
              </div>
            </a>

            <a
              href="#"
              className="flex items-center justify-between p-4 border-b border-black hover:bg-black hover:text-white cursor-pointer"
              style={{ transition: "none" }}
            >
              <div className="flex items-center gap-3">
                <Server size={18} strokeWidth={1.5} />
                <span className="text-xs uppercase tracking-widest">
                  Gateway Health
                </span>
              </div>
            </a>
          </nav>

          {/* Target cluster footer */}
          <div className="p-6 border-t-2 border-black">
            <p className="text-xs mb-1 uppercase tracking-widest opacity-60">Target Cluster</p>
            <p
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              className="text-lg font-bold"
            >
              localhost:8080
            </p>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 flex flex-col min-h-screen">
          {/* Header bar */}
          <header className="h-16 border-b-2 border-black flex items-center justify-between px-6 bg-white z-10">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-black" />
              <span
                style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                className="text-sm tracking-widest uppercase font-bold"
              >
                System Operational
              </span>
            </div>
            <span
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
              className="text-sm"
            >
              UTC {new Date().toISOString().split("T")[1].substring(0, 8)}
            </span>
          </header>

          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </body>
    </html>
  );
}
