"use client";
import { useEffect, useState } from "react";
import { getAlerts, dismissAlert, runAlertChecks } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { await runAlertChecks(); const r = await getAlerts({ dismissed:false }); setAlerts(r.data.alerts); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const dismiss = async (id: string) => {
    try { await dismissAlert(id); toast.success("Dismissed"); setAlerts(a => a.filter(x => x.id!==id)); }
    catch { toast.error("Failed"); }
  };

  const isCritical = (s: string) => s === "critical";

  return (
    <div className="fade-in">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",paddingBottom:"1rem",borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.12)",display:"flex",alignItems:"center",justifyContent:"center",color:"#ff6b6b",fontSize:"1.1rem" }}>
            <i className="fas fa-bell" />
          </div>
          <div>
            <h1 style={{ fontSize:"1.4rem",fontWeight:800,letterSpacing:"-0.02em" }}>Alerts</h1>
            <p style={{ color:"rgba(255,255,255,0.35)",fontSize:"0.78rem" }}>{alerts.length} active alert{alerts.length!==1?"s":""}</p>
          </div>
        </div>
        <button onClick={load} className="btn-ghost" style={{ fontSize:"0.8rem" }}>
          <i className="fas fa-sync-alt" /> Refresh
        </button>
      </div>

      {loading ? <div style={{ display:"flex",justifyContent:"center",padding:"4rem" }}><div className="spinner" /></div>
      : alerts.length===0 ? (
        <div className="card" style={{ padding:"4rem",textAlign:"center" }}>
          <i className="fas fa-check-circle" style={{ fontSize:"3.5rem",color:"rgba(76,217,176,0.3)",display:"block",marginBottom:"1rem" }} />
          <div style={{ color:"rgba(255,255,255,0.5)",fontWeight:700,fontSize:"1.1rem",marginBottom:4 }}>All Clear!</div>
          <div style={{ color:"rgba(255,255,255,0.25)",fontSize:"0.85rem" }}>No active alerts for this month.</div>
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:"0.8rem" }}>
          {alerts.map(a => (
            <div key={a.id} className="card" style={{ padding:"1.3rem 1.8rem", borderLeft:`3px solid ${isCritical(a.severity)?"#ff6b6b":"#ffd93d"}` }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"1rem" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap" }}>
                    <i className={isCritical(a.severity)?"fas fa-exclamation-triangle":"fas fa-exclamation-circle"}
                      style={{ color:isCritical(a.severity)?"#ff6b6b":"#ffd93d" }} />
                    <span style={{ fontWeight:700,fontSize:"0.95rem" }}>{a.title}</span>
                    <span className={`badge ${isCritical(a.severity)?"badge-danger":"badge-warning"}`}>
                      {a.severity.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ color:"rgba(255,255,255,0.55)",fontSize:"0.85rem",marginBottom:4,lineHeight:1.5 }}>{a.message}</p>
                  {a.impact && <p style={{ color:"rgba(255,255,255,0.35)",fontSize:"0.78rem",marginBottom:8 }}>Impact: {a.impact}</p>}
                  <div style={{ display:"flex",gap:"0.6rem",marginTop:"0.8rem" }}>
                    <Link href="/budget" style={{
                      padding:"0.4rem 1rem",borderRadius:"0.6rem",fontSize:"0.78rem",fontWeight:700,
                      background:"rgba(76,217,176,0.1)",color:"#4cd9b0",border:"1px solid rgba(76,217,176,0.2)",
                      textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6,
                    }}><i className="fas fa-sliders-h" /> Adjust Budget</Link>
                    <button onClick={() => dismiss(a.id)} className="btn-ghost" style={{ padding:"0.4rem 1rem",fontSize:"0.78rem" }}>
                      Dismiss
                    </button>
                  </div>
                </div>
                <div style={{ fontSize:"0.7rem",color:"rgba(255,255,255,0.25)",whiteSpace:"nowrap",marginTop:2 }}>
                  {formatDate(a.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
