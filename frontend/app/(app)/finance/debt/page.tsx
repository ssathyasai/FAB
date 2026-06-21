"use client";
import { useState } from "react";
import { postDebtAdvisor } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { PageHeader, AIError } from "@/components/ui";

const LOAN_TYPES = ["Home Loan","Car Loan","Personal Loan","Education Loan","Credit Card","Business Loan","Gold Loan","Other"];

export default function FinanceDebt() {
  const [loans, setLoans] = useState([{ type:"",balance:"",rate:"",emi:"",tenure:"",fixed:"fixed",prepayment:"yes" }]);
  const [result, setResult] = useState<any>(null);
  const [loading, setL] = useState(false);

  const addLoan = () => setLoans(l => [...l, { type:"",balance:"",rate:"",emi:"",tenure:"",fixed:"fixed",prepayment:"yes" }]);
  const rmLoan  = (i: number) => setLoans(l => l.filter((_,idx) => idx!==i));
  const upLoan  = (i: number, k: string, v: string) => setLoans(l => l.map((x,idx) => idx===i?{...x,[k]:v}:x));

  const submit = async () => {
    setL(true);
    try {
      const formatted = loans.map(l => ({ loan_type:l.type, outstanding_balance:parseFloat(l.balance)||0, interest_rate:parseFloat(l.rate)||0, emi:parseFloat(l.emi)||0, remaining_tenure:l.tenure, fixed_floating:l.fixed, prepayment_allowed:l.prepayment==="yes" }));
      const r = await postDebtAdvisor({ loans:formatted });
      setResult(r.data);
    } catch {} finally { setL(false); }
  };

  const strategyColor = (s: string) => ({ avalanche:"#ff6b6b",snowball:"#34d399",hybrid:"#60a5fa" })[s] || "#60a5fa";

  return (
    <div className="page-enter">
      <PageHeader icon="fas fa-hand-holding-usd" title="Debt Advisor" color="#f0b429"
        sub="Find the fastest, cheapest path to becoming debt-free" />

      <div style={{ display:"grid",gridTemplateColumns:result?"1fr 1fr":"640px 1fr",gap:"1.5rem" }}>
        {/* Loans input */}
        <div style={{ display:"flex",flexDirection:"column",gap:"0.9rem" }}>
          <div className="card" style={{ padding:"1.5rem" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.2rem" }}>
              <div className="section-header" style={{ marginBottom:0 }}><i className="fas fa-list" />Your Loans ({loans.length})</div>
              <button onClick={addLoan} className="btn btn-secondary btn-sm"><i className="fas fa-plus" /> Add Loan</button>
            </div>

            {loans.map((loan, i) => (
              <div key={i} style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"1rem",marginBottom:"0.7rem" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                  <span style={{ fontWeight:700,fontSize:"0.85rem",color:"var(--text2)" }}>Loan {i+1}</span>
                  {loans.length > 1 && <button onClick={() => rmLoan(i)} style={{ background:"none",border:"none",color:"#ff6b6b",cursor:"pointer",fontSize:"0.8rem",padding:4 }}>✕</button>}
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
                  {[["type","Type","select"],["balance","Balance (₹)","number"],["rate","Rate (%)","number"],["emi","EMI (₹)","number"],["tenure","Tenure","text"]].map(([k,l,t]) => (
                    <div key={k}>
                      <label className="label">{l}</label>
                      {t==="select"
                        ? <select className="input" style={{ padding:"0.5rem" }} value={(loan as any)[k]} onChange={e => upLoan(i,k,e.target.value)}>
                            <option value="">Select…</option>
                            {LOAN_TYPES.map(t => <option key={t}>{t}</option>)}
                          </select>
                        : <input className="input" style={{ padding:"0.5rem" }} type={t} placeholder={l} value={(loan as any)[k]} onChange={e => upLoan(i,k,e.target.value)} />
                      }
                    </div>
                  ))}
                  <div>
                    <label className="label">Prepayment</label>
                    <select className="input" style={{ padding:"0.5rem" }} value={loan.prepayment} onChange={e => upLoan(i,"prepayment",e.target.value)}>
                      <option value="yes">Allowed</option>
                      <option value="no">Not Allowed</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={submit} disabled={loading} className="btn btn-primary btn-full" style={{ marginTop:4 }}>
              {loading ? <><div className="spinner spinner-sm"/>Analyzing Debt…</> : "Get Repayment Strategy →"}
            </button>
          </div>
        </div>

        {/* Results */}
        <div style={{ display:"flex",flexDirection:"column",gap:"0.9rem" }}>
          {!result && !loading && (
            <div style={{ color:"var(--text4)",textAlign:"center",paddingTop:"3rem",fontSize:"0.9rem" }}>
              <i className="fas fa-hand-holding-usd" style={{ fontSize:"2.5rem",display:"block",marginBottom:12,opacity:0.15 }} />
              Enter your loans to get a repayment strategy
            </div>
          )}
          {result?.error && <AIError message={result.error} />}
          {result && !result.error && (
            <>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.8rem" }}>
                {[["Debt Health",result.debt_health_score,"#34d399"],["Risk Score",result.debt_risk_score,"#ff6b6b"],["DTI Ratio",`${(result.debt_to_income_ratio||0).toFixed(1)}%`,"#fbbf24"]].map(([l,v,c]) => (
                  <div key={l as string} className="card" style={{ padding:"1rem",textAlign:"center" }}>
                    <div style={{ fontSize:"1.6rem",fontWeight:900,color:c as string,letterSpacing:"-0.03em" }}>{v}</div>
                    <div style={{ fontSize:"0.68rem",color:"var(--text3)",textTransform:"uppercase",marginTop:3 }}>{l}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding:"1.3rem",borderLeft:`3px solid ${strategyColor(result.best_strategy)}` }}>
                <div style={{ fontWeight:800,color:strategyColor(result.best_strategy),textTransform:"capitalize",fontSize:"1rem",marginBottom:5 }}>
                  {result.best_strategy} Strategy Recommended
                </div>
                <p style={{ color:"var(--text2)",fontSize:"0.85rem",lineHeight:1.5 }}>{result.strategy_explanation}</p>
                {result.debt_free_timeline && (
                  <div style={{ marginTop:8,fontSize:"0.82rem",color:"var(--accent)",fontWeight:600 }}>
                    <i className="fas fa-flag-checkered" style={{ marginRight:6 }} />
                    Debt-free in: {result.debt_free_timeline}
                  </div>
                )}
              </div>

              <div className="card" style={{ padding:"1.3rem" }}>
                <div className="section-header"><i className="fas fa-tasks" />Top 5 Actions</div>
                {(result.top_5_actions||[]).map((a: string, i: number) => (
                  <div key={i} style={{ display:"flex",gap:10,marginBottom:8,padding:"0.6rem 0.8rem",background:"rgba(255,255,255,0.03)",borderRadius:8 }}>
                    <span style={{ color:"var(--coral)",fontWeight:900,flexShrink:0 }}>{i+1}.</span>
                    <span style={{ color:"var(--text2)",fontSize:"0.85rem",lineHeight:1.4 }}>{a}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
