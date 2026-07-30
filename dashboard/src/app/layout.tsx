import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Warden | Security Operations",
  description: "API Security Gateway — Enterprise Security Operations Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrains.variable} min-h-screen flex`}
        style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
      >
        {/* ===== SIDEBAR (Client Component — handles pathname & hover) ===== */}
        <Sidebar />

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Sticky glassmorphic header */}
          <header
            className="h-14 flex items-center justify-between px-6 sticky top-0 z-10"
            style={{
              borderBottom: "1px solid #27272a",
              backgroundColor: "rgba(9,9,11,0.75)",
              backdropFilter: "blur(8px)",
            }}
          >
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm" style={{ color: "#a1a1aa" }}>
              <span>Overview</span>
              <span style={{ opacity: 0.4 }}>/</span>
              <span style={{ color: "#f4f4f5", fontWeight: 500 }}>Dashboard</span>
            </div>

            {/* Live status badge */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  backgroundColor: "#10b981",
                  boxShadow: "0 0 0 3px rgba(16,185,129,0.15)",
                }}
              />
              <span
                className="text-xs"
                style={{
                  color: "#a1a1aa",
                  fontFamily: "var(--font-jetbrains), monospace",
                }}
              >
                Target: localhost:8080
              </span>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 overflow-auto p-6">{children}</div>
        </main>
      </body>
    </html>
  );
}
