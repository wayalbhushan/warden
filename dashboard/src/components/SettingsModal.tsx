"use client";

import { useState } from "react";
import { X, Server, Shield, Bell, Save, RefreshCw } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToast: (title: string, desc: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  onSaveToast,
}: SettingsModalProps) {
  const [targetUrl, setTargetUrl] = useState("http://localhost:8080");
  const [metricsUrl, setMetricsUrl] = useState("http://localhost:9090");
  const [pollingRate, setPollingRate] = useState("2000");
  const [wafStrictness, setWafStrictness] = useState("balanced");
  const [rateLimitCapacity, setRateLimitCapacity] = useState("100");
  const [autoBlock, setAutoBlock] = useState(true);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveToast(
      "Configuration Saved",
      `Target set to ${targetUrl} · WAF Mode: ${wafStrictness.toUpperCase()}`
    );
    onClose();
  };

  const handleReset = () => {
    setTargetUrl("http://localhost:8080");
    setMetricsUrl("http://localhost:9090");
    setPollingRate("2000");
    setWafStrictness("balanced");
    setRateLimitCapacity("100");
    setAutoBlock(true);
    onSaveToast("Defaults Restored", "All settings reset to baseline configuration.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-2xl overflow-hidden"
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-500" size={18} />
            <h3 className="text-base font-semibold">Gateway & Cluster Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 transition-colors p-1 rounded-md hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Target Cluster */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Server size={14} /> Target Reverse Proxy URL
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Metrics URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Bell size={14} /> Prometheus Telemetry Endpoint
            </label>
            <input
              type="text"
              value={metricsUrl}
              onChange={(e) => setMetricsUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Grid: Polling Rate & Rate Limit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Telemetry Poll Rate
              </label>
              <select
                value={pollingRate}
                onChange={(e) => setPollingRate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="1000">1 Second (Realtime)</option>
                <option value="2000">2 Seconds (Default)</option>
                <option value="5000">5 Seconds</option>
                <option value="10000">10 Seconds</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Rate Limit Cap / min
              </label>
              <input
                type="number"
                value={rateLimitCapacity}
                onChange={(e) => setRateLimitCapacity(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Security Sensitivity Radio */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
              WAF Security Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "permissive", label: "Permissive", desc: "Log Only" },
                { id: "balanced", label: "Balanced", desc: "Block High" },
                { id: "strict", label: "Strict", desc: "Zero Trust" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setWafStrictness(mode.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    wafStrictness === mode.id
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <span className="text-xs font-semibold block">{mode.label}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{mode.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Auto-block Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <div>
              <span className="text-xs font-medium block text-zinc-200">
                Automated IP Threat Blacklisting
              </span>
              <span className="text-[10px] text-zinc-500">
                Immediately block IPs exceeding 5 threat violations
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAutoBlock(!autoBlock)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                autoBlock ? "bg-emerald-500" : "bg-zinc-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  autoBlock ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <RefreshCw size={13} /> Reset Defaults
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors"
              >
                <Save size={13} /> Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
