export default function Dashboard() {
  return (
    <div className="p-6 md:p-12">
      {/* ===== PAGE TITLE ===== */}
      <div className="mb-12 border-b-8 border-black pb-6">
        <h2
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none"
        >
          Live Telemetry
        </h2>
      </div>

      {/* ===== STATS GRID ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 border-t-2 border-l-2 border-black">
        <div
          className="border-r-2 border-b-2 border-black p-8 bg-white hover:bg-black hover:text-white cursor-default"
          style={{ transition: "none" }}
        >
          <p
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            className="text-xs tracking-widest uppercase mb-4 opacity-70"
          >
            Requests / Sec
          </p>
          <p
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            className="text-6xl font-black"
          >
            8,493
          </p>
        </div>

        <div
          className="border-r-2 border-b-2 border-black p-8 bg-white hover:bg-black hover:text-white cursor-default"
          style={{ transition: "none" }}
        >
          <p
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            className="text-xs tracking-widest uppercase mb-4 opacity-70"
          >
            Avg Latency Overhead
          </p>
          <p
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            className="text-6xl font-black"
          >
            3.3
            <span className="text-3xl ml-2">ms</span>
          </p>
        </div>

        <div
          className="border-r-2 border-b-2 border-black p-8 bg-white hover:bg-black hover:text-white cursor-default"
          style={{ transition: "none" }}
        >
          <p
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            className="text-xs tracking-widest uppercase mb-4 opacity-70"
          >
            Active Threats Blocked
          </p>
          <p
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            className="text-6xl font-black"
          >
            142
          </p>
        </div>
      </div>

      {/* ===== SECONDARY GRID ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-l-2 border-black mt-0">
        <div
          className="border-r-2 border-b-2 border-black p-8 bg-white hover:bg-black hover:text-white cursor-default"
          style={{ transition: "none" }}
        >
          <p
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            className="text-xs tracking-widest uppercase mb-4 opacity-70"
          >
            Rate Limit Drops
          </p>
          <p
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            className="text-6xl font-black"
          >
            3
          </p>
        </div>

        <div
          className="border-r-2 border-b-2 border-black p-8 bg-white hover:bg-black hover:text-white cursor-default"
          style={{ transition: "none" }}
        >
          <p
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            className="text-xs tracking-widest uppercase mb-4 opacity-70"
          >
            p99 Gateway Latency
          </p>
          <p
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            className="text-6xl font-black"
          >
            44.7
            <span className="text-3xl ml-2">ms</span>
          </p>
        </div>
      </div>

      {/* ===== SYSTEM LOG STRIP ===== */}
      <div className="border-2 border-t-0 border-black mt-0 p-6">
        <p
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          className="text-xs uppercase tracking-widest mb-4 opacity-60"
        >
          Recent Events
        </p>
        <div className="space-y-2">
          {[
            { time: "17:34:40", msg: "security threat detected and blocked", tag: "THREAT", label: "SQLi" },
            { time: "17:34:16", msg: "rate limit exceeded", tag: "RATE", label: "::1" },
            { time: "17:34:09", msg: "gateway server started", tag: "INFO", label: "port 8080" },
          ].map((evt, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border border-black p-3 hover:bg-black hover:text-white cursor-default"
              style={{ transition: "none" }}
            >
              <span
                style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                className="text-xs opacity-50 shrink-0"
              >
                {evt.time}
              </span>
              <span
                className="text-[10px] border border-current px-2 py-0.5 uppercase tracking-widest shrink-0"
                style={{ fontFamily: "var(--font-jetbrains), monospace" }}
              >
                {evt.tag}
              </span>
              <span
                style={{ fontFamily: "var(--font-source-serif), Georgia, serif" }}
                className="text-sm flex-1"
              >
                {evt.msg}
              </span>
              <span
                style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                className="text-xs opacity-50 shrink-0"
              >
                {evt.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
