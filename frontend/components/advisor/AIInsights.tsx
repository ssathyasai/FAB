"use client";
import { useEffect, useState } from "react";
import { getAIInsights } from "@/lib/api";

export default function AIInsights() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAIInsights().then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>;

  if (data?.error) return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ color: "var(--accent)" }}><i className="fas fa-key" style={{ marginRight: 8 }} />Configure your Gemini API key in Settings to enable AI insights.</div>
      <div style={{ marginTop: "1rem", color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>Without it, rule-based insights will be shown.</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
          <i className="fas fa-brain" style={{ color: "var(--accent)", marginRight: 6 }} />Spending Pattern
        </div>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--accent)" }}>{data?.spending_pattern}</div>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
          <i className="fas fa-chart-bar" style={{ color: "var(--accent)", marginRight: 6 }} />Key Insights
        </div>
        {(data?.top_3_insights || []).map((i: string, idx: number) => (
          <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>{idx + 1}.</span>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>{i}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
          <i className="fas fa-exchange-alt" style={{ color: "var(--accent)", marginRight: 6 }} />Month Comparison
        </div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>{data?.month_comparison}</div>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
          <i className="fas fa-lightbulb" style={{ color: "var(--accent)", marginRight: 6 }} />Personalized Advice
        </div>
        {(data?.personalized_advice || []).map((a: string, idx: number) => (
          <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <span style={{ color: "var(--accent)" }}>💡</span>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>{a}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
