"use client";
import { useState } from "react";
import { postInvestmentAdvisor } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { PageHeader, AIError } from "@/components/ui";

const EXISTING = ["FD","PPF","NPS","Gold","Stocks","Mutual Funds","Real Estate","Bonds","Crypto","None"];
const STYLES   = ["Safe Investments","Wealth Creation","Passive Income","Tax Saving","Retirement Focus","Market Investments","No Preference"];
const COLORS: Record<string,string> = { conservative:"#34d399", moderate:"#60a5fa", aggressive:"#6366f1" };

export default function FinanceInvestment() {
  const [form, setForm] = useState({ investment_amount:"", investment_mode:"Monthly SIP", existing_investments:[] as string[], investment_experience:"Beginner", preferred_style:"" });
  const [result, setResult] = useState<any>(null);
  const [loading, setL] = useState(false);

  const toggle = (e: string) => setForm(f => ({
    ...f, existing_investments: f.existing_investments.includes(e) ? f.existing_investments.filter(x=>x!==e) : [...f.existing_investments,e]
  }));

  const submit = async () => {
    setL(true);
    try { const r = await postInvestmentAdvisor({ ...form, investment_amount:parseFloat(form.investment_amount) }); setResult(r.data); }
    catch {} finally { setL(false); }
  };

  return (
    <div className="page-enter">
      <PageHeader icon="fas fa-chart-line" title="Investment Advisor" color="#f0b429"
        sub="Build a personalized investment portfolio with AI guidance" />

      <div style={{ display:"grid",gridTemplateColumns:result?"1fr 1.2fr":"500px 1fr",gap:"1.5rem" }}>
        {/* Form */}
        <div style={{ display:"flex",flexDirection:"column",gap:"1rem" }}>
          <div className="card" style={{ padding:"1.5rem" }}>
            <div className="section-header"><i className="fas fa-rupee-sign" />Investment Details</div>
            <div style={{ display:"flex",flexDirection:"column",gap:"0.9rem" }}>
              <div>
                <label className="label">Investment Amount (₹)</label>
                <input className="input" type="number" placeholder="e.g. 10000" value={form.investment_amount} onChange={e => setForm(f=>({...f,investment_amount:e.target.value}))} />
              </div>
              <div>
                <label className="label">Investment Mode</label>
                <div style={{ display:"flex",gap:6 }}>
                  {["Monthly SIP","One-Time Investment"].map(m => (
                    <button key={m} onClick={() => setForm(f=>({...f,investment_mode:m}))} style={{
                      flex:1,padding:"0.6rem 0.4rem",borderRadius:8,
                      border:`1px solid ${form.investment_mode===m?"var(--accent)":"rgba(255,255,255,0.07)"}`,
                      background:form.investment_mode===m?"var(--accent-dim)":"transparent",
                      color:form.investment_mode===m?"var(--accent)":"var(--text3)",
                      cursor:"pointer",fontSize:"0.78rem",fontWeight:600,fontFamily:"Inter",
                    }}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Existing Investments</label>
                <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                  {EXISTING.map(e => (
                    <button key={e} onClick={() => toggle(e)} style={{
                      padding:"0.28rem 0.7rem",borderRadius:99,fontSize:"0.75rem",fontWeight:500,
                      border:`1px solid ${form.existing_investments.includes(e)?"var(--accent)":"rgba(255,255,255,0.07)"}`,
                      background:form.existing_investments.includes(e)?"var(--accent-dim)":"transparent",
                      color:form.existing_investments.includes(e)?"var(--accent)":"var(--text3)",
                      cursor:"pointer",fontFamily:"Inter",
                    }}>{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Experience</label>
                <div style={{ display:"flex",gap:6 }}>
                  {["Beginner","Intermediate","Advanced"].map(e => (
                    <button key={e} onClick={() => setForm(f=>({...f,investment_experience:e}))} style={{
                      flex:1,padding:"0.55rem",borderRadius:8,
                      border:`1px solid ${form.investment_experience===e?"var(--accent)":"rgba(255,255,255,0.07)"}`,
                      background:form.investment_experience===e?"var(--accent-dim)":"transparent",
                      color:form.investment_experience===e?"var(--accent)":"var(--text3)",
                      cursor:"pointer",fontSize:"0.78rem",fontWeight:600,fontFamily:"Inter",
                    }}>{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Preferred Style</label>
                <select className="input" value={form.preferred_style} onChange={e => setForm(f=>({...f,preferred_style:e.target.value}))}>
                  <option value="">Select style...</option>
                  {STYLES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={submit} disabled={loading||!form.investment_amount} className="btn btn-primary btn-full" style={{ marginTop:4 }}>
                {loading ? <><div className="spinner spinner-sm"/>Analyzing…</> : "Get Investment Plan →"}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{ display:"flex",flexDirection:"column",gap:"0.9rem" }}>
          {!result && !loading && (
            <div style={{ color:"var(--text4)",textAlign:"center",paddingTop:"4rem",fontSize:"0.9rem" }}>
              <i className="fas fa-chart-line" style={{ fontSize:"3rem",display:"block",marginBottom:12,opacity:0.15 }} />
              Fill the form to get your personalized investment plan
            </div>
          )}
          {result?.error && <AIError message={result.error} />}
          {result && !result.error && (
            <>
              <div className="card" style={{ padding:"1.3rem",borderLeft:`3px solid ${COLORS[result.investor_profile]||"#60a5fa"}` }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                  <span style={{ fontWeight:700,color:COLORS[result.investor_profile]||"#60a5fa",textTransform:"capitalize",fontSize:"1rem" }}>
                    {result.investor_profile} Investor
                  </span>
                </div>
                <p style={{ color:"var(--text2)",fontSize:"0.85rem",lineHeight:1.5 }}>{result.profile_reasoning}</p>
              </div>

              <div className="card" style={{ padding:"1.3rem" }}>
                <div className="section-header"><i className="fas fa-pie-chart" />Portfolio Allocation</div>
                {(result.portfolio_allocation||[]).map((a: any, i: number) => (
                  <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,padding:"0.6rem 0.8rem",background:"rgba(255,255,255,0.03)",borderRadius:8 }}>
                    <div>
                      <div style={{ fontWeight:600,fontSize:"0.85rem" }}>{a.asset}</div>
                      <div style={{ fontSize:"0.7rem",color:"var(--text3)" }}>{a.explanation}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:800,color:"var(--accent)",fontSize:"1rem" }}>{a.percentage}%</div>
                      <div style={{ fontSize:"0.72rem",color:"var(--text3)" }}>{formatINR(a.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {(result.top_5_recommendations||[]).map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding:"1.2rem" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5 }}>
                    <span style={{ fontWeight:700,fontSize:"0.9rem" }}>{r.name}</span>
                    <span className="badge badge-amber">{r.risk}</span>
                  </div>
                  <div style={{ display:"flex",gap:"1rem",fontSize:"0.75rem",marginBottom:5 }}>
                    <span style={{ color:"var(--accent)",fontWeight:600 }}>{r.expected_return}</span>
                    <span style={{ color:"var(--text3)" }}>{r.horizon}</span>
                  </div>
                  <p style={{ color:"var(--text3)",fontSize:"0.78rem",lineHeight:1.4 }}>{r.why_suitable}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
