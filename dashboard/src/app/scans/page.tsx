"use client";

import { useState } from "react";
import {
  Search,
  ShieldAlert,
  AlertTriangle,
  Info,
  FileText,
  Download,
  Filter,
  Play,
  Copy,
  Check,
  Code2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { ToastContainer, ToastMessage } from "@/components/Toast";

interface Finding {
  id: string;
  type: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  endpoint: string;
  details: string;
  time: string;
  remediation: string;
}

const initialFindings: Finding[] = [
  {
    id: "VULN-001",
    type: "BOLA / IDOR Vulnerability",
    severity: "Critical",
    endpoint: "GET /api/documents/{id}",
    details:
      "User B successfully accessed User A's resource (999) without authorization (HTTP 200).",
    time: "2 mins ago",
    remediation: `// Fix BOLA/IDOR by validating owner ID in SQL/DB query:
func GetDocumentHandler(w http.ResponseWriter, r *http.Request) {
    userID := r.Context().Value("user_id").(string)
    docID := chi.URLParam(r, "id")
    
    doc, err := db.FindDocumentByIDAndOwner(docID, userID)
    if err != nil {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }
    json.NewEncoder(w).Encode(doc)
}`,
  },
  {
    id: "VULN-002",
    type: "Missing Authentication",
    severity: "High",
    endpoint: "POST /api/internal/config",
    details:
      "Endpoint returned HTTP 200 without valid Bearer authentication tokens.",
    time: "15 mins ago",
    remediation: `// Require Authentication Middleware:
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if token == "" || !strings.HasPrefix(token, "Bearer ") {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r)
    })
}`,
  },
  {
    id: "VULN-003",
    type: "Missing Rate Limiting",
    severity: "Medium",
    endpoint: "POST /api/users/login",
    details:
      "Fired 50 concurrent requests but received no HTTP 429 Too Many Requests responses.",
    time: "1 hour ago",
    remediation: `// Enable Redis-backed Token Bucket Rate Limiting:
limiter := ratelimit.NewRedisLimiter(redisClient, 100, time.Minute)
router.Use(limiter.Middleware)`,
  },
  {
    id: "VULN-004",
    type: "Information Disclosure",
    severity: "Low",
    endpoint: "GET /api/health",
    details:
      "Server header leaks backend technology stack version (Express 4.17.1).",
    time: "2 hours ago",
    remediation: `// Strip Server Header in Gateway Middleware:
w.Header().Del("Server")
w.Header().Del("X-Powered-By")`,
  },
];

export default function ScansPage() {
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("All");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTabMap, setActiveTabMap] = useState<Record<string, "details" | "remediation">>({});
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Scanning simulation modal state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);

  // Toast system
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, description?: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Handle Export JSON
  const handleExportJSON = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      leadAnalyst: "Bhushan Wayal",
      tool: "Warden Active OpenAPI Security Scanner v1.0",
      totalFindings: findings.length,
      findings: findings,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `warden-vulnerability-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast("Export Successful", "Downloaded warden-vulnerability-report.json", "success");
  };

  // Handle Copy to Clipboard
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    addToast("Copied to Clipboard", `${label}: ${text}`, "info");
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Handle Run Active Scan
  const handleRunScan = () => {
    setIsScanning(true);
    setScanStep(1);
    setScanProgress(15);

    const steps = [
      { step: 1, progress: 25, title: "Parsing OpenAPI specification (swagger.json)..." },
      { step: 2, progress: 50, title: "Testing missing authentication on 14 endpoints..." },
      { step: 3, progress: 75, title: "Firing BOLA cross-token resource access vectors..." },
      { step: 4, progress: 90, title: "Measuring concurrent rate limit enforcement..." },
      { step: 5, progress: 100, title: "Scan Complete! Aggregating report..." },
    ];

    let index = 0;
    const interval = setInterval(() => {
      index++;
      if (index < steps.length) {
        setScanStep(steps[index].step);
        setScanProgress(steps[index].progress);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsScanning(false);
          // Add a new discovered finding
          const newFinding: Finding = {
            id: `VULN-00${findings.length + 1}`,
            type: "Unrestricted File Upload",
            severity: "High",
            endpoint: "POST /api/user/avatar",
            details:
              "Endpoint accepts executable script files (.php, .sh) without MIME-type or extension validation.",
            time: "Just now",
            remediation: `// Enforce Strict MIME Validation & Extension Whitelisting:
allowedTypes := map[string]bool{"image/png": true, "image/jpeg": true}
if !allowedTypes[fileHeader.Header.Get("Content-Type")] {
    http.Error(w, "Invalid File Format", http.StatusBadRequest)
    return
}`,
          };
          setFindings((prev) => [newFinding, ...prev]);
          addToast(
            "Security Scan Complete",
            `Discovered 1 new High severity vulnerability (${newFinding.endpoint})`,
            "error"
          );
        }, 800);
      }
    }, 1000);
  };

  // Filter logic
  const filteredFindings = findings.filter((f) => {
    const matchesSearch =
      f.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity =
      severityFilter === "All" || f.severity === severityFilter;

    const matchesMethod =
      methodFilter === "ALL" ||
      f.endpoint.toUpperCase().startsWith(methodFilter);

    return matchesSearch && matchesSeverity && matchesMethod;
  });

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "Critical":
        return {
          color: "#ef4444",
          backgroundColor: "rgba(239,68,68,0.10)",
          border: "1px solid rgba(239,68,68,0.25)",
        };
      case "High":
        return {
          color: "#f59e0b",
          backgroundColor: "rgba(245,158,11,0.10)",
          border: "1px solid rgba(245,158,11,0.25)",
        };
      case "Medium":
        return {
          color: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.10)",
          border: "1px solid rgba(59,130,246,0.25)",
        };
      default:
        return {
          color: "#a1a1aa",
          backgroundColor: "rgba(161,161,170,0.08)",
          border: "1px solid #27272a",
        };
    }
  };

  const getSeverityIcon = (severity: string) => {
    const props = { size: 13, strokeWidth: 2 };
    switch (severity) {
      case "Critical":
        return <ShieldAlert {...props} />;
      case "High":
        return <AlertTriangle {...props} />;
      case "Medium":
        return <Info {...props} />;
      default:
        return <FileText {...props} />;
    }
  };

  const counts = {
    All: findings.length,
    Critical: findings.filter((f) => f.severity === "Critical").length,
    High: findings.filter((f) => f.severity === "High").length,
    Medium: findings.filter((f) => f.severity === "Medium").length,
    Low: findings.filter((f) => f.severity === "Low").length,
  };

  return (
    <div
      className="max-w-7xl mx-auto space-y-6"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      {/* ===== HEADER ===== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "#f4f4f5" }}
          >
            Vulnerability Scan Reports
          </h1>
          <p className="text-sm mt-1" style={{ color: "#a1a1aa" }}>
            Automated security audit findings generated by Warden active scanner.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Lead analyst tag */}
          <div
            className="text-right hidden md:block mr-1 pr-4"
            style={{ borderRight: "1px solid #27272a" }}
          >
            <p
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "#71717a", fontFamily: "var(--font-jetbrains), monospace" }}
            >
              Lead Analyst
            </p>
            <p className="text-sm font-medium" style={{ color: "#f4f4f5" }}>
              Bhushan Wayal
            </p>
          </div>

          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: showFilterDrawer ? "#27272a" : "#18181b",
              border: "1px solid #27272a",
              color: showFilterDrawer ? "#f4f4f5" : "#a1a1aa",
              cursor: "pointer",
            }}
          >
            <Filter size={14} />
            Filter
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all hover:opacity-90 active:scale-95"
            style={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              color: "#f4f4f5",
              cursor: "pointer",
            }}
          >
            <Download size={14} className="text-blue-400" />
            Export JSON
          </button>

          <button
            onClick={handleRunScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              cursor: isScanning ? "not-allowed" : "pointer",
              boxShadow: "0 0 12px rgba(37,99,235,0.3)",
            }}
          >
            {isScanning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            {isScanning ? "Scanning..." : "Run Active Scan"}
          </button>
        </div>
      </div>

      {/* ===== INTERACTIVE SEVERITY FILTER PILLS ===== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(["All", "Critical", "High", "Medium", "Low"] as const).map((sev) => {
          const isSelected = severityFilter === sev;
          const count = counts[sev];
          return (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
              style={{
                backgroundColor: isSelected ? "#27272a" : "#18181b",
                color: isSelected ? "#f4f4f5" : "#a1a1aa",
                border: isSelected ? "1px solid #52525b" : "1px solid #27272a",
              }}
            >
              <span>{sev}</span>
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
                style={{
                  backgroundColor: isSelected ? "#3f3f46" : "#09090b",
                  color: isSelected ? "#f4f4f5" : "#71717a",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===== EXPANDABLE FILTER DRAWER ===== */}
      {showFilterDrawer && (
        <div
          className="p-4 rounded-lg space-y-3 animate-in fade-in"
          style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#a1a1aa", fontFamily: "var(--font-jetbrains), monospace" }}
            >
              Advanced Filters
            </span>
            <button
              onClick={() => {
                setSeverityFilter("All");
                setMethodFilter("ALL");
                setSearchTerm("");
              }}
              className="text-xs text-blue-400 hover:underline cursor-pointer"
            >
              Reset All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">HTTP Method</label>
              <div className="flex gap-2">
                {["ALL", "GET", "POST"].map((method) => (
                  <button
                    key={method}
                    onClick={() => setMethodFilter(method)}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                      methodFilter === method
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Report Status</label>
              <div className="text-xs text-zinc-400 pt-1 font-mono">
                Showing {filteredFindings.length} of {findings.length} findings
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN DATA TABLE ===== */}
      <div
        className="rounded-lg overflow-hidden shadow-xl"
        style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
      >
        {/* Search bar */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            borderBottom: "1px solid #27272a",
            backgroundColor: "rgba(9,9,11,0.5)",
          }}
        >
          <Search size={16} style={{ color: "#52525b", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by type, endpoint, ID, or parameters..."
            className="bg-transparent border-none outline-none text-sm w-full"
            style={{
              color: "#f4f4f5",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-xs shrink-0 hover:text-zinc-200"
              style={{ color: "#71717a", background: "none", border: "none", cursor: "pointer" }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #27272a", backgroundColor: "rgba(39,39,42,0.3)" }}>
                {["Severity", "Vulnerability Type", "Target Endpoint", "Detected", "ID", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "#71717a", fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredFindings.map((finding, i) => {
                const style = getSeverityStyle(finding.severity);
                const isExpanded = expandedId === finding.id;
                const activeTab = activeTabMap[finding.id] || "details";
                const isLast = i === filteredFindings.length - 1;

                return (
                  <tr key={finding.id} className="contents">
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                      style={{
                        borderBottom: isLast && !isExpanded ? "none" : "1px solid #1f1f23",
                        cursor: "pointer",
                        backgroundColor: isExpanded ? "#1c1c1f" : "transparent",
                        transition: "background-color 150ms",
                      }}
                      className="hover:bg-zinc-800/40"
                    >
                      {/* Severity badge */}
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={style}
                        >
                          {getSeverityIcon(finding.severity)}
                          {finding.severity}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4 text-sm font-medium" style={{ color: "#e4e4e7" }}>
                        {finding.type}
                      </td>

                      {/* Endpoint */}
                      <td className="px-5 py-4">
                        <code
                          className="text-xs px-2 py-1 rounded inline-flex items-center gap-1"
                          style={{
                            backgroundColor: "#09090b",
                            border: "1px solid #27272a",
                            color: "#a1a1aa",
                            fontFamily: "var(--font-jetbrains), monospace",
                          }}
                        >
                          {finding.endpoint}
                        </code>
                      </td>

                      {/* Time */}
                      <td
                        className="px-5 py-4 text-xs"
                        style={{ color: "#71717a", fontFamily: "var(--font-jetbrains), monospace" }}
                      >
                        {finding.time}
                      </td>

                      {/* ID */}
                      <td
                        className="px-5 py-4 text-xs"
                        style={{ color: "#52525b", fontFamily: "var(--font-jetbrains), monospace" }}
                      >
                        {finding.id}
                      </td>

                      {/* Action trigger */}
                      <td className="px-5 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(finding.endpoint, "Endpoint");
                          }}
                          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                          title="Copy Endpoint"
                        >
                          {copiedText === finding.endpoint ? (
                            <Check size={14} className="text-emerald-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* ── Expanded detail card ── */}
                    {isExpanded && (
                      <tr
                        style={{
                          borderBottom: isLast ? "none" : "1px solid #27272a",
                          backgroundColor: "#09090b",
                        }}
                      >
                        <td colSpan={6} className="p-5">
                          <div className="space-y-4 rounded-lg p-4 border border-zinc-800 bg-zinc-950">
                            {/* Tabs */}
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <div className="flex gap-4">
                                <button
                                  onClick={() =>
                                    setActiveTabMap((prev) => ({
                                      ...prev,
                                      [finding.id]: "details",
                                    }))
                                  }
                                  className={`text-xs font-semibold pb-2 border-b-2 transition-colors ${
                                    activeTab === "details"
                                      ? "border-blue-500 text-blue-400"
                                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                                  }`}
                                >
                                  Finding Overview
                                </button>
                                <button
                                  onClick={() =>
                                    setActiveTabMap((prev) => ({
                                      ...prev,
                                      [finding.id]: "remediation",
                                    }))
                                  }
                                  className={`text-xs font-semibold pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
                                    activeTab === "remediation"
                                      ? "border-emerald-500 text-emerald-400"
                                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                                  }`}
                                >
                                  <Code2 size={13} /> Remediation Code Fix
                                </button>
                              </div>

                              <button
                                onClick={() => handleCopy(finding.id, "ID")}
                                className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-mono"
                              >
                                <Copy size={12} /> {finding.id}
                              </button>
                            </div>

                            {/* Tab Content */}
                            {activeTab === "details" ? (
                              <div className="space-y-2">
                                <p className="text-xs text-zinc-400 font-mono">
                                  Description & Technical Impact:
                                </p>
                                <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-900/60 p-3 rounded border border-zinc-800">
                                  {finding.details}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                                  <CheckCircle2 size={13} /> Recommended Code Fix:
                                </p>
                                <pre className="text-xs p-3.5 rounded bg-zinc-900 border border-zinc-800 text-emerald-300 font-mono overflow-x-auto leading-relaxed">
                                  {finding.remediation}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty state */}
          {filteredFindings.length === 0 && (
            <div className="py-16 flex flex-col items-center gap-3 text-zinc-500">
              <ShieldAlert size={40} strokeWidth={1} className="opacity-30" />
              <p className="text-sm">No vulnerabilities match your search criteria.</p>
              <button
                className="text-xs text-blue-400 hover:underline"
                onClick={() => {
                  setSearchTerm("");
                  setSeverityFilter("All");
                  setMethodFilter("ALL");
                }}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Table footer */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid #27272a" }}
        >
          <span
            className="text-xs"
            style={{ color: "#52525b", fontFamily: "var(--font-jetbrains), monospace" }}
          >
            {filteredFindings.length} of {findings.length} findings shown
          </span>
          <span
            className="text-xs"
            style={{ color: "#52525b", fontFamily: "var(--font-jetbrains), monospace" }}
          >
            Source: warden-report.json · Phase 5 Active Scanner
          </span>
        </div>
      </div>

      {/* ===== ACTIVE SCAN SIMULATION MODAL ===== */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span>Running Warden Active Scanner</span>
              </div>
              <span className="text-xs font-mono text-blue-400 font-bold">{scanProgress}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${scanProgress}%` }}
              />
            </div>

            {/* Step Terminal */}
            <div className="p-3 rounded bg-zinc-950 border border-zinc-800 font-mono text-xs space-y-1.5">
              <div className={scanStep >= 1 ? "text-emerald-400" : "text-zinc-600"}>
                {scanStep >= 1 ? "✓" : "○"} Parsing OpenAPI spec (swagger.json)
              </div>
              <div className={scanStep >= 2 ? "text-emerald-400" : "text-zinc-600"}>
                {scanStep >= 2 ? "✓" : "○"} Testing unauthenticated endpoints
              </div>
              <div className={scanStep >= 3 ? "text-emerald-400" : "text-zinc-600"}>
                {scanStep >= 3 ? "✓" : "○"} Injecting BOLA/IDOR cross-user tokens
              </div>
              <div className={scanStep >= 4 ? "text-emerald-400" : "text-zinc-600"}>
                {scanStep >= 4 ? "✓" : "○"} Executing rate limit burst test
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
