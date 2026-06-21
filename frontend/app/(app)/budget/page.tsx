"use client";
import { useEffect, useState } from "react";
import { getCurrentBudget, setupBudget, rolloverBudget } from "@/lib/api";
import { formatINR, CATEGORY_ICONS, EXPENSE_CATEGORIES } from "@/lib/utils";
import toast from "react-hot-toast";

const ALL_CATS = [...EXPENSE_CATEGORIES, "Savings"];
const DEFAULTS: Record<string,number> = { Housing:25,Food:15,Transport:8,Utilities:5,Healthcare:5,Education:5,Shopping:8,Entertainment:4,Others:5,Savings:20 };

export default function Budget() {
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState(false);
  const [income, setIncome] = useState("");
  const [incomeType, setIT] = useState("fixed");
  const [minIncome, setMin] = useState("");
  const [alloc, setAlloc] = useState<Record<string,number>>({ ...DEFAULTS });

  const load = async () => {
    try { const r = await getCurrentBudget(); setBudget(r.data.budget); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const total = Object.values(alloc).reduce((s,v) => s+v, 0);
  const inc = parseFloat(income) || 0;
  const rem = 100 - total;

  const doSetup = async () => {
    if (!income) return toast.error("Enter your monthly income");
    if (total > 100) return toast.error("Allocations exceed 100%");
    try {
      const baseline = incomeType==="variable" ? (parseFloat(minIncome)||inc) : inc;
      await setupBudget({ income_baseline:baseline, income_type:incomeType, allocations:alloc });
      toast.success("Budget created!"); setSetup(false); load();
    } catch { toast.error("Failed"); }
  };

  const doRollover = async () => {
    try { const r = await rolloverBudget(); toast(r.data.message); if(r.data.rolled_over) load(); }
    catch { toast.error("Rollover failed"); }
  };

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:"4rem" }}><div className="spinner" /></div>;

  /* ── No budget yet ── */
  if (!budget && !setup) return (
    <div className="fade-in" style={{ maxWidth:650,margin:"0 auto",marginTop:"2rem" }}>
      <div className="card" style={{ padding:"3rem 2.5rem",textAlign:"center" }}>
        <div style={{ width:64,height:64,borderRadius:18,background:"rgba(76,217,176,0.12)",border:"1px solid rgba(76,217,176,0.12)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1.2rem",color:"#4cd9b0",fontSize:"1.8rem" }}>
          <i className="fas fa-wallet" />
        </div>
        <h2 style={{ fontWeight:800,fontSize:"1.3rem",marginBottom:"0.4rem" }}>No Budget Set Up</h2>
        <p style={{ color:"rgba(255,255,255,0.4)",fontSize:"0.9rem",marginBottom:"2rem",lineHeight:1.6 }}>
          Set up your monthly budget to track spending against your income and get smart alerts.
        </p>
        <div style={{ display:"flex",gap:"0.8rem",justifyContent:"center",flexWrap:"wrap" }}>
          <button onClick={() => setSetup(true)} className="btn-primary" style={{ width:"auto",padding:"0.75rem 2rem" }}>
            <i className="fas fa-plus" /> Create Budget
          </button>
          <button onClick={doRollover} className="btn-ghost" style={{ padding:"0.75rem 2rem" }}>
            <i className="fas fa-sync" /> Rollover Last Month
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Setup wizard ── */
  if (setup) return (
    <div className="fade-in" style={{ maxWidth:700,margin:"0 auto" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",paddingBottom:"1rem",borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:"rgba(76,217,176,0.12)",border:"1px solid rgba(76,217,176,0.08)",display:"flex",alignItems:"center",justifyContent:"center",color:"#4cd9b0",fontSize:"1.1rem" }}>
            <i className="fas fa-wallet" />
          </div>
          <div>
            <h1 style={{ fontSize:"1.4rem",fontWeight:800,letterSpacing:"-0.02em" }}>Budget Setup</h1>
            <p style={{ color:"rgba(255,255,255,0.35)",fontSize:"0.78rem" }}>Indian average spending ratios pre-filled</p>
          </div>
        </div>
        <button onClick={() => setSetup(false)} className="btn-ghost" style={{ padding:"0.4rem 0.8rem",fontSize:"0.8rem" }}>✕ Cancel</button>
      </div>

      {/* Step 1 */}
      <div className="card" style={{ padding:"1.8rem 2rem",marginBottom:"1rem" }}>
        <div className="section-title"><i className="fas fa-rupee-sign" />Step 1 — Monthly Income</div>
        <div style={{ display:"flex",flexDirection:"column",gap:"0.9rem" }}>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label>Monthly Take-Home Income (₹)</label>
            <input className="input-field" type="number" placeholder="e.g. 80000" value={income} onChange={e => setIncome(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label>Is it the same every month?</label>
            <div style={{ display:"flex",gap:8 }}>
              {[["fixed","Yes — Fixed"],["variable","No — Variable"]].map(([v,l]) => (
                <button key={v} onClick={() => setIT(v)} style={{
                  flex:1,padding:"0.65rem",borderRadius:"0.8rem",
                  border:`1px solid ${incomeType===v?"#4cd9b0":"rgba(255,255,255,0.06)"}`,
                  background: incomeType===v?"rgba(76,217,176,0.1)":"rgba(255,255,255,0.02)",
                  color: incomeType===v?"#4cd9b0":"rgba(255,255,255,0.4)",
                  cursor:"pointer",fontSize:"0.82rem",fontWeight:600,fontFamily:"Inter,sans-serif",transition:"0.2s",
                }}>{l}</button>
              ))}
            </div>
          </div>
          {incomeType==="variable" && (
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Minimum you reliably receive (₹)</label>
              <input className="input-field" type="number" placeholder="Minimum income baseline" value={minIncome} onChange={e => setMin(e.target.value)} />
              <div className="hint">This becomes the income baseline used for budget calculations</div>
            </div>
          )}
        </div>
      </div>

      {/* Step 2 */}
      <div className="card" style={{ padding:"1.8rem 2rem",marginBottom:"1rem" }}>
        <div className="section-title"><i className="fas fa-sliders-h" />Step 2 — Expense Profile</div>
        <p style={{ color:"rgba(255,255,255,0.35)",fontSize:"0.8rem",marginBottom:"1.2rem" }}>Slide each category. If total &lt; 100%, remainder goes to Savings automatically.</p>
        <div style={{ display:"flex",flexDirection:"column",gap:"0.9rem" }}>
          {ALL_CATS.map(cat => {
            const pct = alloc[cat]||0;
            const amt = inc>0 ? Math.round((pct/100)*inc) : 0;
            return (
              <div key={cat}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.82rem",marginBottom:4 }}>
                  <span style={{ color:"rgba(255,255,255,0.65)" }}>{CATEGORY_ICONS[cat]} {cat}</span>
                  <span style={{ color:"#4cd9b0",fontWeight:700 }}>{pct}%{inc>0?` · ${formatINR(amt)}`:""}</span>
                </div>
                <input type="range" min="0" max="50" value={pct}
                  onChange={e => setAlloc(a => ({ ...a,[cat]:parseInt(e.target.value) }))}
                  style={{ width:"100%",accentColor:"#4cd9b0",cursor:"pointer" }} />
              </div>
            );
          })}
        </div>
        {/* Total indicator */}
        <div style={{
          marginTop:"1.2rem",padding:"0.8rem 1rem",borderRadius:"0.8rem",
          background: total>100?"rgba(255,107,107,0.06)":"rgba(76,217,176,0.04)",
          border:`1px solid ${total>100?"rgba(255,107,107,0.15)":"rgba(76,217,176,0.1)"}`,
          display:"flex",justifyContent:"space-between",alignItems:"center",
        }}>
          <span style={{ fontSize:"0.85rem",color:"rgba(255,255,255,0.55)" }}>
            Total: <strong style={{ color:total>100?"#ff6b6b":"#fff",fontSize:"1rem" }}>{total}%</strong>
          </span>
          {total>100
            ? <span style={{ color:"#ff6b6b",fontSize:"0.8rem",fontWeight:600 }}>⚠ Exceeds by ₹{formatINR(((total-100)/100)*inc)}</span>
            : rem>0
            ? <span style={{ color:"#4cd9b0",fontSize:"0.8rem" }}>+{rem}% → Savings</span>
            : <span style={{ color:"#4cd9b0",fontSize:"0.8rem" }}>✓ Perfect</span>
          }
        </div>
      </div>

      {/* Step 3 preview */}
      {inc>0 && (
        <div className="card" style={{ padding:"1.8rem 2rem",marginBottom:"1rem" }}>
          <div className="section-title"><i className="fas fa-list-ul" />Step 3 — Budget Summary</div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"0.7rem" }}>
            {ALL_CATS.filter(c => (alloc[c]||0)>0).map(cat => {
              const monthly = Math.round(((alloc[cat]||0)/100)*inc);
              const daily   = Math.round(monthly/30);
              return (
                <div key={cat} className="card-inner" style={{ padding:"0.85rem" }}>
                  <div style={{ fontWeight:700,fontSize:"0.85rem",marginBottom:3 }}>{CATEGORY_ICONS[cat]} {cat}</div>
                  <div style={{ color:"#4cd9b0",fontWeight:800,fontSize:"0.95rem" }}>{formatINR(monthly)}<span style={{ color:"rgba(255,255,255,0.3)",fontWeight:400,fontSize:"0.7rem" }}>/mo</span></div>
                  <div style={{ color:"rgba(255,255,255,0.3)",fontSize:"0.68rem",marginTop:2 }}>≈ {formatINR(daily)}/day</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={doSetup} className="btn-primary" style={{ fontSize:"0.95rem" }}>
        <i className="fas fa-save" /> Save Budget
      </button>
    </div>
  );

  /* ── Budget exists — tracking view ── */
  const totalAlloc = budget.categories?.reduce((s: number,c: any) => s+c.allocated,0)||0;
  const totalSpent = budget.categories?.reduce((s: number,c: any) => s+c.spent,0)||0;

  return (
    <div className="fade-in">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",paddingBottom:"1rem",borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:"rgba(76,217,176,0.12)",border:"1px solid rgba(76,217,176,0.08)",display:"flex",alignItems:"center",justifyContent:"center",color:"#4cd9b0",fontSize:"1.1rem" }}>
            <i className="fas fa-wallet" />
          </div>
          <div>
            <h1 style={{ fontSize:"1.4rem",fontWeight:800,letterSpacing:"-0.02em" }}>Budget Tracking</h1>
            <p style={{ color:"rgba(255,255,255,0.35)",fontSize:"0.78rem" }}>
              {budget.days_remaining} days remaining · Baseline: {formatINR(budget.income_baseline)}
            </p>
          </div>
        </div>
        <button onClick={() => setSetup(true)} className="btn-ghost" style={{ fontSize:"0.8rem" }}>
          <i className="fas fa-edit" /> Edit Budget
        </button>
      </div>

      {/* Summary row */}
      <div className="info-bar" style={{ marginBottom:"1.5rem" }}>
        {[["fas fa-coins","Allocated",formatINR(totalAlloc)],["fas fa-arrow-up","Spent",formatINR(totalSpent)],["fas fa-piggy-bank","Remaining",formatINR(totalAlloc-totalSpent)],["fas fa-calendar","Days Left",budget.days_remaining+" days"]].map(([icon,label,val]) => (
          <div key={label} className="info-bar-item">
            <i className={icon} /><strong>{label}</strong> — {val}
          </div>
        ))}
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"1rem" }}>
        {(budget.categories||[]).map((cat: any) => {
          const pct = cat.allocated>0 ? Math.min((cat.spent/cat.allocated)*100,100) : 0;
          const col = pct>100?"#ff6b6b":pct>80?"#ffd93d":"#4cd9b0";
          const daily = cat.spent/(budget.days_elapsed||1);
          const proj  = daily*(budget.days_in_month||30);
          return (
            <div key={cat.name} className="card" style={{ padding:"1.3rem 1.5rem" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                <span style={{ fontWeight:700,fontSize:"0.95rem" }}>{CATEGORY_ICONS[cat.name]||"📦"} {cat.name}</span>
                <span style={{ fontSize:"0.65rem",fontWeight:700,padding:"0.2rem 0.5rem",borderRadius:20,
                  background: pct>100?"rgba(255,107,107,0.12)":pct>80?"rgba(255,217,61,0.12)":"rgba(76,217,176,0.1)",
                  color:col
                }}>{pct.toFixed(0)}%</span>
              </div>
              <div style={{ height:5,background:"rgba(255,255,255,0.04)",borderRadius:4,overflow:"hidden",marginBottom:10 }}>
                <div style={{ height:"100%",width:`${pct}%`,background:col,borderRadius:4,transition:"width 0.5s" }} />
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
                {[["Allocated",formatINR(cat.allocated),"rgba(255,255,255,0.4)"],["Spent",formatINR(cat.spent),col],["Remaining",formatINR(Math.max(0,cat.allocated-cat.spent)),"#4cd9b0"],["Daily avg",formatINR(daily),"rgba(255,255,255,0.4)"]].map(([l,v,c]) => (
                  <div key={l} style={{ fontSize:"0.72rem",color:"rgba(255,255,255,0.35)" }}>
                    {l}<div style={{ color:c,fontWeight:700,fontSize:"0.82rem",marginTop:1 }}>{v}</div>
                  </div>
                ))}
              </div>
              {proj>cat.allocated && (
                <div style={{ marginTop:8,fontSize:"0.7rem",color:"#ff6b6b",background:"rgba(255,107,107,0.06)",padding:"0.35rem 0.6rem",borderRadius:"0.5rem",border:"1px solid rgba(255,107,107,0.1)" }}>
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
