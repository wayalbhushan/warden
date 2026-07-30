"use client";

import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Minus, Clock, Zap, ShieldOff, ArrowUpRight, Wifi, WifiOff } from "lucide-react";
import { HoverRow } from "./components";

interface Metrics {
  throughput: number;
  latency: string;
  threats: number;
  rateLimitDrops: number;
  status: "online" | "offline" | "connecting";
}

const securityMetrics = [
  { label: "SQLi Blocks",    key: "sqli",  pct: 62, color: "#ef4444" },
  { label: "SSRF Attempts",  key: "ssrf",  pct: 21, color: "#f59e0b" },
  { label: "BOLA / IDOR",    key: "bola",  pct: 15, color: "#a855f7" },
  { label: "Cmd Injection",  key: "cmd",   pct: 0,  color: "#10b981" },
];

const pipelineLayers = [
  { layer: "Metrics",    latency: "~0.1ms" },
  { layer: "RateLimit",  latency: "~0.8ms" },
  { layer: "Auth",       latency: "~0.4ms" },
  { layer: "Security",   latency: "~2.0ms" },
  { layer: "Proxy",      latency: "~6.5ms" },
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
    throughput: 0, latency: "0.00", threats: 0, rateLimitDrops: 0, status: "connecting",
  });
  const [events, setEvents] = useState([
    { time: "—", type: "INFO",   color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  msg: "Dashboard initializing…",  tag: "INIT" },
  ]);
  // null on SSR → populated client-side to avoid hydration mismatch
  const [clock, setClock] = useState<string | null>(null);
  const prevRef = useRef<Metrics | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch("/api/metrics");
        const data: Metrics = await res.json();
        const prev = prevRef.current;

        // Append an event entry if a meaningful change is detected
        if (prev && data.status === "online") {
          const nowStr = new Date().toLocaleTimeString("en-GB", { hour12: false });
          if (data.threats > (prev.threats ?? 0)) {
            setEvents((e) => [
              { time: nowStr, type: "THREAT", color: "#ef4444", bg: "rgba(239,68,68,0.08)", msg: "new security threat blocked", tag: "WAF" },
              ...e.slice(0, 9),
            ]);
          } else if (data.rateLimitDrops > (prev.rateLimitDrops ?? 0)) {
            setEvents((e) => [
              { time: nowStr, type: "RATE", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", msg: "rate limit exceeded — request dropped", tag: "429" },
              ...e.slice(0, 9),
            ]);
          } else if (data.throughput > (prev.throughput ?? 0)) {
            setEvents((e) => [
              { time: nowStr, type: "OK", color: "#10b981", bg: "rgba(16,185,129,0.08)", msg: `gateway processed request · avg ${data.latency}ms`, tag: "REQ" },
              ...e.slice(0, 9),
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

    // Clock — only runs client-side, safe from SSR mismatch
    const tick = () =>
      setClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const clockId = setInterval(tick, 1000);

    return () => {
      clearInterval(id);
      clearInterval(clockId);
    };
  }, []);

  const latencyNum = parseFloat(metrics.latency);
  const latencyColor = latencyNum < 5 ? "#10b981" : latencyNum < 20 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="max-w-7xl mx-auto space-y-6"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      {/* ===== PAGE HEADER ===== */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#f4f4f5" }}>
            Real-time Gateway Metrics
          </h1>
          <p className="text-sm mt-1" style={{ color: "#a1a1aa" }}>
            Live data from Warden · polling every 2 seconds.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          className="p-5 rounded-lg flex flex-col"
          style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
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
          className="p-5 rounded-lg flex flex-col"
          style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
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
          className="p-5 rounded-lg flex flex-col relative overflow-hidden"
          style={{ backgroundColor: "#18181b", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          <div className="absolute left-0 top-0 w-[3px] h-full" style={{ backgroundColor: "#ef4444" }} />
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: "#a1a1aa" }}>Threats Blocked</span>
            <ShieldOff size={16} style={{ color: "#3f3f46" }} />
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
              <TrendingDown size={12} /> Security engine
            </span>
          </div>
        </div>

        {/* Rate Limit Drops */}
        <div
          className="p-5 rounded-lg flex flex-col relative overflow-hidden"
          style={{ backgroundColor: "#18181b", border: "1px solid rgba(245,158,11,0.3)" }}
        >
          <div className="absolute left-0 top-0 w-[3px] h-full" style={{ backgroundColor: "#f59e0b" }} />
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: "#a1a1aa" }}>Rate Limit Drops</span>
            <TrendingDown size={16} style={{ color: "#3f3f46" }} />
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
              <Minus size={12} /> Token bucket
            </span>
          </div>
        </div>
      </div>

      {/* ===== EVENT LOG + THREAT BREAKDOWN ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Live Event Log */}
        <div
          className="lg:col-span-2 rounded-lg overflow-hidden"
          style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid #27272a" }}
          >
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
          <div>
            {events.map((evt, i) => (
              <HoverRow
                key={i}
                className="flex items-center gap-4 px-5 py-3"
                style={{ borderBottom: i < events.length - 1 ? "1px solid #1f1f23" : undefined }}
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
          <div className="px-5 py-3" style={{ borderBottom: "1px solid #27272a" }}>
            <h2 className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>Threat Breakdown</h2>
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
          <h2 className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>Pipeline Health</h2>
          <button
            className="flex items-center gap-1 text-xs"
            style={{ color: "#a1a1aa", background: "none", border: "none", cursor: "pointer" }}
          >
            View details <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {pipelineLayers.map(({ layer, latency }) => (
            <div
              key={layer}
              className="flex flex-col gap-1.5 p-3 rounded-md"
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
    </div>
  );
}
