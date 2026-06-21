"use client";
import { useState } from "react";
import { postSavingsAdvisor } from "@/lib/api";

export default function SavingsAdvisor() {
  const [form, setForm] = useState({ savings_amount: "", purpose: "", time_horizon: "", risk_level: "", financial_priority: "" });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const r = await postSavingsAdvisor({ ...form, savings_amount: parseFloat(form.savings_amount) });
      setResult(r.data);
    } catch {} finally { setLoading(false); }
  };

  const PURPOSES = ["Emergency Fund", "Down Payment", "Education", "Retirement", "Vacation", "Business", "Other"];
  const HORIZONS = ["< 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"];
  const RISKS = ["Low Risk", "Medium Risk", "High Risk"];
  const PRIORITIES = ["Save for Future", "Grow Wealth", "Generate Income", "Beat Inflation", "Tax Savings"];

  return (
    <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1.2fr" : "1fr", gap: "1rem" }}>
      <div className="card" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>Saving Advisor</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Savings Amount (₹)</label>
            <input className="input-field" type="number" placeholder="e.g. 50000" value={form.savings_amount} onChange={e => setForm(f => ({ ...f, savings_amount: e.target.value }))} />
          </div>
          {[["purpose", "Purpose", PURPOSES], ["time_horizon", "Time Horizon", HORIZONS], ["risk_level", "Risk Level", RISKS], ["financial_priority", "Financial Priority", PRIORITIES]].map(([key, label, opts]) => (
            <div key={key as string}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label as string}</label>
              <select className="input-field" value={(form as any)[key as string]} onChange={e => setForm(f => ({ ...f, [key as string]: e.target.value }))}>
                <option value="">Select...</option>
                {(opts as string[]).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <button className="btn-primary" style={{ padding: "0.8rem" }} onClick={submit} disabled={loading || !form.savings_amount}>
            {loading ? "Analyzing..." : "Get Recommendations"}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {result.error ? (
            <div className="card" style={{ padding: "1.5rem", color: "#ffd93d" }}><i className="fas fa-key" style={{ marginRight: 8 }} />{result.error}</div>
          ) : (
            <>
              {result.summary && <div className="card" style={{ padding: "1.2rem" }}><p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>{result.summary}</p></div>}
              {(result.top_5_recommendations || []).map((r: any) => (
                <div key={r.rank} className="card" style={{ padding: "1.2rem" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>#{r.rank} {r.title}</div>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: 6 }}>{r.description}</p>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem" }}>
                    <span style={{ color: "#4cd9b0" }}>Return: {r.expected_return}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Risk: {r.risk}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Horizon: {r.time_horizon}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
