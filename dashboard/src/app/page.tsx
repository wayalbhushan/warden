import { TrendingUp, TrendingDown, Minus, Clock, Zap, ShieldOff, ArrowUpRight } from "lucide-react";
import { HoverRow } from "./components";

const kpiCards = [
  {
    label: "Global Throughput",
    value: "8,493",
    unit: "req/s",
    trend: "+12%",
    trendDir: "up" as const,
    sub: "vs. 7,578 direct baseline",
    color: "#f4f4f5",
    accent: null as string | null,
    icon: Zap,
  },
  {
    label: "Avg Latency Overhead",
    value: "3.3",
    unit: "ms",
    trend: "stable",
    trendDir: "flat" as const,
    sub: "p99 at 44.7 ms end-to-end",
    color: "#3b82f6",
    accent: null as string | null,
    icon: Clock,
  },
  {
    label: "Threats Blocked",
    value: "142",
    unit: "in last hour",
    trend: "+3",
    trendDir: "down" as const,
    sub: "Latest: SQLi · 17:34:40 UTC",
    color: "#ef4444",
    accent: "#ef4444",
    icon: ShieldOff,
  },
];

const recentEvents = [
  { time: "17:34:40", type: "THREAT", color: "#ef4444", bg: "rgba(239,68,68,0.08)", msg: "security threat detected and blocked", tag: "SQLi" },
  { time: "17:34:16", type: "RATE",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)", msg: "rate limit exceeded — request dropped", tag: "429" },
  { time: "17:34:09", type: "INFO",   color: "#3b82f6", bg: "rgba(59,130,246,0.08)", msg: "Warden gateway server started", tag: "BOOT" },
  { time: "17:34:09", type: "OK",     color: "#10b981", bg: "rgba(16,185,129,0.08)", msg: "Prometheus telemetry server started", tag: "OBS" },
];

const securityMetrics = [
  { label: "SQLi Blocks",   value: "89", pct: 62, color: "#ef4444" },
  { label: "SSRF Attempts", value: "31", pct: 21, color: "#f59e0b" },
  { label: "BOLA / IDOR",   value: "22", pct: 15, color: "#a855f7" },
  { label: "Cmd Injection", value: "0",  pct: 0,  color: "#10b981" },
];

const pipelineLayers = [
  { layer: "Metrics",   latency: "~0.1ms" },
  { layer: "RateLimit", latency: "~0.8ms" },
  { layer: "Auth",      latency: "~0.4ms" },
  { layer: "Security",  latency: "~2.0ms" },
  { layer: "Proxy",     latency: "~6.5ms" },
];

export default function Dashboard() {
  return (
    <div
      className="max-w-7xl mx-auto space-y-6"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      {/* ===== PAGE HEADER ===== */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#f4f4f5" }}>
            Real-time Gateway Metrics
          </h1>
          <p className="text-sm mt-1" style={{ color: "#a1a1aa" }}>
            Monitoring throughput, latency, and active threat mitigation across all pipeline layers.
          </p>
        </div>
        <div
          className="text-xs px-3 py-1.5 rounded-md shrink-0"
          style={{
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            color: "#a1a1aa",
            fontFamily: "var(--font-jetbrains), monospace",
          }}
        >
          Last updated: 17:34:40 UTC
        </div>
      </div>

      {/* ===== KPI CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiCards.map(({ label, value, unit, trend, trendDir, sub, color, accent, icon: Icon }) => (
          <div
            key={label}
            className="p-5 rounded-lg flex flex-col relative overflow-hidden"
            style={{
              backgroundColor: "#18181b",
              border: `1px solid ${accent ? `${accent}40` : "#27272a"}`,
            }}
          >
            {accent && (
              <div
                className="absolute left-0 top-0 w-[3px] h-full"
                style={{ backgroundColor: accent }}
              />
            )}

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: "#a1a1aa" }}>{label}</span>
              <Icon size={16} style={{ color: "#3f3f46" }} />
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span
                className="text-3xl font-semibold tabular-nums"
                style={{ color, fontFamily: "var(--font-jetbrains), monospace" }}
              >
                {value}
              </span>
              <span className="text-sm" style={{ color: "#a1a1aa" }}>{unit}</span>
            </div>

            <div
              className="flex items-center gap-2 mt-auto pt-3"
              style={{ borderTop: "1px solid #27272a" }}
            >
              {trendDir === "up" && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "#10b981" }}>
                  <TrendingUp size={12} /> {trend}
                </span>
              )}
              {trendDir === "down" && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "#ef4444" }}>
                  <TrendingDown size={12} /> {trend}
                </span>
              )}
              {trendDir === "flat" && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "#a1a1aa" }}>
                  <Minus size={12} /> {trend}
                </span>
              )}
              <span className="text-xs" style={{ color: "#71717a" }}>{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ===== EVENT LOG + THREAT BREAKDOWN ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Events */}
        <div
          className="lg:col-span-2 rounded-lg overflow-hidden"
          style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid #27272a" }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>Recent Events</h2>
            <button className="flex items-center gap-1 text-xs" style={{ color: "#a1a1aa", background: "none", border: "none", cursor: "pointer" }}>
              View all <ArrowUpRight size={12} />
            </button>
          </div>

          <div>
            {recentEvents.map((evt, i) => (
              <HoverRow
                key={i}
                className="flex items-center gap-4 px-5 py-3"
                style={{ borderBottom: i < recentEvents.length - 1 ? "1px solid #27272a" : undefined }}
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
            {securityMetrics.map(({ label, value, pct, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: "#a1a1aa" }}>{label}</span>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color, fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {value}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#27272a" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-3 mt-1" style={{ borderTop: "1px solid #27272a" }}>
              <p className="text-xs" style={{ color: "#a1a1aa", fontFamily: "var(--font-jetbrains), monospace" }}>
                Total blocks:{" "}
                <span style={{ color: "#ef4444", fontWeight: 600 }}>142</span>
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
        <h2 className="text-sm font-semibold mb-4" style={{ color: "#f4f4f5" }}>
          Pipeline Health
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {pipelineLayers.map(({ layer, latency }) => (
            <div
              key={layer}
              className="flex flex-col gap-1.5 p-3 rounded-md"
              style={{ backgroundColor: "#09090b", border: "1px solid #27272a" }}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#10b981" }} />
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
