"use client";

import { useState, useEffect } from "react";
import {
  Cpu,
  HardDrive,
  Network,
  Server,
  ShieldCheck,
  Activity,
  Database,
  ArrowRight,
  CheckCircle,
  Lock,
  BarChart3,
  Gauge,
} from "lucide-react";

interface SystemMetrics {
  cpu: number;
  memory: number;
  networkIn: number;
  networkOut: number;
  goroutines: number;
  heapMB: number;
}

const securityModules = [
  { name: "Signature WAF", description: "SQLi / NoSQLi / Cmd Injection", icon: Lock,        status: "active" },
  { name: "SSRF Engine",   description: "Bounded 100ms DNS timeout",       icon: Network,     status: "active" },
  { name: "BOLA Tracker",  description: "Redis SET cardinality",           icon: Database,    status: "active" },
  { name: "Rate Limiter",  description: "Token bucket · 50 k req/min",    icon: Gauge,       status: "active" },
  { name: "JWT Auth",      description: "HS256 bearer validation",         icon: CheckCircle, status: "active" },
  { name: "Telemetry",     description: "Prometheus · :9090/metrics",      icon: BarChart3,   status: "active" },
];

function GlowDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

function ResourceBar({
  label,
  value,
  unit = "%",
  color,
  icon: Icon,
  hoverBorder,
  subtitle,
}: {
  label: string;
  value: number;
  unit?: string;
  color: string;
  icon: React.ElementType;
  hoverBorder: string;
  subtitle?: string;
}) {
  const displayValue = unit === "%" ? value.toFixed(1) : value.toFixed(2);
  // Color thresholds for % values
  const barColor =
    unit !== "%" ? color
      : value < 50 ? "#10b981"
      : value < 75 ? "#f59e0b"
      : "#ef4444";

  return (
    <div
      className="p-5 rounded-lg flex flex-col group"
      style={{
        backgroundColor: "#18181b",
        border: `1px solid #27272a`,
        transition: "border-color 200ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = hoverBorder;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#27272a";
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: "#71717a" }} />
          <span className="text-sm font-medium" style={{ color: "#a1a1aa" }}>
            {label}
          </span>
        </div>
        <span
          className="text-lg font-semibold tabular-nums"
          style={{ color: barColor, fontFamily: "var(--font-jetbrains), monospace" }}
        >
          {displayValue}
          {unit}
        </span>
      </div>

      {unit === "%" ? (
        <>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "#27272a" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${value}%`,
                backgroundColor: barColor,
                transition: "width 1000ms ease-out, background-color 600ms",
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px]" style={{ color: "#52525b", fontFamily: "var(--font-jetbrains), monospace" }}>
            <span>0%</span>
            <span style={{ color: "#71717a" }}>{displayValue}% used</span>
            <span>100%</span>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between text-xs mt-2" style={{ color: "#52525b", fontFamily: "var(--font-jetbrains), monospace" }}>
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
}

export default function InfrastructurePage() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 34,
    memory: 62,
    networkIn: 1.2,
    networkOut: 0.8,
    goroutines: 48,
    heapMB: 14.4,
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const interval = setInterval(() => {
      setMetrics((prev) => ({
        cpu: Math.min(99, Math.max(10, prev.cpu + (Math.random() * 12 - 6))),
        memory: Math.min(95, Math.max(20, prev.memory + (Math.random() * 4 - 2))),
        networkIn: Math.max(0.1, prev.networkIn + (Math.random() * 0.4 - 0.2)),
        networkOut: Math.max(0.1, prev.networkOut + (Math.random() * 0.4 - 0.2)),
        goroutines: Math.max(30, Math.round(prev.goroutines + (Math.random() * 6 - 3))),
        heapMB: Math.max(8, prev.heapMB + (Math.random() * 2 - 1)),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null; // avoid SSR mismatch on animated values

  return (
    <div
      className="max-w-7xl mx-auto space-y-8"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#f4f4f5" }}>
            Infrastructure Health
          </h1>
          <p className="text-sm mt-1" style={{ color: "#a1a1aa" }}>
            Cluster topology, resource utilization, and subsystem status.
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
            color: "#10b981",
            fontFamily: "var(--font-jetbrains), monospace",
          }}
        >
          <GlowDot color="#10b981" />
          Cluster Optimal
        </div>
      </div>

      {/* ===== RESOURCE UTILIZATION GRID ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ResourceBar
          label="CPU Utilization"
          value={metrics.cpu}
          unit="%"
          color="#3b82f6"
          icon={Cpu}
          hoverBorder="rgba(59,130,246,0.4)"
        />
        <ResourceBar
          label="Memory Usage"
          value={metrics.memory}
          unit="%"
          color="#f59e0b"
          icon={HardDrive}
          hoverBorder="rgba(245,158,11,0.4)"
        />
        <ResourceBar
          label="Network Inbound"
          value={metrics.networkIn}
          unit=" MB/s"
          color="#10b981"
          icon={Network}
          hoverBorder="rgba(16,185,129,0.4)"
          subtitle={`OUT: ${metrics.networkOut.toFixed(2)} MB/s`}
        />
        <ResourceBar
          label="Go Goroutines"
          value={metrics.goroutines}
          unit=""
          color="#a855f7"
          icon={Activity}
          hoverBorder="rgba(168,85,247,0.4)"
          subtitle={`Heap: ${metrics.heapMB.toFixed(1)} MB`}
        />
      </div>

      {/* ===== CLUSTER TOPOLOGY ===== */}
      <div
        className="p-6 rounded-lg"
        style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-8"
          style={{ color: "#52525b", fontFamily: "var(--font-jetbrains), monospace" }}
        >
          Network Topology
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 py-4">

          {/* Public Internet */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "#09090b",
                border: "2px dashed #3f3f46",
              }}
            >
              <Activity size={24} style={{ color: "#71717a" }} />
            </div>
            <div className="text-center">
              <span className="text-xs font-medium block" style={{ color: "#a1a1aa" }}>Public Internet</span>
              <span className="text-[10px] block" style={{ color: "#52525b", fontFamily: "var(--font-jetbrains), monospace" }}>all clients</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center gap-1">
            <ArrowRight
              size={20}
              style={{ color: "#3f3f46" }}
              className="animate-pulse hidden md:block"
            />
            <span className="text-[10px] hidden md:block" style={{ color: "#52525b", fontFamily: "var(--font-jetbrains), monospace" }}>HTTP</span>
          </div>

          {/* Warden Gateway — hero node */}
          <div className="flex flex-col items-center gap-3 relative">
            {/* Ping ring */}
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full animate-ping opacity-60"
              style={{ backgroundColor: "#10b981" }}
            />
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2"
              style={{ backgroundColor: "#10b981", borderColor: "#18181b" }}
            />

            <div
              className="w-24 h-24 rounded-xl flex items-center justify-center relative"
              style={{
                backgroundColor: "rgba(16,185,129,0.05)",
                border: "2px solid #10b981",
                boxShadow: "0 0 24px rgba(16,185,129,0.12), 0 0 8px rgba(16,185,129,0.08)",
              }}
            >
              <ShieldCheck size={40} style={{ color: "#10b981" }} />
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold block" style={{ color: "#f4f4f5" }}>Warden Node_01</span>
              <span
                className="text-[10px] block"
                style={{ color: "#10b981", fontFamily: "var(--font-jetbrains), monospace" }}
              >
                :8080 · ACTIVE
              </span>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center gap-1">
            <ArrowRight
              size={20}
              style={{ color: "#3f3f46" }}
              className="animate-pulse hidden md:block"
            />
            <span className="text-[10px] hidden md:block" style={{ color: "#52525b", fontFamily: "var(--font-jetbrains), monospace" }}>upstream</span>
          </div>

          {/* Backend services */}
          <div className="flex flex-col gap-3">
            {[
              { icon: Database, label: "Redis Cluster", sub: "Rate Limiter · BOLA", color: "#3b82f6" },
              { icon: Server,   label: "Echo Target",   sub: "upstream · :8081",    color: "#a855f7" },
            ].map(({ icon: Icon, label, sub, color }) => (
              <div
                key={label}
                className="flex items-center gap-3 p-3 rounded-lg w-52"
                style={{
                  backgroundColor: "#09090b",
                  border: "1px solid #27272a",
                  transition: "border-color 200ms",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${color}66`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#27272a";
                }}
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>
                <div>
                  <span className="text-xs font-medium block" style={{ color: "#d4d4d8" }}>{label}</span>
                  <span
                    className="text-[10px] block"
                    style={{ color: "#71717a", fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {sub}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== SECURITY MODULES STATUS ===== */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
      >
        <div
          className="px-6 py-4"
          style={{ borderBottom: "1px solid #27272a" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>
            Security Module Status
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "#27272a" }}>
          {securityModules.map(({ name, description, icon: Icon, status }) => (
            <div
              key={name}
              className="flex items-center gap-4 px-6 py-4 group"
              style={{ transition: "background-color 150ms" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = "#1c1c1f";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
              }}
            >
              {/* Glow icon */}
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}
              >
                <Icon size={16} style={{ color: "#10b981" }} />
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate" style={{ color: "#f4f4f5" }}>
                  {name}
                </span>
                <span
                  className="text-[10px] block truncate"
                  style={{ color: "#71717a", fontFamily: "var(--font-jetbrains), monospace" }}
                >
                  {description}
                </span>
              </div>

              <GlowDot color={status === "active" ? "#10b981" : "#ef4444"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
