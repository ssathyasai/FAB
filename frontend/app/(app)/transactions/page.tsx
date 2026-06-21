"use client";
import { useEffect, useState } from "react";
import { getTransactions, categorizeTransaction } from "@/lib/api";
import { formatINR, formatDate, formatTime, EXPENSE_CATEGORIES, CATEGORY_ICONS } from "@/lib/utils";
import toast from "react-hot-toast";

const TYPES      = ["expense","income","transfer","savings"];
const INCOME_TYPES = ["Salary","Business","Freelance"];

const A = "#f0b429";   // gold accent
const G = "#34d399";   // green
const R = "#ff6b6b";   // red

export default function Transactions() {
  const [txns, setTxns]     = useState<any[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<any>(null);
  const [filter, setFilter] = useState({ status: "", month: "" });
  const [form, setForm]     = useState({ category_type: "expense", expense_category: "", income_type: "", note: "" });

  const load = async () => {
    const params: any = {};
    if (filter.status) params.status = filter.status;
    if (filter.month)  params.month  = filter.month;
    try {
      const r = await getTransactions(params);
      setTxns(r.data.transactions); setTotal(r.data.total);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); load(); }, [filter]);

  const openModal = (tx: any) => {
    setModal(tx);
    setForm({ category_type: "expense", expense_category: "", income_type: "", note: tx.note || "" });
  };

  const save = async () => {
    try { await categorizeTransaction(modal.id, form); toast.success("Transaction categorized"); setModal(null); load(); }
    catch { toast.error("Failed"); }
  };

  const typeBadge = (tx: any) => {
    if (tx.status === "pending") return "badge-pending";
    const m: any = { income:"badge-income", expense:"badge-expense", savings:"badge-savings", transfer:"badge-transfer" };
    return m[tx.category_type] || "badge-pending";
  };
  const typeLabel = (tx: any) => {
    if (tx.status === "pending") return "Pending";
    if (tx.category_type === "expense" && tx.expense_category) return tx.expense_category;
    if (tx.category_type === "income"  && tx.income_type)      return tx.income_type;
    return tx.category_type?.toUpperCase();
  };

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:"1.8rem", paddingBottom:"1.1rem", borderBottom:"1px solid rgba(240,180,41,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:14,
            background:"linear-gradient(135deg,rgba(240,180,41,0.15),rgba(224,145,0,0.10))",
            border:"1px solid rgba(240,180,41,0.18)",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:A, fontSize:"1.15rem", boxShadow:"0 0 22px rgba(240,180,41,0.12)" }}>
            <i className="fas fa-exchange-alt" />
          </div>
          <div>
            <h1 style={{ fontSize:"1.5rem", fontWeight:800, letterSpacing:"-0.02em", color:"#f5f0e8" }}>Transactions</h1>
            <p style={{ color:"var(--text3)", fontSize:"0.78rem", marginTop:2 }}>
              {total} total &nbsp;·&nbsp; Pending ones need categorizing
            </p>
          </div>
        </div>
        <div style={{ display:"flex", gap:"0.6rem", alignItems:"center" }}>
          <select className="input-field" style={{ width:"auto", padding:"0.5rem 0.9rem", fontSize:"0.8rem" }}
            value={filter.status} onChange={e => setFilter(f => ({ ...f, status:e.target.value }))}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="categorized">Categorized</option>
          </select>
          <input className="input-field" type="month" style={{ width:"auto", padding:"0.5rem 0.9rem", fontSize:"0.8rem" }}
            value={filter.month} onChange={e => setFilter(f => ({ ...f, month:e.target.value }))} />
        </div>
      </div>

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"4rem" }}><div className="spinner" /></div>
      ) : txns.length === 0 ? (
        <div className="card" style={{ padding:"4rem", textAlign:"center" }}>
          <i className="fas fa-receipt" style={{ fontSize:"3rem", color:"rgba(240,180,41,0.08)", display:"block", marginBottom:"1rem" }} />
          <div style={{ color:"var(--text3)", fontWeight:500, fontSize:"1rem" }}>No transactions found</div>
          <div style={{ color:"var(--text4)", fontSize:"0.82rem", marginTop:4 }}>
            Go to <a href="/bank" style={{ color:A }}>Bank Account →</a> to update your balance
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow:"hidden" }}>
          {txns.map((tx, i) => {
            const isCredit = tx.transaction_type === "credit";
            const col = isCredit ? G : R;
            return (
              <div key={tx.id} style={{
                padding:"1rem 1.5rem",
                borderBottom: i < txns.length-1 ? "1px solid rgba(240,180,41,0.04)" : "none",
                display:"flex", alignItems:"center", gap:"1rem",
                background: tx.status === "pending" ? "rgba(251,191,36,0.02)" : "transparent",
                transition:"background 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(240,180,41,0.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = tx.status==="pending" ? "rgba(251,191,36,0.02)" : "transparent")}
              >
                {/* Direction icon */}
                <div style={{
                  width:38, height:38, borderRadius:"50%", flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: isCredit ? "rgba(52,211,153,0.10)" : "rgba(255,107,107,0.10)",
                  color: col, fontSize:"0.85rem",
                }}>
                  <i className={isCredit ? "fas fa-arrow-down" : "fas fa-arrow-up"} />
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:600, fontSize:"0.9rem", color:"#f5f0e8" }}>
                      {tx.expense_category ? `${CATEGORY_ICONS[tx.expense_category]||""} ${tx.expense_category}` :
                       tx.income_type ? tx.income_type :
                       tx.category_type==="uncategorized" ? "Uncategorized" :
                       tx.category_type?.charAt(0).toUpperCase()+tx.category_type?.slice(1)}
                    </span>
                    <span className={`badge ${typeBadge(tx)}`}>{typeLabel(tx).toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize:"0.72rem", color:"var(--text3)", display:"flex", gap:"0.8rem", flexWrap:"wrap" }}>
                    {tx.note && <span>"{tx.note}"</span>}
                    <span>{formatDate(tx.created_at)} · {formatTime(tx.created_at)}</span>
                    <span>Balance after: <strong style={{ color:"var(--text2)" }}>{formatINR(tx.balance_after)}</strong></span>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ fontWeight:800, fontSize:"1.05rem", flexShrink:0, color:col }}>
                  {isCredit ? "+" : "−"}{formatINR(tx.amount)}
                </div>

                {/* Categorize btn */}
                {tx.status==="pending" && (
                  <button onClick={() => openModal(tx)} style={{
                    background:"linear-gradient(135deg,#f0b429,#e09100)", color:"#0a0a0a",
                    border:"none", padding:"0.45rem 1rem", borderRadius:"0.7rem",
                    fontWeight:700, fontSize:"0.78rem", cursor:"pointer",
                    display:"flex", alignItems:"center", gap:6, flexShrink:0, transition:"0.2s",
                    fontFamily:"Inter,sans-serif", boxShadow:"0 2px 10px rgba(240,180,41,0.25)",
                  }}>
                    <i className="fas fa-tag" /> Categorize
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Categorize Modal ── */}
      {modal && (
        <div onClick={e => e.target===e.currentTarget && setModal(null)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(10px)",
          zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem",
        }}>
          <div className="card" style={{ width:"100%", maxWidth:500, padding:"2rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
              <div>
                <h2 style={{ fontWeight:800, fontSize:"1.1rem", color:"#f5f0e8" }}>Categorize Transaction</h2>
                <p style={{ color:"var(--text3)", fontSize:"0.8rem", marginTop:2 }}>Assign type and category</p>
              </div>
              <button onClick={() => setModal(null)} style={{
                background:"rgba(240,180,41,0.06)", border:"1px solid rgba(240,180,41,0.12)",
                color:"var(--text2)", width:32, height:32, borderRadius:"50%", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.9rem",
              }}>×</button>
            </div>

            {/* Amount card */}
            <div className="card-inner" style={{ padding:"1rem 1.2rem", marginBottom:"1.5rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ color:"var(--text2)", fontSize:"0.82rem" }}>
                  <i className={modal.transaction_type==="credit" ? "fas fa-arrow-down" : "fas fa-arrow-up"} style={{ marginRight:6 }} />
                  {modal.transaction_type==="credit" ? "Money In" : "Money Out"}
                </span>
                <span style={{ fontWeight:800, fontSize:"1.2rem", color:modal.transaction_type==="credit"?G:R }}>
                  {formatINR(modal.amount)}
                </span>
              </div>
              <div style={{ fontSize:"0.7rem", color:"var(--text3)", marginTop:4 }}>
                Balance after: {formatINR(modal.balance_after)}
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              {/* Type selector */}
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Transaction Type</label>
                <div style={{ display:"flex", gap:6 }}>
                  {TYPES.map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, category_type:t }))} style={{
                      flex:1, padding:"0.55rem 0.3rem", borderRadius:"0.7rem",
                      border:`1px solid ${form.category_type===t ? A : "rgba(240,180,41,0.08)"}`,
                      background: form.category_type===t ? "rgba(240,180,41,0.10)" : "rgba(255,255,255,0.02)",
                      color: form.category_type===t ? A : "var(--text3)",
                      cursor:"pointer", fontSize:"0.72rem", fontWeight:600, textTransform:"capitalize",
                      fontFamily:"Inter,sans-serif", transition:"0.2s",
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              {form.category_type==="expense" && (
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Expense Category</label>
                  <select className="input-field" value={form.expense_category}
                    onChange={e => setForm(f => ({ ...f, expense_category:e.target.value }))}>
                    <option value="">Select category...</option>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                  </select>
                  {form.expense_category && (
                    <div className="hint">This will update your <strong style={{ color:A }}>{form.expense_category}</strong> budget</div>
                  )}
                </div>
              )}

              {form.category_type==="income" && (
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Income Source</label>
                  <select className="input-field" value={form.income_type}
                    onChange={e => setForm(f => ({ ...f, income_type:e.target.value }))}>
                    <option value="">Select source...</option>
                    {INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Note <span style={{ color:"var(--text4)", fontWeight:400, textTransform:"none" }}>(optional)</span></label>
                <input className="input-field" placeholder="e.g. Zomato dinner, Electricity bill…"
                  value={form.note} onChange={e => setForm(f => ({ ...f, note:e.target.value }))} />
              </div>

              <button onClick={save} className="btn-primary" style={{ marginTop:4 }}>
                <i className="fas fa-check" /> Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
