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
  RefreshCw,
  X,
  Radio,
  Zap,
  SlidersHorizontal,
} from "lucide-react";
import { ToastContainer, ToastMessage } from "@/components/Toast";

interface SystemMetrics {
  cpu: number;
  memory: number;
  networkIn: number;
  networkOut: number;
  goroutines: number;
  heapMB: number;
}

interface SecurityModule {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: "active" | "paused";
}

interface NodeDetail {
  name: string;
  role: string;
  endpoint: string;
  status: string;
  uptime: string;
  memory: string;
  connections: string;
  details: string;
}

const nodeDataMap: Record<string, NodeDetail> = {
  warden: {
    name: "Warden Node_01",
    role: "Primary Security Gateway",
    endpoint: "localhost:8080",
    status: "Healthy (0 drops)",
    uptime: "14 days, 6 hours",
    memory: "24.8 MB RSS",
    connections: "1,240 active keep-alive sockets",
    details: "Handles reverse proxying, WAF signature matching, SSRF validation, and BOLA IDOR sets.",
  },
  redis: {
    name: "Redis Cluster",
    role: "Distributed State Store",
    endpoint: "localhost:6379",
    status: "Connected · 0.2ms latency",
    uptime: "45 days",
    memory: "18.2 MB",
    connections: "16 pooled connections",
    details: "Stores token bucket rate limits and user resource ownership sets for BOLA cross-validation.",
  },
  echo: {
    name: "Echo Target Backend",
    role: "Upstream Target API",
    endpoint: "localhost:8081",
    status: "Optimal",
    uptime: "7 days",
    memory: "42.1 MB",
    connections: "128 active HTTP worker threads",
    details: "Mock upstream REST API receiving sanitized proxy traffic from Warden gateway.",
  },
  internet: {
    name: "Public Internet Ingress",
    role: "External Traffic Source",
    endpoint: "0.0.0.0/0",
    status: "Ingress Active",
    uptime: "99.99%",
    memory: "N/A",
    connections: "8,493 req/sec ingress throughput",
    details: "External client HTTP/HTTPS requests originating from public internet users and API clients.",
  },
};

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

// Glowing Flowing Packet Channel Component
function FlowingChannelLine({ label, speed = "1.6s" }: { label: string; speed?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[100px]">
      <span
        className="text-[10px] font-mono uppercase tracking-wider"
        style={{ color: "#71717a" }}
      >
        {label}
      </span>
      <div className="relative w-28 h-3 flex items-center justify-center">
        {/* Connection Line */}
        <div
          className="w-full h-[2px] rounded-full"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(59,130,246,0.2) 0%, rgba(16,185,129,0.8) 50%, rgba(59,130,246,0.2) 100%)",
          }}
        />

        {/* Animated Flowing Packet Particles */}
        <span
          className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-flow-1"
        />
        <span
          className="absolute w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-flow-2"
        />
        <span
          className="absolute w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa] animate-flow-3"
        />
      </div>
      <span
        className="text-[9px] font-mono"
        style={{ color: "#10b981" }}
      >
        8.4k pps ● &lt;0.2ms
      </span>
    </div>
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
  const barColor =
    unit !== "%" ? color : value < 50 ? "#10b981" : value < 75 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="p-5 rounded-lg flex flex-col group cursor-default transition-all border border-zinc-800 bg-zinc-900"
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
          <span className="text-sm font-medium text-zinc-400">{label}</span>
        </div>
        <span
          className="text-lg font-semibold tabular-nums font-mono"
          style={{ color: barColor }}
        >
          {displayValue}
          {unit}
        </span>
      </div>

      {unit === "%" ? (
        <>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-zinc-800">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${value}%`,
                backgroundColor: barColor,
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-zinc-500 font-mono">
            <span>0%</span>
            <span className="text-zinc-400">{displayValue}% used</span>
            <span>100%</span>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between text-xs mt-2 text-zinc-500 font-mono">
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

  const [modules, setModules] = useState<SecurityModule[]>([
    { id: "waf", name: "Signature WAF", description: "SQLi / NoSQLi / Cmd Injection", icon: Lock, status: "active" },
    { id: "ssrf", name: "SSRF Engine", description: "Bounded 100ms DNS timeout", icon: Network, status: "active" },
    { id: "bola", name: "BOLA Tracker", description: "Redis SET cardinality", icon: Database, status: "active" },
    { id: "ratelimit", name: "Rate Limiter", description: "Token bucket · 50 k req/min", icon: Gauge, status: "active" },
    { id: "jwt", name: "JWT Auth", description: "HS256 bearer validation", icon: CheckCircle, status: "active" },
    { id: "metrics", name: "Telemetry", description: "Prometheus · :9090/metrics", icon: BarChart3, status: "active" },
  ]);

  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [mounted, setMounted] = useState(false);

  const addToast = (
    title: string,
    description?: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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

  const handleToggleModule = (id: string, name: string) => {
    setModules((prev) =>
      prev.map((mod) => {
        if (mod.id === id) {
          const nextStatus = mod.status === "active" ? "paused" : "active";
          addToast(
            `Module ${nextStatus === "active" ? "Activated" : "Paused"}`,
            `${name} security module is now ${nextStatus.toUpperCase()}`,
            nextStatus === "active" ? "success" : "info"
          );
          return { ...mod, status: nextStatus };
        }
        return mod;
      })
    );
  };

  const handleSyncCluster = () => {
    setIsSyncing(true);
    addToast("Syncing Cluster Topology", "Querying Warden nodes and upstream targets...", "info");
    setTimeout(() => {
      setIsSyncing(false);
      addToast("Cluster Synced", "All 3 nodes responding with 0% packet loss.", "success");
    }, 1200);
  };

  if (!mounted) return null;

  const selectedNode = selectedNodeKey ? nodeDataMap[selectedNodeKey] : null;

  return (
    <div
      className="max-w-7xl mx-auto space-y-8"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      {/* ===== HEADER & ACTIONS ===== */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Infrastructure Health & Packet Topology
          </h1>
          <p className="text-sm mt-1 text-zinc-400">
            Live packet flow streams, cluster node topology, and security subsystem status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncCluster}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin text-blue-400" : ""} />
            {isSyncing ? "Syncing..." : "Manual Cluster Sync"}
          </button>

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider font-mono"
            style={{
              backgroundColor: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              color: "#10b981",
            }}
          >
            <GlowDot color="#10b981" />
            Cluster Optimal
          </div>
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

      {/* ===== ANIMATED PACKET FLOW TOPOLOGY ===== */}
      <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-emerald-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 font-mono">
              Live Packet Flow Stream (Click nodes to inspect)
            </p>
          </div>
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            8,493 pps Live Packet Feed
          </span>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 py-6">

          {/* Node 1: Public Internet */}
          <div
            onClick={() => setSelectedNodeKey("internet")}
            className="flex flex-col items-center gap-3 cursor-pointer group"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all group-hover:border-blue-500 bg-zinc-950 border-2 border-dashed border-zinc-700 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
            >
              <Activity size={24} className="text-zinc-400 group-hover:text-blue-400 transition-colors" />
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold block text-zinc-200 group-hover:text-blue-400 transition-colors">Public Internet</span>
              <span className="text-[10px] block text-zinc-500 font-mono">0.0.0.0/0 · HTTP/2</span>
            </div>
          </div>

          {/* Flow Channel 1: Internet -> Warden */}
          <FlowingChannelLine label="HTTP Ingress" />

          {/* Node 2: Warden Security Gateway (Hero Node) */}
          <div
            onClick={() => setSelectedNodeKey("warden")}
            className="flex flex-col items-center gap-3 relative cursor-pointer group"
          >
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full animate-ping opacity-60 bg-emerald-500" />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 bg-emerald-500 border-zinc-900" />

            <div
              className="w-24 h-24 rounded-xl flex items-center justify-center relative transition-all group-hover:scale-105"
              style={{
                backgroundColor: "rgba(16,185,129,0.08)",
                border: "2px solid #10b981",
                boxShadow: "0 0 30px rgba(16,185,129,0.2), 0 0 10px rgba(16,185,129,0.15)",
              }}
            >
              <ShieldCheck size={44} className="text-emerald-400" />
            </div>
            <div className="text-center">
              <span className="text-sm font-bold block text-zinc-100 group-hover:text-emerald-400 transition-colors">Warden Node_01</span>
              <span className="text-[10px] block text-emerald-400 font-mono">:8080 · WAF SANITIZING</span>
            </div>
          </div>

          {/* Flow Channel 2: Warden -> Upstream */}
          <FlowingChannelLine label="Upstream Proxy" />

          {/* Node 3: Backend Services */}
          <div className="flex flex-col gap-4">
            <div
              onClick={() => setSelectedNodeKey("redis")}
              className="flex items-center gap-3 p-3 rounded-lg w-56 cursor-pointer transition-all hover:border-blue-500/60 bg-zinc-950 border border-zinc-800 shadow-md"
            >
              <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-blue-500/10 border border-blue-500/30">
                <Database size={16} className="text-blue-400" />
              </div>
              <div>
                <span className="text-xs font-medium block text-zinc-200">Redis Cluster</span>
                <span className="text-[10px] block text-zinc-500 font-mono">Rate Limits & BOLA · :6379</span>
              </div>
            </div>

            <div
              onClick={() => setSelectedNodeKey("echo")}
              className="flex items-center gap-3 p-3 rounded-lg w-56 cursor-pointer transition-all hover:border-purple-500/60 bg-zinc-950 border border-zinc-800 shadow-md"
            >
              <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-purple-500/10 border border-purple-500/30">
                <Server size={16} className="text-purple-400" />
              </div>
              <div>
                <span className="text-xs font-medium block text-zinc-200">Echo Target API</span>
                <span className="text-[10px] block text-zinc-500 font-mono">Sanitized Proxy · :8081</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECURITY MODULES STATUS ===== */}
      <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
        <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Security Subsystem Modules
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Click switches to activate or pause security modules</p>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {modules.filter((m) => m.status === "active").length} / {modules.length} Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-zinc-800">
          {modules.map(({ id, name, description, icon: Icon, status }) => {
            const isActive = status === "active";
            return (
              <div
                key={id}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-800/30"
              >
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    backgroundColor: isActive ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                    border: isActive ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(245,158,11,0.2)",
                  }}
                >
                  <Icon size={16} style={{ color: isActive ? "#10b981" : "#f59e0b" }} />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block truncate text-zinc-100">
                    {name}
                  </span>
                  <span className="text-[10px] block truncate text-zinc-500 font-mono">
                    {description}
                  </span>
                </div>

                {/* Interactive Toggle Switch */}
                <button
                  type="button"
                  onClick={() => handleToggleModule(id, name)}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    isActive ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                  title={isActive ? "Pause Module" : "Activate Module"}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== NODE INSPECTOR MODAL ===== */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="text-blue-400" size={18} />
                <h3 className="text-base font-semibold">{selectedNode.name}</h3>
              </div>
              <button
                onClick={() => setSelectedNodeKey(null)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between p-2.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500">Role:</span>
                <span className="text-zinc-200 font-semibold">{selectedNode.role}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500">Endpoint:</span>
                <span className="text-blue-400">{selectedNode.endpoint}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500">Node Status:</span>
                <span className="text-emerald-400">{selectedNode.status}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500">Uptime:</span>
                <span className="text-zinc-300">{selectedNode.uptime}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500">Memory RSS:</span>
                <span className="text-zinc-300">{selectedNode.memory}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950/60 p-3 rounded border border-zinc-800/60">
              {selectedNode.details}
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  addToast("Ping Diagnostics", `Pinged ${selectedNode.name}: 0.4ms RTT`, "info");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors cursor-pointer"
              >
                <Zap size={13} /> Ping Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
