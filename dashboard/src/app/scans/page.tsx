export default function ScansPage() {
  return (
    <div
      className="flex items-center justify-center h-full"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <div className="text-center space-y-4 max-w-md">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
        >
          <span style={{ color: "#3b82f6", fontSize: "20px" }}>🔍</span>
        </div>
        <h1 className="text-xl font-semibold" style={{ color: "#f4f4f5" }}>
          Vulnerability Scan Reports
        </h1>
        <p className="text-sm" style={{ color: "#a1a1aa" }}>
          Active scanner results and audit history will appear here.
        </p>
        <div
          className="inline-block px-3 py-1.5 rounded text-xs"
          style={{
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            color: "#a1a1aa",
            fontFamily: "var(--font-jetbrains), monospace",
          }}
        >
          Connecting in Task 8.3...
        </div>
      </div>
    </div>
  );
}
