"use client";
import { useState } from "react";
import { postSavingsAdvisor } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { PageHeader, AIError } from "@/components/ui";

const PURPOSES  = ["Emergency Fund","Down Payment","Education","Retirement","Vacation","Business","Other"];
const HORIZONS  = ["< 1 year","1–3 years","3–5 years","5–10 years","10+ years"];
const RISKS     = ["Low Risk","Medium Risk","High Risk"];
const PRIORITIES= ["Wealth Growth","Capital Safety","Passive Income","Tax Saving","Liquidity"];

export default function FinanceSavings() {
  const [form, setForm] = useState({ savings_amount:"", purpose:"", time_horizon:"", risk_level:"", financial_priority:"" });
  const [result, setResult] = useState<any>(null);
  const [loading, setL] = useState(false);

  const submit = async () => {
    if (!form.savings_amount) return;
    setL(true);
    try { const r = await postSavingsAdvisor({ ...form, savings_amount: parseFloat(form.savings_amount) }); setResult(r.data); }
    catch {} finally { setL(false); }
  };

  return (
    <div className="page-enter">
      <PageHeader icon="fas fa-piggy-bank" title="Savings Advisor" color="#f0b429"
        sub="Find the best way to grow your savings with AI" />

      <div style={{ display:"grid", gridTemplateColumns: result ? "400px 1fr" : "480px 1fr", gap:"1.5rem" }}>
        {/* Form */}
        <div className="card" style={{ padding:"1.8rem", alignSelf:"start" }}>
          <div className="section-header"><i className="fas fa-piggy-bank" />Savings Details</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <div>
              <label className="label">Savings Amount (₹)</label>
              <input className="input" type="number" placeholder="e.g. 100000"
                value={form.savings_amount} onChange={e => setForm(f=>({...f,savings_amount:e.target.value}))} />
            </div>
            {[
              ["purpose","Purpose",PURPOSES],
              ["time_horizon","Investment Horizon",HORIZONS],
              ["risk_level","Risk Level",RISKS],
              ["financial_priority","Financial Priority",PRIORITIES],
            ].map(([k,l,opts]) => (
              <div key={k as string}>
                <label className="label">{l as string}</label>
                <select className="input" value={(form as any)[k as string]}
                  onChange={e => setForm(f=>({...f,[k as string]:e.target.value}))}>
                  <option value="">Select…</option>
                  {(opts as string[]).map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <button onClick={submit} disabled={loading||!form.savings_amount} className="btn btn-primary btn-full" style={{ marginTop:4 }}>
              {loading ? <><div className="spinner spinner-sm"/>Analyzing…</> : "Get Savings Plan →"}
            </button>
          </div>
        </div>

        {/* Results */}
        <div style={{ display:"flex", flexDirection:"column", gap:"0.9rem" }}>
          {!result && !loading && (
            <div style={{ color:"var(--text4)", textAlign:"center", paddingTop:"5rem", fontSize:"0.9rem" }}>
              <i className="fas fa-piggy-bank" style={{ fontSize:"3rem", display:"block", marginBottom:14, opacity:0.12 }} />
              Fill in your savings details to get personalized recommendations
            </div>
          )}
          {result?.error && <AIError message={result.error} />}
          {result && !result.error && (
            <>
              {result.summary && (
                <div className="card" style={{ padding:"1.3rem", background:"rgba(240,180,41,0.04)", border:"1px solid rgba(240,180,41,0.15)" }}>
                  <p style={{ color:"var(--text2)", fontSize:"0.9rem", lineHeight:1.6 }}>{result.summary}</p>
                </div>
              )}
              {(result.top_5_recommendations||[]).map((rec: any) => (
                <div key={rec.rank} className="card" style={{ padding:"1.4rem", borderLeft:"3px solid var(--accent)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:7 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontWeight:900, color:"var(--accent)", fontSize:"1.1rem" }}>#{rec.rank}</span>
                      <span style={{ fontWeight:700, fontSize:"0.93rem" }}>{rec.title}</span>
                    </div>
                    <span className="badge badge-amber">{rec.risk}</span>
                  </div>
                  <p style={{ color:"var(--text2)", fontSize:"0.85rem", lineHeight:1.5, marginBottom:8 }}>{rec.description}</p>
                  <div style={{ display:"flex", gap:"1.2rem", fontSize:"0.78rem", padding:"0.6rem 0.8rem", background:"rgba(255,255,255,0.03)", borderRadius:8 }}>
                    <span style={{ color:"var(--accent)", fontWeight:700 }}>Return: {rec.expected_return}</span>
                    <span style={{ color:"var(--text3)" }}>Horizon: {rec.time_horizon}</span>
                  </div>
                  {rec.action_steps?.length > 0 && (
                    <div style={{ marginTop:10 }}>
                      {rec.action_steps.slice(0,3).map((s: string, i: number) => (
                        <div key={i} style={{ display:"flex", gap:7, fontSize:"0.8rem", color:"var(--text2)", marginBottom:4 }}>
                          <span style={{ color:"var(--accent)", flexShrink:0 }}>→</span>{s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
