"use client";
import { useState } from "react";
import { postInvestmentAdvisor } from "@/lib/api";

const EXISTING = ["FD","PPF","NPS","Gold","Stocks","Mutual Funds","Real Estate","Bonds","Crypto","None"];
const STYLES = ["Safe Investments","Wealth Creation","Passive Income","Tax Saving","Retirement Focus","Market Investments","No Preference"];

export default function InvestmentAdvisor() {
  const [form, setForm] = useState({ investment_amount: "", investment_mode: "Monthly SIP", existing_investments: [] as string[], investment_experience: "Beginner", preferred_style: "" });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const toggleExisting = (e: string) => setForm(f => ({
    ...f,
    existing_investments: f.existing_investments.includes(e) ? f.existing_investments.filter(x => x !== e) : [...f.existing_investments, e]
  }));

  const submit = async () => {
    setLoading(true);
    try {
      const r = await postInvestmentAdvisor({ ...form, investment_amount: parseFloat(form.investment_amount) });
      setResult(r.data);
    } catch {} finally { setLoading(false); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1.2fr" : "1fr", gap: "1rem" }}>
      <div className="card" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>Investment Advisor</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Investment Amount (₹)</label>
            <input className="input-field" type="number" placeholder="e.g. 10000" value={form.investment_amount} onChange={e => setForm(f => ({ ...f, investment_amount: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Investment Mode</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Monthly SIP", "One-Time Investment"].map(m => (
                <button key={m} onClick={() => setForm(f => ({ ...f, investment_mode: m }))} style={{
                  flex: 1, padding: "0.5rem", borderRadius: "0.6rem",
                  border: `1px solid ${form.investment_mode === m ? "#4cd9b0" : "rgba(255,255,255,0.06)"}`,
                  background: form.investment_mode === m ? "rgba(76,217,176,0.1)" : "transparent",
                  color: form.investment_mode === m ? "#4cd9b0" : "rgba(255,255,255,0.4)",
                  cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                }}>{m}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Existing Investments</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {EXISTING.map(e => (
                <button key={e} onClick={() => toggleExisting(e)} style={{
                  padding: "0.3rem 0.7rem", borderRadius: "2rem",
                  border: `1px solid ${form.existing_investments.includes(e) ? "#4cd9b0" : "rgba(255,255,255,0.06)"}`,
                  background: form.existing_investments.includes(e) ? "rgba(76,217,176,0.1)" : "transparent",
                  color: form.existing_investments.includes(e) ? "#4cd9b0" : "rgba(255,255,255,0.4)",
                  cursor: "pointer", fontSize: "0.75rem", fontWeight: 500,
                }}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Experience</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Beginner", "Intermediate", "Advanced"].map(e => (
                <button key={e} onClick={() => setForm(f => ({ ...f, investment_experience: e }))} style={{
                  flex: 1, padding: "0.5rem", borderRadius: "0.6rem",
                  border: `1px solid ${form.investment_experience === e ? "#4cd9b0" : "rgba(255,255,255,0.06)"}`,
                  background: form.investment_experience === e ? "rgba(76,217,176,0.1)" : "transparent",
                  color: form.investment_experience === e ? "#4cd9b0" : "rgba(255,255,255,0.4)",
                  cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                }}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Preferred Style</label>
            <select className="input-field" value={form.preferred_style} onChange={e => setForm(f => ({ ...f, preferred_style: e.target.value }))}>
              <option value="">Select...</option>
              {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn-primary" style={{ padding: "0.8rem" }} onClick={submit} disabled={loading || !form.investment_amount}>
            {loading ? "Analyzing..." : "Get Investment Plan"}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {result.error ? (
            <div className="card" style={{ padding: "1.5rem", color: "#ffd93d" }}><i className="fas fa-key" style={{ marginRight: 8 }} />{result.error}</div>
          ) : (
            <>
              <div className="card" style={{ padding: "1.2rem" }}>
                <div style={{ fontWeight: 700, color: "#4cd9b0", textTransform: "capitalize", marginBottom: 4 }}>{result.investor_profile} Investor</div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>{result.profile_reasoning}</p>
              </div>

              {(result.portfolio_allocation || []).map((a: any, i: number) => (
                <div key={i} className="card-inner" style={{ padding: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>{a.asset}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "#4cd9b0" }}>{a.percentage}%</div>
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>{a.explanation}</div>
                  </div>
                </div>
              ))}

              {(result.top_5_recommendations || []).map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: "1.2rem" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{r.name}</div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", marginBottom: 4 }}>
                    <span style={{ color: "#4cd9b0" }}>{r.expected_return}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Risk: {r.risk}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>{r.horizon}</span>
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>{r.why_suitable}</p>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
