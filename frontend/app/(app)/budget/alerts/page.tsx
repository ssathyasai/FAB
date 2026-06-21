"use client";
import { useEffect, useState } from "react";
import { getAlerts, dismissAlert, runAlertChecks } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { PageHeader, Loading, Empty } from "@/components/ui";
import toast from "react-hot-toast";
import Link from "next/link";

export default function BudgetAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setL]     = useState(true);

  const load = async () => {
    try { await runAlertChecks(); const r = await getAlerts({ dismissed:false }); setAlerts(r.data.alerts); }
    finally { setL(false); }
  };
  useEffect(()=>{ load(); },[]);

  const dismiss = async (id: string) => {
    try { await dismissAlert(id); toast.success("Dismissed"); setAlerts(a=>a.filter(x=>x.id!==id)); }
    catch { toast.error("Failed"); }
  };

  if (loading) return <Loading text="Checking alerts…"/>;

  return (
    <div className="page-enter">
      <PageHeader icon="fas fa-bell" title="Alerts" color="#f0b429"
        sub={`${alerts.length} active alert${alerts.length!==1?"s":""} this month`}>
        <button onClick={load} className="btn btn-secondary btn-sm"><i className="fas fa-sync-alt"/> Refresh</button>
      </PageHeader>

      {alerts.length === 0
        ? (
          <div className="card" style={{ padding:"4rem",textAlign:"center" }}>
            <i className="fas fa-check-circle" style={{ fontSize:"3.5rem",color:"rgba(52,211,153,0.25)",display:"block",marginBottom:"1rem" }}/>
            <div style={{ fontWeight:700,fontSize:"1rem",color:"var(--text2)",marginBottom:5 }}>All Clear!</div>
            <div style={{ color:"var(--text3)",fontSize:"0.85rem" }}>No active alerts for this month.</div>
          </div>
        )
        : (
          <div style={{ display:"flex",flexDirection:"column",gap:"0.8rem" }}>
            {alerts.map(a=>{
              const isCrit = a.severity==="critical";
              const borderCol = isCrit?"#ff6b6b":"#fbbf24";
              return (
                <div key={a.id} className="card" style={{ padding:"1.4rem 1.8rem",borderLeft:`3px solid ${borderCol}` }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"1rem" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap" }}>
                        <i className={isCrit?"fas fa-exclamation-triangle":"fas fa-exclamation-circle"} style={{ color:borderCol }}/>
                        <span style={{ fontWeight:700,fontSize:"0.95rem" }}>{a.title}</span>
                        <span className={`badge ${isCrit?"badge-red":"badge-amber"}`}>{a.severity.toUpperCase()}</span>
                      </div>
                      <p style={{ color:"var(--text2)",fontSize:"0.85rem",lineHeight:1.5,marginBottom:5 }}>{a.message}</p>
                      {a.impact && <p style={{ color:"var(--text3)",fontSize:"0.78rem",marginBottom:10 }}>Impact: {a.impact}</p>}
                      <div style={{ display:"flex",gap:"0.6rem",marginTop:8,flexWrap:"wrap" }}>
                        <Link href="/budget/plan" style={{
                           padding:"0.4rem 1rem",borderRadius:8,fontSize:"0.78rem",fontWeight:700,
                           background:"var(--accent-dim)",color:"var(--accent)",
                           border:"1px solid var(--accent-glow)",textDecoration:"none",
                           display:"inline-flex",alignItems:"center",gap:6,
                        }}><i className="fas fa-sliders-h"/> Adjust Budget</Link>
                        <button onClick={()=>dismiss(a.id)} className="btn btn-secondary btn-sm">Dismiss</button>
                      </div>
                    </div>
                    <div style={{ fontSize:"0.7rem",color:"var(--text4)",whiteSpace:"nowrap",marginTop:2 }}>
                      {formatDate(a.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}
