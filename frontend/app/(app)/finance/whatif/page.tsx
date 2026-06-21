"use client";
import { useState } from "react";
import { getAIInsights, getWhatIf } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { PageHeader } from "@/components/ui";

const SLIDERS = [
  { key:"salary_change",        label:"Salary Change",                icon:"💼", color:"#34d399" },
  { key:"rent_change",          label:"Housing / Rent Change",        icon:"🏠", color:"#60a5fa" },
  { key:"discretionary_change", label:"Shopping + Entertainment",     icon:"🛍️", color:"#6366f1" },
  { key:"all_expenses_change",  label:"All Expenses Change",          icon:"📊", color:"#fbbf24" },
];

export default function FinanceWhatIf() {
  const [params, setP] = useState({ salary_change:0, rent_change:0, discretionary_change:0, all_expenses_change:0 });
  const [result, setR] = useState<any>(null);
  const [loading, setL]= useState(false);

  const run = async () => {
    setL(true);
    try { const r = await getWhatIf(params); setR(r.data); }
    catch {} finally { setL(false); }
  };

  const diff = result?.savings_diff_monthly ?? 0;

  return (
    <div className="page-enter">
      <PageHeader icon="fas fa-calculator" title="What-If Analysis" color="#f0b429"
        sub="Simulate financial scenarios and see the impact on your savings" />

      <div style={{ display:"grid", gridTemplateColumns:"420px 1fr", gap:"1.5rem" }}>
        {/* Sliders */}
        <div className="card" style={{ padding:"1.8rem", alignSelf:"start" }}>
          <div className="section-header"><i className="fas fa-sliders-h" />Adjust Scenarios</div>
          {SLIDERS.map(s => {
            const val = (params as any)[s.key];
            return (
              <div key={s.key} style={{ marginBottom:"1.3rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:"0.85rem", color:"var(--text2)" }}>{s.icon} {s.label}</span>
                  <span style={{ fontWeight:800, color: val>0?"#34d399":val<0?"#ff6b6b":"var(--text3)", fontSize:"0.88rem", minWidth:50, textAlign:"right" }}>
                    {val>0?"+":""}{val}%
                  </span>
                </div>
                <div style={{ position:"relative", height:6, borderRadius:3, background:"rgba(255,255,255,0.08)" }}>
                  {/* Center marker */}
                  <div style={{ position:"absolute", left:"50%", top:"-3px", width:2, height:12, background:"rgba(255,255,255,0.15)", borderRadius:1 }} />
                  <input type="range" min="-50" max="50" value={val}
                    onChange={e => setP(p=>({...p,[s.key]:parseInt(e.target.value)}))}
                    style={{ position:"absolute", inset:0, width:"100%", opacity:0, cursor:"pointer", height:"100%", margin:0 }} />
                  {/* Custom track fill */}
                  <div style={{
                    position:"absolute", height:"100%", borderRadius:3,
                    background: val>=0 ? s.color : "#ff6b6b",
                    left: val>=0 ? "50%" : `${50+val}%`,
                    width: `${Math.abs(val)}%`,
                    transition:"all 0.1s",
                  }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.62rem", color:"var(--text4)", marginTop:4 }}>
                  <span>-50%</span><span>0</span><span>+50%</span>
                </div>
              </div>
            );
          })}
          <div style={{ display:"flex", gap:"0.6rem" }}>
            <button onClick={run} disabled={loading} className="btn btn-primary" style={{ flex:1 }}>
              {loading ? <><div className="spinner spinner-sm"/>Running…</> : <><i className="fas fa-play"/>Run Analysis</>}
            </button>
            <button onClick={() => { setP({ salary_change:0,rent_change:0,discretionary_change:0,all_expenses_change:0 }); setR(null); }}
              className="btn btn-secondary btn-sm"><i className="fas fa-redo"/></button>
          </div>
        </div>

        {/* Results */}
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
          {!result ? (
            <div style={{ color:"var(--text4)", textAlign:"center", paddingTop:"5rem", fontSize:"0.9rem" }}>
              <i className="fas fa-calculator" style={{ fontSize:"3rem", display:"block", marginBottom:14, opacity:0.12 }} />
              Adjust the sliders and run the analysis
            </div>
          ) : (
            <>
              {/* Before / After comparison */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.8rem" }}>
                {["income","expenses","savings"].map(k => (
                  <div key={k} className="card" style={{ padding:"1.2rem" }}>
                    <div className="stat-label" style={{ marginBottom:8, textTransform:"capitalize" }}>{k}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:"0.85rem", color:"var(--text3)" }}>{formatINR((result.before as any)[k])}</span>
                      <span style={{ color:"var(--accent)", fontWeight:700 }}>→</span>
                      <span style={{ fontSize:"1rem", fontWeight:800 }}>{formatINR((result.after as any)[k])}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Savings rate */}
              <div className="card" style={{ padding:"1.4rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span className="stat-label">Savings Rate</span>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ color:"var(--text3)", fontSize:"0.88rem" }}>{result.before.savings_rate}%</span>
                    <span style={{ color:"var(--accent)" }}>→</span>
                    <span style={{ fontWeight:800, fontSize:"1rem", color: result.after.savings_rate>=20?"#34d399":result.after.savings_rate>=10?"#fbbf24":"#ff6b6b" }}>
                      {result.after.savings_rate}%
                    </span>
                  </div>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{
                    width:`${Math.min(result.after.savings_rate,50)*2}%`,
                    background: result.after.savings_rate>=20?"#34d399":result.after.savings_rate>=10?"#fbbf24":"#ff6b6b",
                  }} />
                </div>
              </div>

              {/* Impact summary */}
              <div className="card" style={{ padding:"1.5rem", background: diff>=0?"rgba(52,211,153,0.04)":"rgba(255,107,107,0.04)", border:`1px solid ${diff>=0?"rgba(52,211,153,0.2)":"rgba(255,107,107,0.2)"}` }}>
                <div style={{ fontSize:"1.5rem", fontWeight:900, color:diff>=0?"#34d399":"#ff6b6b", letterSpacing:"-0.04em", marginBottom:6 }}>
                  {diff>=0?"💚 You'd save ":"💔 You'd lose "}
                  {formatINR(Math.abs(diff))} more/month
                </div>
                <div style={{ color:"var(--text2)", fontSize:"0.88rem", marginBottom:8 }}>
                  That's {formatINR(Math.abs(result.savings_diff_annual))} {diff>=0?"more":"less"} per year
                </div>
                {result.warning && (
                  <div style={{ display:"flex", alignItems:"center", gap:8, padding:"0.6rem 0.8rem", background:"rgba(255,107,107,0.08)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:8, fontSize:"0.8rem", color:"#ff6b6b" }}>
                    <i className="fas fa-exclamation-triangle"/>
                    Savings rate below 10% — this scenario is financially risky
                  </div>
                )}
              </div>

              {/* Advice */}
              <div className="card" style={{ padding:"1.4rem" }}>
                <div className="section-header"><i className="fas fa-lightbulb" />Interpretation</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {diff>=0 ? [
                    `Increasing income or cutting expenses boosts your monthly savings by ${formatINR(diff)}.`,
                    `Over 12 months, this compounds to ${formatINR(result.savings_diff_annual)} in additional savings.`,
                    result.after.savings_rate >= 20 ? "Great! You'd hit the recommended 20% savings rate." : "Consider pushing toward 20% savings rate for financial security.",
                  ] : [
                    `This scenario reduces your monthly savings by ${formatINR(Math.abs(diff))}.`,
                    `That's ${formatINR(Math.abs(result.savings_diff_annual))} less per year — review if necessary.`,
                    "Try adjusting other categories to compensate for this change.",
                  ].map((t,i) => (
                    <div key={i} style={{ display:"flex", gap:8, fontSize:"0.84rem", color:"var(--text2)", lineHeight:1.5 }}>
                      <span style={{ color:"var(--accent)", flexShrink:0 }}>•</span>{t}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
