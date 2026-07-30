"use client";

import { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Zap,
  ShieldOff,
  ArrowUpRight,
  Wifi,
  WifiOff,
  Flame,
  RotateCcw,
  Search,
  Filter,
  Layers,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { HoverRow } from "./components";
import { ToastContainer, ToastMessage } from "@/components/Toast";

interface Metrics {
  throughput: number;
  latency: string;
  threats: number;
  rateLimitDrops: number;
  status: "online" | "offline" | "connecting";
}

interface EventLogItem {
  time: string;
  type: "THREAT" | "RATE" | "REQ" | "INFO" | "OK";
  color: string;
  bg: string;
  msg: string;
  tag: string;
}

const initialEvents: EventLogItem[] = [
  { time: "17:34:40", type: "THREAT", color: "#ef4444", bg: "rgba(239,68,68,0.08)", msg: "security threat detected and blocked", tag: "SQLi" },
  { time: "17:34:16", type: "RATE",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)", msg: "rate limit exceeded — request dropped", tag: "429" },
  { time: "17:34:09", type: "INFO",   color: "#3b82f6", bg: "rgba(59,130,246,0.08)", msg: "Warden gateway server started", tag: "BOOT" },
  { time: "17:34:09", type: "OK",     color: "#10b981", bg: "rgba(16,185,129,0.08)", msg: "Prometheus telemetry server started", tag: "OBS" },
];

const securityMetrics = [
  { label: "SQLi Blocks",    key: "sqli",  pct: 62, color: "#ef4444" },
  { label: "SSRF Attempts",  key: "ssrf",  pct: 21, color: "#f59e0b" },
  { label: "BOLA / IDOR",    key: "bola",  pct: 15, color: "#a855f7" },
  { label: "Cmd Injection",  key: "cmd",   pct: 0,  color: "#10b981" },
];

const pipelineLayers = [
  { layer: "Metrics",    latency: "~0.1ms", desc: "Prometheus Counter & Histogram vector recorder" },
  { layer: "RateLimit",  latency: "~0.8ms", desc: "Token bucket sliding window backed by Redis" },
  { layer: "Auth",       latency: "~0.4ms", desc: "Bearer token signature validator" },
  { layer: "Security",   latency: "~2.0ms", desc: "Signature WAF, SSRF & BOLA inspectors" },
  { layer: "Proxy",      latency: "~6.5ms", desc: "httputil.ReverseProxy to upstream target" },
];

function StatusBadge({ status }: { status: Metrics["status"] }) {
  const configs = {
    online:     { color: "#10b981", bg: "rgba(16,185,129,0.08)",  Icon: Wifi,    label: "Gateway Online" },
    offline:    { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   Icon: WifiOff, label: "Gateway Offline" },
    connecting: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  Icon: Wifi,    label: "Connecting…"    },
  };
  const { color, bg, Icon, label } = configs[status];
  return (
    <span
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
      style={{ color, backgroundColor: bg, fontFamily: "var(--font-jetbrains), monospace" }}
    >
      <Icon size={12} /> {label}
    </span>
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    throughput: 0,
    latency: "0.00",
    threats: 0,
    rateLimitDrops: 0,
    status: "connecting",
  });

  const [events, setEvents] = useState<EventLogItem[]>(initialEvents);
  const [clock, setClock] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"1m" | "5m" | "15m" | "1h">("5m");
  const [isSimulatingBurst, setIsSimulatingBurst] = useState(false);

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [logFilter, setLogFilter] = useState("ALL");
  const [logSearch, setLogSearch] = useState("");

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, description?: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const prevRef = useRef<Metrics | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch("/api/metrics");
        const data: Metrics = await res.json();
        const prev = prevRef.current;

        if (prev && data.status === "online") {
          const nowStr = new Date().toLocaleTimeString("en-GB", { hour12: false });
          if (data.threats > (prev.threats ?? 0)) {
            setEvents((e) => [
              { time: nowStr, type: "THREAT", color: "#ef4444", bg: "rgba(239,68,68,0.08)", msg: "new security threat blocked", tag: "WAF" },
              ...e.slice(0, 19),
            ]);
          } else if (data.rateLimitDrops > (prev.rateLimitDrops ?? 0)) {
            setEvents((e) => [
              { time: nowStr, type: "RATE", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", msg: "rate limit exceeded — request dropped", tag: "429" },
              ...e.slice(0, 19),
            ]);
          } else if (data.throughput > (prev.throughput ?? 0)) {
            setEvents((e) => [
              { time: nowStr, type: "REQ", color: "#10b981", bg: "rgba(16,185,129,0.08)", msg: `processed request · avg ${data.latency}ms`, tag: "HTTP" },
              ...e.slice(0, 19),
            ]);
          }
        }

        prevRef.current = data;
        setMetrics(data);
      } catch {
        setMetrics((m) => ({ ...m, status: "offline" }));
      }
    }

    fetchMetrics();
    const id = setInterval(fetchMetrics, 2000);

    const tick = () =>
      setClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const clockId = setInterval(tick, 1000);

    return () => {
      clearInterval(id);
      clearInterval(clockId);
    };
  }, []);

  // Action: Simulate Attack Burst
  const handleSimulateBurst = () => {
    setIsSimulatingBurst(true);
    addToast("Attack Burst Triggered", "Injecting 5 simulated malicious payloads...", "error");

    const nowStr = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const burstEvents: EventLogItem[] = [
      { time: nowStr, type: "THREAT", color: "#ef4444", bg: "rgba(239,68,68,0.08)", msg: "SQL Injection attack blocked on /api/users", tag: "SQLi" },
      { time: nowStr, type: "THREAT", color: "#ef4444", bg: "rgba(239,68,68,0.08)", msg: "SSRF IP probing blocked (169.254.169.254)", tag: "SSRF" },
      { time: nowStr, type: "RATE",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)", msg: "DDoS rate limit exceeded (100 req/s)", tag: "429" },
      { time: nowStr, type: "THREAT", color: "#ef4444", bg: "rgba(239,68,68,0.08)", msg: "BOLA cross-user resource access denied", tag: "BOLA" },
    ];

    setEvents((prev) => [...burstEvents, ...prev]);
    setMetrics((m) => ({
      ...m,
      throughput: m.throughput + 42,
      threats: m.threats + 3,
      rateLimitDrops: m.rateLimitDrops + 1,
    }));

    setTimeout(() => {
      setIsSimulatingBurst(false);
    }, 1500);
  };

  // Action: Reset Events / Flush
  const handleFlushEvents = () => {
    setEvents(initialEvents);
    addToast("Event Buffer Flushed", "Cleared recent activity log.", "info");
  };

  const filteredModalEvents = events.filter((e) => {
    const matchesFilter = logFilter === "ALL" || e.type === logFilter;
    const matchesSearch =
      e.msg.toLowerCase().includes(logSearch.toLowerCase()) ||
      e.tag.toLowerCase().includes(logSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const latencyNum = parseFloat(metrics.latency);
  const latencyColor = latencyNum < 5 ? "#10b981" : latencyNum < 20 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="max-w-7xl mx-auto space-y-6"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      {/* ===== PAGE HEADER & QUICK ACTIONS ===== */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#f4f4f5" }}>
            Real-time Gateway Metrics
          </h1>
          <p className="text-sm mt-1" style={{ color: "#a1a1aa" }}>
            Live data from Warden · polling every 2 seconds.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Time range selector */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
            {(["1m", "5m", "15m", "1h"] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setTimeRange(r);
                  addToast("Time Range Updated", `Metrics window set to ${r}`, "info");
                }}
                className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                  timeRange === r ? "bg-zinc-800 text-zinc-100 font-bold" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={handleSimulateBurst}
            disabled={isSimulatingBurst}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Flame size={14} className={isSimulatingBurst ? "animate-bounce" : ""} />
            Simulate Attack Burst
          </button>

          <StatusBadge status={metrics.status} />

          <div
            className="text-xs px-3 py-1.5 rounded-md shrink-0"
            style={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              color: "#a1a1aa",
              fontFamily: "var(--font-jetbrains), monospace",
            }}
          >
            {clock ? `${clock} UTC` : "——:——:—— UTC"}
          </div>
        </div>
      </div>

      {/* ===== KPI CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Throughput */}
        <div
          className="p-5 rounded-lg flex flex-col group cursor-pointer transition-all hover:border-zinc-700"
          style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
          onClick={() => addToast("Global Throughput", `${metrics.throughput} total requests recorded`, "info")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: "#a1a1aa" }}>Total Requests</span>
            <Zap size={16} style={{ color: "#3f3f46" }} />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className="text-3xl font-semibold tabular-nums"
              style={{ color: "#f4f4f5", fontFamily: "var(--font-jetbrains), monospace" }}
            >
              {metrics.throughput.toLocaleString()}
            </span>
            <span className="text-sm" style={{ color: "#a1a1aa" }}>req</span>
          </div>
          <div className="flex items-center gap-2 mt-auto pt-3" style={{ borderTop: "1px solid #27272a" }}>
            <span className="flex items-center gap-1 text-xs" style={{ color: "#10b981" }}>
              <TrendingUp size={12} /> Live counter
            </span>
          </div>
        </div>

        {/* Avg Latency */}
        <div
          className="p-5 rounded-lg flex flex-col group cursor-pointer transition-all hover:border-zinc-700"
          style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
          onClick={() => addToast("Pipeline Latency", `Average latency is ${metrics.latency} ms`, "info")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: "#a1a1aa" }}>Avg Latency</span>
            <Clock size={16} style={{ color: "#3f3f46" }} />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className="text-3xl font-semibold tabular-nums"
              style={{ color: latencyColor, fontFamily: "var(--font-jetbrains), monospace" }}
            >
              {metrics.latency}
            </span>
            <span className="text-sm" style={{ color: "#a1a1aa" }}>ms</span>
          </div>
          <div className="flex items-center gap-2 mt-auto pt-3" style={{ borderTop: "1px solid #27272a" }}>
            <span className="flex items-center gap-1 text-xs" style={{ color: "#a1a1aa" }}>
              <Minus size={12} /> Avg per request
            </span>
          </div>
        </div>

        {/* Threats Blocked */}
        <div
          className="p-5 rounded-lg flex flex-col relative overflow-hidden group cursor-pointer transition-all hover:border-red-500/50"
          style={{ backgroundColor: "#18181b", border: "1px solid rgba(239,68,68,0.3)" }}
          onClick={() => addToast("Security Engine", `${metrics.threats} malicious requests blocked`, "error")}
        >
          <div className="absolute left-0 top-0 w-[3px] h-full" style={{ backgroundColor: "#ef4444" }} />
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: "#a1a1aa" }}>Threats Blocked</span>
            <ShieldOff size={16} style={{ color: "#ef4444" }} />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className="text-3xl font-semibold tabular-nums"
              style={{ color: "#ef4444", fontFamily: "var(--font-jetbrains), monospace" }}
            >
              {metrics.threats.toLocaleString()}
            </span>
            <span className="text-sm" style={{ color: "#a1a1aa" }}>blocked</span>
          </div>
          <div className="flex items-center gap-2 mt-auto pt-3" style={{ borderTop: "1px solid #27272a" }}>
            <span className="flex items-center gap-1 text-xs" style={{ color: "#ef4444" }}>
              <TrendingDown size={12} /> WAF Engine
            </span>
          </div>
        </div>

        {/* Rate Limit Drops */}
        <div
          className="p-5 rounded-lg flex flex-col relative overflow-hidden group cursor-pointer transition-all hover:border-amber-500/50"
          style={{ backgroundColor: "#18181b", border: "1px solid rgba(245,158,11,0.3)" }}
          onClick={() => addToast("Rate Limiter", `${metrics.rateLimitDrops} requests dropped by token bucket`, "info")}
        >
          <div className="absolute left-0 top-0 w-[3px] h-full" style={{ backgroundColor: "#f59e0b" }} />
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: "#a1a1aa" }}>Rate Limit Drops</span>
            <TrendingDown size={16} style={{ color: "#f59e0b" }} />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className="text-3xl font-semibold tabular-nums"
              style={{ color: "#f59e0b", fontFamily: "var(--font-jetbrains), monospace" }}
            >
              {metrics.rateLimitDrops.toLocaleString()}
            </span>
            <span className="text-sm" style={{ color: "#a1a1aa" }}>dropped</span>
          </div>
          <div className="flex items-center gap-2 mt-auto pt-3" style={{ borderTop: "1px solid #27272a" }}>
            <span className="flex items-center gap-1 text-xs" style={{ color: "#f59e0b" }}>
              <Minus size={12} /> Redis Token Bucket
            </span>
          </div>
        </div>
      </div>

      {/* ===== EVENT LOG + THREAT BREAKDOWN ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Live Event Stream */}
        <div
          className="lg:col-span-2 rounded-lg overflow-hidden"
          style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid #27272a" }}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>
                Live Event Stream
              </h2>
              <span
                className="text-[10px] px-2 py-0.5 rounded"
                style={{
                  color: "#10b981",
                  backgroundColor: "rgba(16,185,129,0.1)",
                  fontFamily: "var(--font-jetbrains), monospace",
                }}
              >
                ● 2s poll
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFlushEvents}
                className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
                title="Flush Log Buffer"
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={() => setShowLogModal(true)}
                className="flex items-center gap-1 text-xs text-blue-400 hover:underline cursor-pointer"
              >
                View all <ArrowUpRight size={12} />
              </button>
            </div>
          </div>

          <div>
            {events.slice(0, 4).map((evt, i) => (
              <HoverRow
                key={i}
                className="flex items-center gap-4 px-5 py-3"
                style={{ borderBottom: i < 3 ? "1px solid #1f1f23" : undefined }}
              >
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded shrink-0"
                  style={{
                    color: evt.color,
                    backgroundColor: evt.bg,
                    fontFamily: "var(--font-jetbrains), monospace",
                    letterSpacing: "0.08em",
                  }}
                >
                  {evt.type}
                </span>
                <span className="text-sm flex-1 truncate" style={{ color: "#d4d4d8" }}>{evt.msg}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded shrink-0"
                  style={{
                    backgroundColor: "#27272a",
                    color: "#a1a1aa",
                    fontFamily: "var(--font-jetbrains), monospace",
                  }}
                >
                  {evt.tag}
                </span>
                <span
                  className="text-xs shrink-0 tabular-nums"
                  style={{ color: "#71717a", fontFamily: "var(--font-jetbrains), monospace" }}
                >
                  {evt.time}
                </span>
              </HoverRow>
            ))}
          </div>
        </div>

        {/* Threat Breakdown */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
        >
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #27272a" }}>
            <h2 className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>Threat Breakdown</h2>
            <span className="text-xs text-zinc-500 font-mono">WAF v1</span>
          </div>

          <div className="p-5 space-y-4">
            {securityMetrics.map(({ label, pct, color }) => {
              const count = Math.round((pct / 100) * metrics.threats);
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs" style={{ color: "#a1a1aa" }}>{label}</span>
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{ color, fontFamily: "var(--font-jetbrains), monospace" }}
                    >
                      {count}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#27272a" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: metrics.threats > 0 ? `${pct}%` : "0%", backgroundColor: color, transition: "width 600ms ease" }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-3 mt-1" style={{ borderTop: "1px solid #27272a" }}>
              <p className="text-xs" style={{ color: "#a1a1aa", fontFamily: "var(--font-jetbrains), monospace" }}>
                Total blocks:{" "}
                <span style={{ color: "#ef4444", fontWeight: 600 }}>{metrics.threats.toLocaleString()}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PIPELINE HEALTH STRIP ===== */}
      <div
        className="rounded-lg p-5"
        style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>Pipeline Architecture & Health</h2>
          </div>
          <button
            onClick={() => setShowPipelineModal(true)}
            className="flex items-center gap-1 text-xs text-blue-400 hover:underline cursor-pointer"
          >
            View details <ArrowUpRight size={12} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {pipelineLayers.map(({ layer, latency }) => (
            <div
              key={layer}
              onClick={() => setShowPipelineModal(true)}
              className="flex flex-col gap-1.5 p-3 rounded-md cursor-pointer transition-all hover:border-blue-500/50"
              style={{ backgroundColor: "#09090b", border: "1px solid #27272a" }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: metrics.status === "online" ? "#10b981" : "#71717a" }}
                />
                <span className="text-[10px] font-medium" style={{ color: "#a1a1aa" }}>{layer}</span>
              </div>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: "#f4f4f5", fontFamily: "var(--font-jetbrains), monospace" }}
              >
                {latency}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== VIEW ALL LOGS MODAL ===== */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
              <h3 className="text-sm font-semibold">Gateway Event Log Explorer</h3>
              <button onClick={() => setShowLogModal(false)} className="text-zinc-400 hover:text-zinc-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 border-b border-zinc-800 flex items-center gap-3 bg-zinc-950/50">
              <Search size={16} className="text-zinc-500" />
              <input
                type="text"
                placeholder="Search log stream..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full text-zinc-100 placeholder:text-zinc-500"
              />
              <div className="flex gap-1">
                {["ALL", "THREAT", "RATE", "REQ"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      logFilter === f ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
              {filteredModalEvents.map((evt, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-zinc-950 border border-zinc-800/80">
                  <span className="text-zinc-500">{evt.time}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ color: evt.color, backgroundColor: evt.bg }}>
                    {evt.type}
                  </span>
                  <span className="flex-1 text-zinc-300 truncate">{evt.msg}</span>
                  <span className="text-zinc-500 border border-zinc-800 px-1.5 rounded">{evt.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== PIPELINE HEALTH MODAL ===== */}
      {showPipelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="text-blue-500" size={20} />
                <h3 className="text-base font-semibold">Middleware Sequence Architecture</h3>
              </div>
              <button onClick={() => setShowPipelineModal(false)} className="text-zinc-400 hover:text-zinc-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {pipelineLayers.map(({ layer, latency, desc }, idx) => (
                <div key={layer} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xs font-mono">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">{layer}Middleware</span>
                      <span className="text-xs font-mono text-emerald-400">{latency}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
