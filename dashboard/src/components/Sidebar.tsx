"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ShieldAlert, Server, Settings, Search } from "lucide-react";
import SettingsModal from "./SettingsModal";
import { ToastContainer, ToastMessage } from "./Toast";

const navItems = [
  { href: "/", icon: Activity, label: "Live Telemetry" },
  { href: "/scans", icon: Search, label: "Vulnerability Scans" },
  { href: "/infrastructure", icon: Server, label: "Infrastructure" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, description?: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      <aside
        className="w-64 flex flex-col shrink-0"
        style={{ backgroundColor: "#09090b", borderRight: "1px solid #27272a" }}
      >
        {/* Brand */}
        <div
          className="h-14 flex items-center px-4"
          style={{ borderBottom: "1px solid #27272a" }}
        >
          <Link href="/" className="flex items-center gap-2 font-semibold no-underline" style={{ color: "#f4f4f5" }}>
            <ShieldAlert size={20} style={{ color: "#3b82f6" }} />
            <span>
              Warden
              <span style={{ color: "#a1a1aa", fontWeight: 400 }}> / Gateway</span>
            </span>
          </Link>
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

        {/* User footer & Settings Trigger */}
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderTop: "1px solid #27272a" }}
        >
          <div
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors group-hover:border-blue-500"
              style={{ backgroundColor: "#27272a", border: "1px solid #3f3f46" }}
            >
              <Settings size={14} className="text-zinc-400 group-hover:text-blue-400 transition-colors" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium group-hover:text-blue-400 transition-colors" style={{ color: "#f4f4f5" }}>
                Admin User
              </span>
              <span
                className="text-[10px]"
                style={{ color: "#a1a1aa", fontFamily: "var(--font-jetbrains), monospace" }}
              >
                SOC Analyst
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaveToast={(title, desc) => addToast(title, desc, "success")}
      />

      {/* Toast Notifications Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
