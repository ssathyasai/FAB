"use client";
import { useEffect, useState } from "react";
import { getAIInsights, getWhatIf } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { PageHeader, Loading, AIError } from "@/components/ui";

export default function FinanceInsights() {
  const [data, setData]   = useState<any>(null);
  const [loading, setL]   = useState(true);
  const [wiParams, setWI] = useState({ salary_change:0, rent_change:0, discretionary_change:0, all_expenses_change:0 });
  const [wiResult, setWR] = useState<any>(null);
  const [wiLoad, setWL]   = useState(false);

  useEffect(() => {
    getAIInsights().then(r => setData(r.data)).finally(() => setL(false));
  }, []);

  const runWhatIf = async () => {
    setWL(true);
    try { const r = await getWhatIf(wiParams); setWR(r.data); }
    catch {} finally { setWL(false); }
  };

  if (loading) return <Loading text="Generating insights..." />;

  return (
    <div className="page-enter">
      <PageHeader icon="fas fa-lightbulb" title="AI Insights" color="#4f8ef7"
        sub="Powered by Gemini AI · Rule-based fallback when quota exceeded" />

      {/* AI error banner */}
      {data?._ai_error && <div style={{ marginBottom:"1.2rem" }}><AIError message={data._ai_error} /></div>}

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem" }}>
        <div className="card" style={{ padding:"1.5rem" }}>
          <div className="section-header"><i className="fas fa-brain" />Spending Pattern</div>
          <div style={{ fontWeight:700,fontSize:"1rem",color:"#4f8ef7",lineHeight:1.4 }}>{data?.spending_pattern ?? "—"}</div>
        </div>
        <div className="card" style={{ padding:"1.5rem" }}>
          <div className="section-header"><i className="fas fa-exchange-alt" />vs Last Month</div>
          <div style={{ fontWeight:600,fontSize:"0.9rem",color:"var(--text2)",lineHeight:1.5 }}>{data?.month_comparison ?? "—"}</div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.5rem" }}>
        <div className="card" style={{ padding:"1.5rem" }}>
          <div className="section-header"><i className="fas fa-chart-bar" />Key Insights</div>
          {(data?.top_3_insights ?? []).map((ins: string, i: number) => (
            <div key={i} style={{ display:"flex",gap:10,marginBottom:10,padding:"0.6rem 0.8rem",background:"rgba(255,255,255,0.03)",borderRadius:8 }}>
              <span style={{ color:"#4f8ef7",fontWeight:700,flexShrink:0 }}>{i+1}.</span>
              <span style={{ color:"var(--text2)",fontSize:"0.87rem",lineHeight:1.5 }}>{ins}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding:"1.5rem" }}>
          <div className="section-header"><i className="fas fa-lightbulb" />Personalized Advice</div>
          {(data?.personalized_advice ?? []).map((a: string, i: number) => (
            <div key={i} style={{ display:"flex",gap:10,marginBottom:10,padding:"0.6rem 0.8rem",background:"rgba(79,142,247,0.04)",borderRadius:8,border:"1px solid rgba(79,142,247,0.08)" }}>
              <span style={{ color:"#fbbf24",flexShrink:0 }}>💡</span>
              <span style={{ color:"var(--text2)",fontSize:"0.87rem",lineHeight:1.5 }}>{a}</span>
            </div>
          ))}
        </div>
      </div>

      {/* What-If Analysis */}
      <div className="card" style={{ padding:"1.5rem" }}>
        <div className="section-header"><i className="fas fa-calculator" />What-If Analysis</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem" }}>
          <div>
            {[["salary_change","💼 Salary Change"],["rent_change","🏠 Rent Change"],["discretionary_change","🛍️ Shopping + Entertainment"],["all_expenses_change","📊 All Expenses"]].map(([k,l]) => (
              <div key={k} style={{ marginBottom:"1rem" }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.8rem",marginBottom:4 }}>
                  <span style={{ color:"var(--text2)" }}>{l}</span>
                  <span style={{ color:(wiParams as any)[k]>=0?"#34d399":"#f87171",fontWeight:700 }}>
                    {(wiParams as any)[k]>=0?"+":""}{(wiParams as any)[k]}%
                  </span>
                </div>
                <input type="range" min="-50" max="50" value={(wiParams as any)[k]}
                  onChange={e => setWI(p => ({ ...p,[k]:parseInt(e.target.value) }))}
                  style={{ width:"100%",accentColor:"#4f8ef7" }} />
              </div>
            ))}
            <button onClick={runWhatIf} disabled={wiLoad} className="btn btn-primary btn-full">
              {wiLoad ? <><div className="spinner spinner-sm" /> Running...</> : "Run Analysis"}
            </button>
          </div>
          <div>
            {wiResult ? (
              <div style={{ display:"flex",flexDirection:"column",gap:"0.7rem" }}>
                {["income","expenses","savings"].map(k => (
                  <div key={k} className="card-sm" style={{ padding:"0.8rem 1rem" }}>
                    <div className="stat-label">{k}</div>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:4 }}>
                      <span style={{ color:"var(--text3)",fontSize:"0.85rem" }}>{formatINR((wiResult.before as any)[k])}</span>
                      <span style={{ color:"#4f8ef7" }}>→</span>
                      <span style={{ fontWeight:700,color:"#fff" }}>{formatINR((wiResult.after as any)[k])}</span>
                    </div>
                  </div>
                ))}
                <div style={{ padding:"0.9rem 1rem",borderRadius:10,background:wiResult.savings_diff_monthly>=0?"rgba(52,211,153,0.06)":"rgba(248,113,113,0.06)",border:`1px solid ${wiResult.savings_diff_monthly>=0?"rgba(52,211,153,0.2)":"rgba(248,113,113,0.2)"}` }}>
                  <div style={{ fontWeight:700,color:wiResult.savings_diff_monthly>=0?"#34d399":"#f87171",fontSize:"0.92rem" }}>
                    {wiResult.savings_diff_monthly>=0?"💚 Save":"💔 Lose"} {formatINR(Math.abs(wiResult.savings_diff_monthly))}/month
                  </div>
                  <div style={{ color:"var(--text3)",fontSize:"0.78rem",marginTop:3 }}>
                    {formatINR(Math.abs(wiResult.savings_diff_annual))}/year · Savings rate: {wiResult.after.savings_rate}%
                  </div>
                  {wiResult.warning && <div style={{ color:"#f87171",fontSize:"0.72rem",marginTop:5 }}>⚠ Savings below 10% — risky</div>}
                </div>
              </div>
            ) : (
              <div style={{ color:"var(--text4)",textAlign:"center",paddingTop:"3rem",fontSize:"0.85rem" }}>
                Adjust sliders and run analysis
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
