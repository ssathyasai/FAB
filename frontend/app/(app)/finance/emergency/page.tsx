"use client";
import { useState } from "react";
import { postEmergencyAdvisor } from "@/lib/api";
import { PageHeader, AIError } from "@/components/ui";

const TYPES = [
  { id:"Job Loss",              icon:"fas fa-briefcase",     color:"#ff6b6b" },
  { id:"Salary Reduction",      icon:"fas fa-arrow-down",    color:"#fbbf24" },
  { id:"Salary Delay",          icon:"fas fa-clock",         color:"#fbbf24" },
  { id:"Medical Emergency",     icon:"fas fa-heartbeat",     color:"#ff6b6b" },
  { id:"Business Loss",         icon:"fas fa-chart-line",    color:"#ff6b6b" },
  { id:"Family Emergency",      icon:"fas fa-users",         color:"#fbbf24" },
  { id:"Home Repair / Property Damage", icon:"fas fa-home", color:"#fbbf24" },
  { id:"Other",                 icon:"fas fa-question-circle",color:"#60a5fa"},
];

const DYNAMIC_FIELDS: Record<string, [string,string][]> = {
  "Job Loss":           [["duration","Expected Unemployment Duration"],["available_assets","Available Assets (e.g. FD, Gold)"],["asset_value","Approximate Asset Value (₹)"]],
  "Salary Reduction":   [["reduction","Reduction Amount / Percentage"],["duration","Expected Duration"],["available_assets","Available Assets"],["asset_value","Asset Value (₹)"]],
  "Salary Delay":       [["delay_duration","Expected Delay Duration"],["available_assets","Available Assets"],["asset_value","Asset Value (₹)"]],
  "Medical Emergency":  [["medical_cost","Estimated Medical Cost (₹)"],["available_assets","Available Assets"],["asset_value","Asset Value (₹)"]],
  "Business Loss":      [["loss_amount","Estimated Business Loss (₹)"],["available_assets","Available Assets"],["asset_value","Asset Value (₹)"]],
  "Family Emergency":   [["financial_impact","Estimated Financial Impact (₹)"],["available_assets","Available Assets"],["asset_value","Asset Value (₹)"]],
  "Home Repair / Property Damage": [["repair_cost","Estimated Repair Cost (₹)"],["available_assets","Available Assets"],["asset_value","Asset Value (₹)"]],
  "Other":              [["description","Describe the Emergency"],["available_assets","Available Assets"],["asset_value","Asset Value (₹)"]],
};

const ROADMAP_SECTIONS: [string,string,string][] = [
  ["immediate_7_days",      "Immediate Actions",       "Next 7 Days"],
  ["short_term_30_days",    "Short-Term Plan",         "Next 30 Days"],
  ["medium_term_90_days",   "Medium-Term Plan",        "Next 90 Days"],
  ["long_term_6_12_months", "Long-Term Recovery Plan", "6–12 Months"],
];

export default function FinanceEmergency() {
  const [eType, setET]        = useState("");
  const [details, setDetails] = useState<Record<string,string>>({});
  const [result, setResult]   = useState<any>(null);
  const [loading, setL]       = useState(false);

  const submit = async () => {
    setL(true);
    try {
      const r = await postEmergencyAdvisor({ emergency_type:eType, emergency_details:details });
      setResult(r.data);
    } catch {} finally { setL(false); }
  };

  const sevColor = (s: string) => ({ high:"#ff6b6b", medium:"#fbbf24", low:"#34d399" }[s?.toLowerCase()] || "#fbbf24");

  return (
    <div className="page-enter">
      <PageHeader icon="fas fa-first-aid" title="Emergency Recovery Advisor" color="#f0b429"
        sub="Get a step-by-step financial recovery plan for any emergency" />

      <div style={{ display:"grid", gridTemplateColumns: result ? "380px 1fr" : "1fr", gap:"1.5rem" }}>
        {/* Left — selection + fields */}
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
          {/* Emergency type grid */}
          <div className="card" style={{ padding:"1.5rem" }}>
            <div className="section-header"><i className="fas fa-exclamation-triangle" />Select Emergency Type</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
              {TYPES.map(t => (
                <button key={t.id} onClick={() => { setET(t.id); setDetails({}); setResult(null); }} style={{
                  padding:"0.8rem 0.7rem", borderRadius:10, textAlign:"left",
                  border:`1px solid ${eType===t.id ? t.color : "rgba(255,255,255,0.07)"}`,
                  background: eType===t.id ? "var(--accent-dim)" : "rgba(255,255,255,0.02)",
                  cursor:"pointer", fontFamily:"Inter", transition:"all 0.15s",
                }}>
                  <i className={t.icon} style={{ color:t.color, fontSize:"1rem", display:"block", marginBottom:5 }} />
                  <span style={{ fontSize:"0.78rem", fontWeight:eType===t.id?700:400, color:eType===t.id?"#fff":"var(--text3)" }}>
                    {t.id}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic fields */}
          {eType && (
            <div className="card" style={{ padding:"1.5rem" }}>
              <div className="section-header"><i className="fas fa-clipboard-list" />Details</div>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.8rem" }}>
                {(DYNAMIC_FIELDS[eType]||[]).map(([k,l]) => (
                  <div key={k}>
                    <label className="label">{l}</label>
                    <input className="input" placeholder={l}
                      value={details[k]||""} onChange={e => setDetails(d=>({...d,[k]:e.target.value}))} />
                  </div>
                ))}
                <button onClick={submit} disabled={loading} className="btn btn-primary btn-full" style={{ marginTop:4 }}>
                  {loading ? <><div className="spinner spinner-sm"/>Building Recovery Plan…</> : "Get Recovery Plan →"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right — results */}
        {!result && !eType && (
          <div style={{ color:"var(--text4)", textAlign:"center", paddingTop:"6rem", fontSize:"0.9rem" }}>
            <i className="fas fa-first-aid" style={{ fontSize:"3rem", display:"block", marginBottom:14, opacity:0.12 }} />
            Select an emergency type to get your recovery plan
          </div>
        )}

        {result && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            {result.error && <AIError message={result.error} />}

            {!result.error && result.situation_assessment && (
              <div className="card" style={{ padding:"1.5rem", borderLeft:`3px solid ${sevColor(result.situation_assessment.severity)}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontWeight:800, color:sevColor(result.situation_assessment.severity), textTransform:"capitalize", fontSize:"0.95rem" }}>
                    {result.situation_assessment.severity} Severity Emergency
                  </span>
                </div>
                <p style={{ color:"var(--text2)", fontSize:"0.88rem", lineHeight:1.6, marginBottom:6 }}>{result.situation_assessment.financial_impact}</p>
                <p style={{ color:"var(--text3)", fontSize:"0.82rem", lineHeight:1.5 }}>{result.situation_assessment.overall_summary}</p>
              </div>
            )}

            {!result.error && (result.top_5_recovery_recommendations||[]).map((rec: any) => (
              <div key={rec.rank} className="card" style={{ padding:"1.3rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontWeight:900, color:"var(--accent)", fontSize:"1.1rem" }}>#{rec.rank}</span>
                    <span style={{ fontWeight:700, fontSize:"0.9rem" }}>{rec.title}</span>
                  </div>
                  <span className={`badge ${rec.priority==="immediate"?"badge-red":"badge-amber"}`}>
                    {rec.priority}
                  </span>
                </div>
                <p style={{ color:"var(--text2)", fontSize:"0.84rem", lineHeight:1.5 }}>{rec.description}</p>
              </div>
            ))}

            {!result.error && result.recovery_roadmap && (
              <div className="card" style={{ padding:"1.5rem" }}>
                <div className="section-header"><i className="fas fa-road" />Recovery Roadmap</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
                  {ROADMAP_SECTIONS.map(([key,title,sub]) => {
                    const items: string[] = result.recovery_roadmap[key] || [];
                    if (!items.length) return null;
                    return (
                      <div key={key} style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"0.9rem 1rem" }}>
                        <div style={{ fontWeight:700, fontSize:"0.82rem", color:"var(--coral)", marginBottom:2 }}>{title}</div>
                        <div style={{ fontSize:"0.68rem", color:"var(--text3)", marginBottom:8 }}>{sub}</div>
                        {items.slice(0,4).map((item,i) => (
                          <div key={i} style={{ display:"flex", gap:6, fontSize:"0.78rem", color:"var(--text2)", marginBottom:4, lineHeight:1.4 }}>
                            <span style={{ color:"var(--coral)", flexShrink:0 }}>→</span>{item}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!result.error && result.expense_cuts?.length > 0 && (
              <div className="card" style={{ padding:"1.3rem" }}>
                <div className="section-header"><i className="fas fa-cut" />Immediate Expense Cuts</div>
                {result.expense_cuts.slice(0,5).map((cut: string, i: number) => (
                  <div key={i} style={{ display:"flex", gap:8, fontSize:"0.84rem", color:"var(--text2)", marginBottom:6 }}>
                    <span style={{ color:"var(--accent)", flexShrink:0 }}>✂</span>{cut}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
