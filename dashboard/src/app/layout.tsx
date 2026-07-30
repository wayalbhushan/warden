import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Activity, ShieldAlert, Server, Settings, Search } from "lucide-react";
import { NavLink } from "./components";

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

const navItems = [
  { href: "#", icon: Activity, label: "Live Telemetry", active: true },
  { href: "#", icon: Search, label: "Vulnerability Scans", active: false },
  { href: "#", icon: Server, label: "Infrastructure", active: false },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrains.variable} min-h-screen flex`}
        style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
      >
        {/* ===== SIDEBAR ===== */}
        <aside
          className="w-64 flex flex-col shrink-0"
          style={{ backgroundColor: "#09090b", borderRight: "1px solid #27272a" }}
        >
          {/* Brand */}
          <div
            className="h-14 flex items-center px-4"
            style={{ borderBottom: "1px solid #27272a" }}
          >
            <div className="flex items-center gap-2 font-semibold" style={{ color: "#f4f4f5" }}>
              <ShieldAlert size={20} style={{ color: "#3b82f6" }} />
              <span>
                Warden
                <span style={{ color: "#a1a1aa", fontWeight: 400 }}> / Gateway</span>
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3">
            <div
              className="text-xs uppercase tracking-wider mb-2 mt-4 px-2"
              style={{
                color: "#a1a1aa",
                fontFamily: "var(--font-jetbrains), monospace",
                letterSpacing: "0.1em",
              }}
            >
              Dashboards
            </div>

            {navItems.map(({ href, icon: Icon, label, active }) => (
              <NavLink key={label} href={href} active={active}>
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User footer */}
          <div
            className="p-4 flex items-center gap-3"
            style={{ borderTop: "1px solid #27272a" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#27272a", border: "1px solid #3f3f46" }}
            >
              <Settings size={14} style={{ color: "#a1a1aa" }} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium" style={{ color: "#f4f4f5" }}>Admin User</span>
              <span
                className="text-[10px]"
                style={{ color: "#a1a1aa", fontFamily: "var(--font-jetbrains), monospace" }}
              >
                SOC Analyst
              </span>
            </div>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Top bar */}
          <header
            className="h-14 flex items-center justify-between px-6 sticky top-0 z-10"
            style={{
              borderBottom: "1px solid #27272a",
              backgroundColor: "rgba(9,9,11,0.75)",
              backdropFilter: "blur(8px)",
            }}
          >
            {/* Breadcrumb */}
            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: "#a1a1aa" }}
            >
              <span>Overview</span>
              <span style={{ opacity: 0.4 }}>/</span>
              <span style={{ color: "#f4f4f5", fontWeight: 500 }}>Live Telemetry</span>
            </div>

            {/* Status badge */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: "#10b981", boxShadow: "0 0 0 3px rgba(16,185,129,0.15)" }}
              />
              <span
                className="text-xs"
                style={{ color: "#a1a1aa", fontFamily: "var(--font-jetbrains), monospace" }}
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
