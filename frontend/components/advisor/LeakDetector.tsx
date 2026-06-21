"use client";
import { useEffect, useState } from "react";
import { getLeakDetector } from "@/lib/api";
import { formatINR } from "@/lib/utils";

export default function LeakDetector() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeakDetector().then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {data?.leaks?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="card" style={{ padding: "1.2rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ff6b6b" }}>{formatINR(data.total_monthly_drain)}</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Monthly Drain</div>
          </div>
          <div className="card" style={{ padding: "1.2rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ff6b6b" }}>{formatINR(data.total_annual_drain)}</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Annual Drain</div>
          </div>
        </div>
      )}

      {!data?.leaks?.length ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <i className="fas fa-check-circle" style={{ fontSize: "3rem", color: "#4cd9b0", marginBottom: "1rem", display: "block" }} />
          <h3 style={{ fontWeight: 700, marginBottom: 4 }}>No Leaks Detected</h3>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
            Categorize more transactions with notes to detect recurring small expenses.
          </p>
        </div>
      ) : data.leaks.map((leak: any, i: number) => (
        <div key={i} className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{leak.name}</div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{leak.category} · {leak.times_per_month}× per month</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, color: "#ff6b6b" }}>{formatINR(leak.monthly_cost)}/mo</div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{formatINR(leak.avg_amount)} avg</div>
            </div>
          </div>
          <div style={{ padding: "0.6rem 0.8rem", borderRadius: "0.5rem", background: "rgba(76,217,176,0.05)", border: "1px solid rgba(76,217,176,0.08)", fontSize: "0.8rem", color: "#4cd9b0" }}>
            💡 If you cut this: save {formatINR(leak.save_per_year)}/year
          </div>
        </div>
      ))}
    </div>
  );
}
