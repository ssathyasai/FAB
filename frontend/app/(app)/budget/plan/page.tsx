"use client";
import { useEffect, useState } from "react";
import { getCurrentBudget, setupBudget, rolloverBudget } from "@/lib/api";
import { formatINR, CATEGORY_ICONS, EXPENSE_CATEGORIES } from "@/lib/utils";
import { PageHeader, Loading, Empty } from "@/components/ui";
import toast from "react-hot-toast";

const ALL_CATS = [...EXPENSE_CATEGORIES, "Savings"];
const DEFAULTS: Record<string,number> = {
  Housing:25, Food:15, Transport:8, Utilities:5, Healthcare:5,
  Education:5, Shopping:8, Entertainment:4, Others:5, Savings:20,
};

export default function BudgetPlan() {
  const [budget, setBudget] = useState<any>(null);
  const [loading, setL]     = useState(true);
  const [setup, setSetup]   = useState(false);
  const [income, setIncome] = useState("");
  const [iType, setIType]   = useState("fixed");
  const [minInc, setMinInc] = useState("");
  const [alloc, setAlloc]   = useState<Record<string,number>>({...DEFAULTS});

  const load = async () => {
    try { const r = await getCurrentBudget(); setBudget(r.data.budget); }
    finally { setL(false); }
  };
  useEffect(()=>{ load(); },[]);

  const total = Object.values(alloc).reduce((s,v)=>s+v,0);
  const inc   = parseFloat(income)||0;
  const rem   = 100 - total;

  const doSave = async () => {
    if (!income) return toast.error("Enter monthly income");
    if (total > 100) return toast.error("Allocations exceed 100%");
    try {
      const baseline = iType==="variable" ? (parseFloat(minInc)||inc) : inc;
      await setupBudget({ income_baseline:baseline, income_type:iType, allocations:alloc });
      toast.success("Budget saved!"); setSetup(false); load();
    } catch { toast.error("Failed to save"); }
  };

  const doRollover = async () => {
    try { const r = await rolloverBudget(); toast(r.data.message); if(r.data.rolled_over) load(); }
    catch { toast.error("Rollover failed"); }
  };

  if (loading) return <Loading text="Loading budget…" />;

  /* ── No budget prompt ── */
  if (!budget && !setup) return (
    <div className="page-enter" style={{ maxWidth:600, margin:"0 auto", marginTop:"3rem" }}>
      <div className="card" style={{ padding:"3rem", textAlign:"center" }}>
        <div style={{ width:64,height:64,borderRadius:20,background:"var(--accent-dim)",border:"1px solid rgba(240,180,41,0.2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1.2rem",color:"var(--accent)",fontSize:"1.8rem" }}>
          <i className="fas fa-wallet"/>
        </div>
        <h2 style={{ fontWeight:800,fontSize:"1.3rem",marginBottom:6 }}>No Budget Set Up</h2>
        <p style={{ color:"var(--text3)",fontSize:"0.88rem",marginBottom:"2rem",lineHeight:1.6 }}>
          Set up your monthly budget to start tracking spending and get smart alerts.
        </p>
        <div style={{ display:"flex",gap:"0.8rem",justifyContent:"center",flexWrap:"wrap" }}>
          <button onClick={()=>setSetup(true)} className="btn btn-primary"><i className="fas fa-plus"/> Create Budget</button>
          <button onClick={doRollover} className="btn btn-secondary"><i className="fas fa-sync"/> Rollover Last Month</button>
        </div>
      </div>
    </div>
  );

  /* ── Setup wizard ── */
  if (setup) return (
    <div className="page-enter" style={{ maxWidth:680 }}>
      <PageHeader icon="fas fa-wallet" title="Budget Setup" color="#f0b429"
        sub="Indian average spending ratios pre-filled as defaults">
        <button onClick={()=>setSetup(false)} className="btn btn-secondary btn-sm">✕ Cancel</button>
      </PageHeader>

      {/* Step 1 — Income */}
      <div className="card" style={{ padding:"1.8rem",marginBottom:"1rem" }}>
        <div className="section-header"><i className="fas fa-rupee-sign"/>Step 1 — Monthly Income</div>
        <div style={{ display:"flex",flexDirection:"column",gap:"0.9rem" }}>
          <div>
            <label className="label">Monthly Take-Home Income (₹)</label>
            <input className="input" type="number" placeholder="e.g. 80000" value={income} onChange={e=>setIncome(e.target.value)}/>
          </div>
          <div>
            <label className="label">Income Type</label>
            <div style={{ display:"flex",gap:6 }}>
              {[["fixed","Fixed (Same every month)"],["variable","Variable (Changes month to month)"]].map(([v,l])=>(
                <button key={v} onClick={()=>setIType(v)} style={{
                  flex:1,padding:"0.65rem",borderRadius:9,
                  border:`1px solid ${iType===v?"var(--accent)":"rgba(255,255,255,0.07)"}`,
                  background:iType===v?"var(--accent-dim)":"rgba(255,255,255,0.02)",
                  color:iType===v?"var(--accent)":"var(--text3)",
                  cursor:"pointer",fontSize:"0.82rem",fontWeight:600,fontFamily:"Inter",
                }}>{l}</button>
              ))}
            </div>
          </div>
          {iType==="variable" && (
            <div>
              <label className="label">Minimum Monthly Income (₹)</label>
              <input className="input" type="number" placeholder="Minimum you reliably receive" value={minInc} onChange={e=>setMinInc(e.target.value)}/>
              <div style={{ fontSize:"0.7rem",color:"var(--text3)",marginTop:4 }}>This is your budget baseline</div>
            </div>
          )}
        </div>
      </div>

      {/* Step 2 — Sliders */}
      <div className="card" style={{ padding:"1.8rem",marginBottom:"1rem" }}>
        <div className="section-header"><i className="fas fa-sliders-h"/>Step 2 — Expense Profile</div>
        <p style={{ color:"var(--text3)",fontSize:"0.8rem",marginBottom:"1.2rem" }}>
          Slide each category. Remainder below 100% goes to Savings automatically.
        </p>
        <div style={{ display:"flex",flexDirection:"column",gap:"1rem" }}>
          {ALL_CATS.map(cat=>{
            const pct = alloc[cat]||0;
            const amt = inc > 0 ? Math.round((pct/100)*inc) : 0;
            return (
              <div key={cat}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                  <span style={{ fontSize:"0.85rem",color:"var(--text2)" }}>{CATEGORY_ICONS[cat]} {cat}</span>
                  <span style={{ fontWeight:800,color:"var(--accent)",fontSize:"0.88rem" }}>
                    {pct}%{inc>0?` · ${formatINR(amt)}`:""}
                  </span>
                </div>
                <input type="range" min="0" max="50" value={pct}
                  onChange={e=>setAlloc(a=>({...a,[cat]:parseInt(e.target.value)}))}
                  style={{ width:"100%",accentColor:"var(--accent)",cursor:"pointer" }}/>
              </div>
            );
          })}
        </div>
        {/* Total pill */}
        <div style={{ marginTop:"1.2rem",padding:"0.9rem 1.2rem",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center",
          background:total>100?"rgba(255,107,107,0.06)":"rgba(240,180,41,0.04)",
          border:`1px solid ${total>100?"rgba(255,107,107,0.2)":"rgba(240,180,41,0.15)"}` }}>
          <span style={{ color:"var(--text2)",fontSize:"0.88rem" }}>
            Total: <strong style={{ color:total>100?"#ff6b6b":"#fff",fontSize:"1rem" }}>{total}%</strong>
          </span>
          {total>100
            ? <span style={{ color:"#ff6b6b",fontSize:"0.82rem",fontWeight:700 }}>⚠ Exceeds by ₹{formatINR(((total-100)/100)*inc)}</span>
            : rem>0
            ? <span style={{ color:"var(--accent)",fontSize:"0.82rem" }}>+{rem}% → added to Savings</span>
            : <span style={{ color:"var(--accent)",fontSize:"0.82rem" }}>✓ Perfect allocation</span>
          }
        </div>
      </div>

      {/* Step 3 — Preview */}
      {inc > 0 && (
        <div className="card" style={{ padding:"1.8rem",marginBottom:"1rem" }}>
          <div className="section-header"><i className="fas fa-list-ul"/>Step 3 — Budget Summary</div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:"0.7rem" }}>
            {ALL_CATS.filter(c=>(alloc[c]||0)>0).map(cat=>{
              const monthly = Math.round(((alloc[cat]||0)/100)*inc);
              const daily   = Math.round(monthly/30);
              return (
                <div key={cat} style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"0.9rem" }}>
                  <div style={{ fontWeight:700,fontSize:"0.85rem",marginBottom:4 }}>{CATEGORY_ICONS[cat]} {cat}</div>
                  <div style={{ color:"var(--accent)",fontWeight:800,fontSize:"0.95rem" }}>
                    {formatINR(monthly)}<span style={{ color:"var(--text4)",fontWeight:400,fontSize:"0.68rem" }}>/mo</span>
                  </div>
                  <div style={{ color:"var(--text4)",fontSize:"0.68rem",marginTop:2 }}>≈ {formatINR(daily)}/day</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={doSave} className="btn btn-primary btn-full" style={{ fontSize:"0.95rem" }}>
        <i className="fas fa-save"/> Save Budget
      </button>
    </div>
  );

  /* ── Budget tracking view ── */
  const totalAlloc = budget.categories?.reduce((s:number,c:any)=>s+c.allocated,0)||0;
  const totalSpent = budget.categories?.reduce((s:number,c:any)=>s+c.spent,0)||0;

  return (
    <div className="page-enter">
      <PageHeader icon="fas fa-wallet" title="Budget Plan" color="#f0b429"
        sub={`${budget.days_remaining} days remaining · Baseline: ${formatINR(budget.income_baseline)}`}>
        <button onClick={()=>setSetup(true)} className="btn btn-secondary btn-sm">
          <i className="fas fa-edit"/> Edit Budget
        </button>
      </PageHeader>

      {/* Summary bar */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem" }}>
        {[
          { l:"Allocated", v:totalAlloc,             c:"#fff"    },
          { l:"Spent",     v:totalSpent,             c:"#ff6b6b" },
          { l:"Remaining", v:totalAlloc-totalSpent,  c:"#34d399" },
          { l:"Days Left", v:`${budget.days_remaining} days`, c:"#60a5fa", str:true },
        ].map(s=>(
          <div key={s.l} className="card" style={{ padding:"1.1rem 1.4rem" }}>
            <div className="stat-label">{s.l}</div>
            <div style={{ fontSize:"1.2rem",fontWeight:800,color:s.c,letterSpacing:"-0.03em",marginTop:6 }}>
              {(s as any).str ? s.v : formatINR(s.v as number)}
            </div>
          </div>
        ))}
      </div>

      {/* Category cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"1rem" }}>
        {(budget.categories||[]).map((cat: any)=>{
          const pct  = cat.allocated>0 ? Math.min((cat.spent/cat.allocated)*100,100) : 0;
          const col  = pct>100?"#ff6b6b":pct>80?"#fbbf24":"#34d399";
          const daily= cat.spent / (budget.days_elapsed||1);
          const proj = daily * (budget.days_in_month||30);
          return (
            <div key={cat.name} className="card" style={{ padding:"1.3rem",borderTop:`2px solid ${col}22` }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9 }}>
                <span style={{ fontWeight:700,fontSize:"0.93rem" }}>{CATEGORY_ICONS[cat.name]||"📦"} {cat.name}</span>
                <span style={{ fontWeight:800,fontSize:"0.78rem",color:col,
                  padding:"0.18rem 0.55rem",borderRadius:99,
                  background:`${col}18`,border:`1px solid ${col}33` }}>{pct.toFixed(0)}%</span>
              </div>
              <div className="progress-track" style={{ marginBottom:12 }}>
                <div className="progress-fill" style={{ width:`${pct}%`,background:col }}/>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:"0.75rem" }}>
                {[["Allocated",formatINR(cat.allocated),"var(--text2)"],["Spent",formatINR(cat.spent),col],
                  ["Remaining",formatINR(Math.max(0,cat.allocated-cat.spent)),"#34d399"],["Daily avg",formatINR(daily),"var(--text2)"]].map(([l,v,c])=>(
                  <div key={l as string}>
                    <div style={{ color:"var(--text4)",fontSize:"0.68rem",marginBottom:2 }}>{l}</div>
                    <div style={{ fontWeight:700,color:c as string }}>{v}</div>
                  </div>
                ))}
              </div>
              {proj>cat.allocated && (
                <div style={{ marginTop:10,fontSize:"0.72rem",color:"#ff6b6b",
                  background:"rgba(255,107,107,0.06)",padding:"0.35rem 0.6rem",
                  borderRadius:7,border:"1px solid rgba(255,107,107,0.15)" }}>
                  At this rate: {formatINR(proj)} by month end
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
