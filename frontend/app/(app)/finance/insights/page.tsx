"use client";
import { useEffect, useState } from "react";
import { getAIInsights } from "@/lib/api";
import { PageHeader, Loading, AIError } from "@/components/ui";

export default function FinanceInsights() {
  const [data, setData]   = useState<any>(null);
  const [loading, setL]   = useState(true);

  useEffect(() => {
    getAIInsights().then(r => setData(r.data)).finally(() => setL(false));
  }, []);

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
    </div>
  );
}
