"use client";
import { formatINR } from "@/lib/utils";

export function PageHeader({ icon, title, sub, color = "#6366f1", children }: {
  icon: string; title: string; sub?: string; color?: string; children?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `${color}14`,
          border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color, fontSize: "1.1rem",
        }}>
          <i className={icon} />
        </div>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text1)" }}>{title}</h1>
          {sub && <p style={{ color: "var(--text3)", fontSize: "0.85rem", marginTop: 2 }}>{sub}</p>}
        </div>
      </div>
      {children && <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>{children}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, sub, color = "#6366f1", live, trend }: {
  icon: string; label: string; value: string | number; sub?: string;
  color?: string; live?: boolean; trend?: number;
}) {
  return (
    <div className="card" style={{ padding: "1.25rem 1.4rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span className="stat-label">{label}</span>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: `${color}12`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color, fontSize: "0.85rem", flexShrink: 0,
        }}>
          <i className={icon} />
        </div>
      </div>
      <div className="stat-value">{typeof value === "number" ? formatINR(value) : value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        {sub && <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>{sub}</span>}
        {live && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.68rem", color: "var(--green)", fontWeight: 600 }}>
            <span className="live-dot" /> Live
          </span>
        )}
        {trend !== undefined && (
          <span style={{ fontSize: "0.75rem", color: trend >= 0 ? "var(--green)" : "var(--red)", marginLeft: "auto", fontWeight: 600 }}>
            <i className={`fas fa-arrow-${trend >= 0 ? "up" : "down"}`} style={{ fontSize: "0.6rem", marginRight: 3 }} />
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function Loading({ text = "Loading..." }: { text?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", gap: 12 }}>
      <div className="spinner" />
      <span style={{ color: "var(--text3)", fontSize: "0.85rem" }}>{text}</span>
    </div>
  );
}

export function Empty({ icon, title, sub, action }: { icon: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: "4rem 2rem", textAlign: "center" }}>
      <i className={icon} style={{ fontSize: "2.5rem", color: "var(--text4)", display: "block", marginBottom: "1rem" }} />
      <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text2)", marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: "0.85rem", color: "var(--text3)", marginBottom: "1.25rem", lineHeight: 1.5 }}>{sub}</div>}
      {action}
    </div>
  );
}

export function AIError({ message }: { message: string }) {
  const isQuota = message.includes("Quota") || message.includes("quota");
  const isNoKey = message === "no_key";
  const accentColor = isNoKey ? "var(--accent)" : "var(--red)";
  const bg = isNoKey ? "var(--accent-dim)" : "var(--red-dim)";

  return (
    <div style={{
      background: bg,
      border: `1px solid ${isNoKey ? "rgba(99,102,241,0.2)" : "rgba(220,38,38,0.2)"}`,
      borderRadius: 12, padding: "1.2rem 1.4rem",
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <i className={`fas ${isNoKey ? "fa-key" : "fa-exclamation-triangle"}`}
        style={{ color: accentColor, marginTop: 2, flexShrink: 0 }} />
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 4, color: accentColor }}>
          {isNoKey ? "Gemini API Key Not Configured" : isQuota ? "API Quota Exhausted" : "AI Error"}
        </div>
        <div style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.6 }}>
          {isNoKey
            ? "Go to Settings and add your Gemini API key to enable AI features."
            : isQuota
            ? "Free tier daily limit reached. Try again tomorrow or upgrade your Google AI plan."
            : message}
        </div>
        {isNoKey && (
          <a href="/settings" style={{ display: "inline-block", marginTop: 8, fontSize: "0.82rem", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            Open Settings →
          </a>
        )}
      </div>
    </div>
  );
}
