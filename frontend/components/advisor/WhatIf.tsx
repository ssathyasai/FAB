"use client";
import { useState } from "react";
import { getWhatIf } from "@/lib/api";
import { formatINR } from "@/lib/utils";

export default function WhatIf() {
  const [params, setParams] = useState({ salary_change: 0, rent_change: 0, discretionary_change: 0, all_expenses_change: 0 });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try { const r = await getWhatIf(params); setResult(r.data); }
    catch { } finally { setLoading(false); }
  };

  const sliders = [
    { key: "salary_change", label: "Salary Change", icon: "💼" },
    { key: "rent_change", label: "Rent Change", icon: "🏠" },
    { key: "discretionary_change", label: "Shopping + Entertainment", icon: "🛍️" },
    { key: "all_expenses_change", label: "All Expenses Change", icon: "📊" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
      <div className="card" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>Adjust Scenarios</h3>
        {sliders.map(s => (
          <div key={s.key} style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 4 }}>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>{s.icon} {s.label}</span>
              <span style={{ color: (params as any)[s.key] >= 0 ? "var(--accent)" : "#ff6b6b", fontWeight: 700 }}>
                {(params as any)[s.key] >= 0 ? "+" : ""}{(params as any)[s.key]}%
              </span>
            </div>
            <input type="range" min="-50" max="50" value={(params as any)[s.key]}
              onChange={e => setParams(p => ({ ...p, [s.key]: parseInt(e.target.value) }))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>
        ))}
        <button className="btn-primary" style={{ padding: "0.8rem", width: "100%" }} onClick={run} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: "0 auto" }} /> : "Run Analysis"}
        </button>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>Results</h3>
        {result ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "1rem" }}>
              {["income", "expenses", "savings"].map(k => (
                <div key={k} className="card-inner" style={{ padding: "0.8rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "capitalize", marginBottom: 2 }}>{k}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>{formatINR((result.before as any)[k])}</span>
                    <span style={{ color: "var(--accent)" }}>→</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>{formatINR((result.after as any)[k])}</span>
                  </div>
                </div>
              ))}
              <div className="card-inner" style={{ padding: "0.8rem" }}>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Savings Rate</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: result.after.savings_rate >= 20 ? "#34d399" : "#fbbf24" }}>
                  {result.before.savings_rate}% → {result.after.savings_rate}%
                </div>
              </div>
            </div>
            <div className="card-inner" style={{ padding: "1rem", background: result.savings_diff_monthly >= 0 ? "rgba(52,211,153,0.05)" : "rgba(255,107,107,0.05)" }}>
              <div style={{ fontWeight: 700, color: result.savings_diff_monthly >= 0 ? "#34d399" : "#ff6b6b", fontSize: "0.95rem" }}>
                {result.savings_diff_monthly >= 0 ? "💚" : "💔"} You would save {formatINR(Math.abs(result.savings_diff_monthly))} {result.savings_diff_monthly >= 0 ? "more" : "less"} per month
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginTop: 4 }}>
                That is {formatINR(Math.abs(result.savings_diff_annual))} {result.savings_diff_monthly >= 0 ? "more" : "less"} per year
              </div>
              {result.warning && <div style={{ color: "#ff6b6b", fontSize: "0.75rem", marginTop: 6 }}>⚠ Savings rate below 10% — not recommended</div>}
            </div>
          </>
        ) : (
          <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "3rem 0", fontSize: "0.85rem" }}>
            Adjust sliders and run analysis
          </div>
        )}
      </div>
    </div>
  );
}
