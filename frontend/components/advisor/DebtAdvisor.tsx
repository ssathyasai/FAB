"use client";
import { useState } from "react";
import { postDebtAdvisor } from "@/lib/api";
import { formatINR } from "@/lib/utils";

const LOAN_TYPES = ["Home Loan", "Car Loan", "Personal Loan", "Education Loan", "Credit Card", "Business Loan", "Gold Loan", "Other"];

export default function DebtAdvisor() {
  const [loans, setLoans] = useState([{ type: "", balance: "", rate: "", emi: "", tenure: "", fixed: "fixed", prepayment: "yes" }]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const addLoan = () => setLoans(l => [...l, { type: "", balance: "", rate: "", emi: "", tenure: "", fixed: "fixed", prepayment: "yes" }]);
  const removeLoan = (i: number) => setLoans(l => l.filter((_, idx) => idx !== i));
  const updateLoan = (i: number, k: string, v: string) => setLoans(l => l.map((loan, idx) => idx === i ? { ...loan, [k]: v } : loan));

  const submit = async () => {
    setLoading(true);
    try {
      const formatted = loans.map(l => ({ loan_type: l.type, outstanding_balance: parseFloat(l.balance), interest_rate: parseFloat(l.rate), emi: parseFloat(l.emi), remaining_tenure: l.tenure, fixed_floating: l.fixed, prepayment_allowed: l.prepayment === "yes" }));
      const r = await postDebtAdvisor({ loans: formatted });
      setResult(r.data);
    } catch {} finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontWeight: 700 }}>Your Loans</h3>
          <button onClick={addLoan} style={{ padding: "0.4rem 0.8rem", borderRadius: "0.5rem", border: "1px solid var(--accent-glow)", background: "var(--accent-dim)", color: "var(--accent)", cursor: "pointer", fontSize: "0.8rem" }}>
            + Add Loan
          </button>
        </div>
        {loans.map((loan, i) => (
          <div key={i} className="card-inner" style={{ padding: "1rem", marginBottom: "0.8rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>Loan {i + 1}</span>
              {loans.length > 1 && <button onClick={() => removeLoan(i)} style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: "0.8rem" }}>Remove</button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              <div>
                <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Loan Type</label>
                <select className="input-field" style={{ padding: "0.5rem" }} value={loan.type} onChange={e => updateLoan(i, "type", e.target.value)}>
                  <option value="">Select...</option>
                  {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Balance (₹)</label>
                <input className="input-field" style={{ padding: "0.5rem" }} type="number" placeholder="500000" value={loan.balance} onChange={e => updateLoan(i, "balance", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Interest Rate (%)</label>
                <input className="input-field" style={{ padding: "0.5rem" }} type="number" placeholder="8.5" value={loan.rate} onChange={e => updateLoan(i, "rate", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>EMI (₹)</label>
                <input className="input-field" style={{ padding: "0.5rem" }} type="number" placeholder="15000" value={loan.emi} onChange={e => updateLoan(i, "emi", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Remaining Tenure</label>
                <input className="input-field" style={{ padding: "0.5rem" }} placeholder="24 months" value={loan.tenure} onChange={e => updateLoan(i, "tenure", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Prepayment</label>
                <select className="input-field" style={{ padding: "0.5rem" }} value={loan.prepayment} onChange={e => updateLoan(i, "prepayment", e.target.value)}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        <button className="btn-primary" style={{ padding: "0.8rem", width: "100%", marginTop: 8 }} onClick={submit} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze & Get Strategy"}
        </button>
      </div>

      {result && (
        result.error ? (
          <div className="card" style={{ padding: "1.5rem", color: "var(--accent)" }}><i className="fas fa-key" style={{ marginRight: 8 }} />{result.error}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
              <div className="card" style={{ padding: "1.2rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: result.debt_health_score >= 60 ? "#34d399" : "#ff6b6b" }}>{result.debt_health_score}</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Debt Health Score</div>
              </div>
              <div className="card" style={{ padding: "1.2rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: result.debt_risk_score <= 40 ? "#34d399" : "#ff6b6b" }}>{result.debt_risk_score}</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Debt Risk Score</div>
              </div>
              <div className="card" style={{ padding: "1.2rem", textAlign: "center" }}>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--accent)", textTransform: "capitalize" }}>{result.best_strategy}</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Best Strategy</div>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{result.strategy_explanation}</div>
              </div>
            </div>

            {(result.top_5_actions || []).map((a: string, i: number) => (
              <div key={i} className="card-inner" style={{ padding: "0.8rem", display: "flex", gap: 8 }}>
                <span style={{ color: "var(--coral)", fontWeight: 700 }}>{i + 1}.</span>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>{a}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
