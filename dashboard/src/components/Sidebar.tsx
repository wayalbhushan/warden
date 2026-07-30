"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ShieldAlert, Server, Settings, Search } from "lucide-react";

const navItems = [
  { href: "/",      icon: Activity,     label: "Live Telemetry" },
  { href: "/scans", icon: Search,       label: "Vulnerability Scans" },
  { href: "/infrastructure", icon: Server, label: "Infrastructure" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
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

        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium mb-0.5"
              style={{
                backgroundColor: active ? "#27272a" : "transparent",
                color: active ? "#f4f4f5" : "#a1a1aa",
                textDecoration: "none",
                transition: "background-color 150ms, color 150ms",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "#18181b";
                  e.currentTarget.style.color = "#f4f4f5";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#a1a1aa";
                }
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          );
        })}
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
  );
}
