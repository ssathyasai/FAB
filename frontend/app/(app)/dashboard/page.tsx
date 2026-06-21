"use client";
import { useEffect, useState, useCallback } from "react";
import { getDashboardSummary, runAlertChecks, getAssets, createAsset, deleteAsset, updateAssetValues } from "@/lib/api";
import { formatINR, formatINRShort, monthLabel, CATEGORY_COLORS } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine,
} from "recharts";

const SCORE_COLORS: Record<string, string> = {
  green: "#34d399",
  blue:  "#60a5fa",
  amber: "#f0b429",
  red:   "#ff6b6b",
};

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Asset Management States
  const [assets, setAssets] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newAsset, setNewAsset] = useState({
    asset_type: "",
    name: "",
    purchase_value: "",
    quantity: "",
    location: "",
    description: "",
  });

  const load = useCallback(async () => {
    try {
      const res = await getDashboardSummary();
      setData(res.data);
      runAlertChecks().catch(() => {});
      
      // Load assets list
      const assetsRes = await getAssets();
      setAssets(assetsRes.data.assets);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
    finally { setLoading(false); }
  }, []);

  const handleSyncAssets = async () => {
    setSyncing(true);
    try {
      await updateAssetValues();
      await load();
    } catch (err) {
      console.error("Error syncing assets:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddAsset = async () => {
    if (!newAsset.asset_type || !newAsset.name || !newAsset.purchase_value) return;
    setAdding(true);
    try {
      const res = await createAsset({
        ...newAsset,
        purchase_value: parseFloat(newAsset.purchase_value),
        quantity: newAsset.quantity ? parseFloat(newAsset.quantity) : null,
      });
      
      const valueInfo = res.data.initial_value_info;
      if (valueInfo && valueInfo.ai_fetched) {
        alert(`✅ Asset added!\n\nCurrent Market Value: ₹${valueInfo.current_value.toLocaleString()}\nSource: ${valueInfo.source}`);
      }
      
      setNewAsset({
        asset_type: "",
        name: "",
        purchase_value: "",
        quantity: "",
        location: "",
        description: "",
      });
      setShowAdd(false);
      await load();
    } catch (err: any) {
      console.error("Error adding asset:", err);
      alert(`❌ Error adding asset:\n\n${err.response?.data?.detail || err.message}`);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      await deleteAsset(id);
      await load();
    } catch (err) {
      console.error("Error deleting asset:", err);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div>
        <div className="spinner" style={{ margin: "0 auto 1rem" }} />
        <div style={{ color: "var(--text3)", fontSize: "0.82rem", textAlign: "center" }}>Loading dashboard…</div>
      </div>
    </div>
  );

  const d = data || {};
  const health = d.health_score || {};
  const scoreColor = SCORE_COLORS[health.color as string] || "#f0b429";
  const C = 2 * Math.PI * 40;
  const offset = C - (health.score / 100) * C;

  return (
    <div className="fade-in">

      {/* ── Page Header ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: "1.8rem", paddingBottom: "1.1rem",
        borderBottom: "1px solid rgba(240,180,41,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg,rgba(240,180,41,0.15),rgba(224,145,0,0.10))",
            border: "1px solid rgba(240,180,41,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#f0b429", fontSize: "1.15rem",
            boxShadow: "0 0 22px rgba(240,180,41,0.12)",
          }}>
            <i className="fas fa-chart-pie" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#f5f0e8" }}>Dashboard</h1>
            <p style={{ color: "var(--text3)", fontSize: "0.78rem", marginTop: 2 }}>
              {monthLabel(d.month || "")} &nbsp;·&nbsp; {d.days_remaining || 0} days remaining
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <span style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "0.3rem 0.85rem", borderRadius: 40,
            background: "rgba(240,180,41,0.08)", border: "1px solid rgba(240,180,41,0.14)",
            color: "#f0b429", fontSize: "0.72rem", fontWeight: 600,
          }}>
            <i className="fas fa-circle" style={{ fontSize: "0.45rem" }} /> Live
          </span>
          <span style={{ color: "var(--text4)", fontSize: "0.72rem" }}>Auto-refresh every 5s</span>
        </div>
      </div>

      {/* ── Key info bar ── */}
      <div className="info-bar" style={{ marginBottom: "2rem" }}>
        {[
          ["fas fa-university", "Balance",  formatINRShort(d.balance  || 0)],
          ["fas fa-arrow-down", "Income",   formatINRShort(d.income   || 0)],
          ["fas fa-arrow-up",   "Expenses", formatINRShort(d.expenses || 0)],
          ["fas fa-piggy-bank", "Savings",  `${d.savings_pct || 0}%`],
          ["fas fa-heartbeat",  "Health",   `${health.score || 0}/100`],
        ].map(([icon, label, val]) => (
          <div key={label} className="info-bar-item">
            <i className={icon} /><strong>{label}</strong> — {val}
          </div>
        ))}
      </div>

      {/* ── Top 4 stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.6rem" }}>
        <StatCard icon="fas fa-university" label="Bank Balance"     value={formatINR(d.balance  || 0)} accent="#f0b429" live />
        <StatCard icon="fas fa-arrow-down" label="Monthly Income"   value={formatINR(d.income   || 0)} accent="#34d399" />
        <StatCard icon="fas fa-arrow-up"   label="Monthly Expenses" value={formatINR(d.expenses || 0)} accent="#ff6b6b" />
        <StatCard icon="fas fa-piggy-bank" label="Net Savings"      value={formatINR(d.savings  || 0)} accent="#6366f1"
          sub={`${d.savings_pct || 0}% of income`} />
      </div>

      {/* ── Asset Portfolio & Piggy Bank Summary ── */}
      {(d.assets_summary || d.piggy_bank_summary) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.6rem" }}>
          {/* Assets Portfolio */}
          {d.assets_summary && (
            <div className="card" style={{ padding: "1.5rem", background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.03))", border: "1px solid rgba(139,92,246,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6", fontSize: "1rem" }}>
                    <i className="fas fa-gem" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Asset Portfolio</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text3)" }}>{d.assets_summary.total_assets} assets</div>
                  </div>
                </div>
                <a href="/finance/asset" style={{ fontSize: "0.75rem", color: "#8b5cf6", textDecoration: "none", fontWeight: 600 }}>
                  View →
                </a>
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#8b5cf6", marginBottom: 8, letterSpacing: "-0.02em" }}>
                ₹{formatINRShort(d.assets_summary.total_value)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.5rem 0.8rem", background: d.assets_summary.total_gain_loss >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", borderRadius: 8 }}>
                <i className={`fas fa-arrow-${d.assets_summary.total_gain_loss >= 0 ? "up" : "down"}`} style={{ color: d.assets_summary.total_gain_loss >= 0 ? "#10b981" : "#ef4444", fontSize: "0.8rem" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: d.assets_summary.total_gain_loss >= 0 ? "#10b981" : "#ef4444" }}>
                  {d.assets_summary.total_gain_loss >= 0 ? "+" : ""}₹{Math.abs(d.assets_summary.total_gain_loss).toFixed(0)} ({d.assets_summary.gain_loss_pct}%)
                </span>
              </div>
              <div style={{ marginTop: 8, fontSize: "0.7rem", color: "var(--text3)", display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
                Live tracking enabled
              </div>
            </div>
          )}

          {/* Piggy Bank Summary */}
          {d.piggy_bank_summary && (
            <div className="card" style={{ padding: "1.5rem", background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b", fontSize: "1rem" }}>
                    <i className="fas fa-piggy-bank" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Piggy Bank</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text3)" }}>{d.piggy_bank_summary.total_banks} banks</div>
                  </div>
                </div>
                <a href="/piggybank" style={{ fontSize: "0.75rem", color: "#f59e0b", textDecoration: "none", fontWeight: 600 }}>
                  View →
                </a>
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f59e0b", marginBottom: 8, letterSpacing: "-0.02em" }}>
                ₹{formatINRShort(d.piggy_bank_summary.total_saved)}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text3)" }}>
                Total saved across all piggy banks
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Live Asset Tracker Section ── */}
      <div className="card" style={{ padding: "1.8rem", marginBottom: "1.6rem", background: "linear-gradient(135deg, rgba(139,92,246,0.05), rgba(99,102,241,0.02))", border: "1px solid rgba(139,92,246,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", flexWrap: "wrap", gap: "0.8rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#8b5cf6", fontSize: "1.1rem"
            }}>
              <i className="fas fa-gem" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text1)" }}>Live Asset Tracker</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <span className="live-dot" style={{ width: 6, height: 6 }} />
                <span style={{ fontSize: "0.68rem", color: "var(--text3)" }}>Real-time APIs Active</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button onClick={() => setShowAdd(!showAdd)} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <i className={`fas fa-${showAdd ? "times" : "plus"}`} />
              {showAdd ? "Close Form" : "Add Asset"}
            </button>
            <button onClick={handleSyncAssets} disabled={syncing} className="btn btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 5, width: "auto", background: "var(--accent)" }}>
              <i className={`fas fa-sync ${syncing ? "fa-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Prices"}
            </button>
          </div>
        </div>

        {/* Quick Add Form */}
        {showAdd && (
          <div style={{ padding: "1.2rem", background: "var(--surface2)", borderRadius: 12, border: "1px solid var(--border)", marginBottom: "1.2rem", animation: "pageEnter 0.25s ease" }}>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Quick Add Asset</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.8rem", marginBottom: "1rem" }}>
              <div>
                <label className="label">Asset Type *</label>
                <select className="input-field" value={newAsset.asset_type}
                  onChange={e => setNewAsset({ ...newAsset, asset_type: e.target.value })}>
                  <option value="">Select type...</option>
                  {["Gold", "Silver", "Stocks", "Mutual Funds", "Cryptocurrency", "House", "Apartment", "Land", "Vehicle", "Business", "Other"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Asset Name *</label>
                <input className="input-field" placeholder="e.g. Reliance, Bitcoin, Gold 10g" value={newAsset.name}
                  onChange={e => setNewAsset({ ...newAsset, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Purchase Value (₹) *</label>
                <input className="input-field" type="number" placeholder="Value in INR" value={newAsset.purchase_value}
                  onChange={e => setNewAsset({ ...newAsset, purchase_value: e.target.value })} />
              </div>
              <div>
                <label className="label">Quantity (Optional)</label>
                <input className="input-field" type="number" placeholder="e.g. 10, 0.05" value={newAsset.quantity}
                  onChange={e => setNewAsset({ ...newAsset, quantity: e.target.value })} />
              </div>
              {["House", "Apartment", "Land"].includes(newAsset.asset_type) && (
                <div>
                  <label className="label">Location *</label>
                  <input className="input-field" placeholder="City/Area" value={newAsset.location}
                    onChange={e => setNewAsset({ ...newAsset, location: e.target.value })} />
                </div>
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="label">Description (Optional)</label>
                <input className="input-field" placeholder="Notes or additional info" value={newAsset.description}
                  onChange={e => setNewAsset({ ...newAsset, description: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowAdd(false)} className="btn btn-secondary btn-sm" disabled={adding}>Cancel</button>
              <button onClick={handleAddAsset} className="btn btn-primary btn-sm" style={{ width: "auto" }} disabled={adding || !newAsset.asset_type || !newAsset.name || !newAsset.purchase_value}>
                {adding ? <><i className="fas fa-spinner fa-spin" /> Fetching Live Value...</> : "Add Asset"}
              </button>
            </div>
          </div>
        )}

        {/* Assets Grid */}
        {assets.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
            {assets.map(asset => {
              const gain = asset.current_value - asset.purchase_value;
              const gainPct = asset.purchase_value > 0 ? (gain / asset.purchase_value * 100).toFixed(1) : "0.0";
              const change24h = asset.price_change_24h || 0.0;
              const isUp = gain >= 0;
              const has24h = asset.price_change_24h !== undefined;
              
              return (
                <div key={asset.id} className="card-inner" style={{ padding: "1rem", position: "relative", border: "1px solid var(--border)", background: "rgba(255,255,255,0.015)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <span className="badge badge-gray" style={{ fontSize: "0.6rem", padding: "0.1rem 0.4rem", textTransform: "uppercase" }}>{asset.asset_type}</span>
                      <h4 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text1)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }} title={asset.name}>
                        {asset.name}
                      </h4>
                    </div>
                    <button onClick={() => handleDeleteAsset(asset.id)} style={{ background: "none", border: "none", color: "var(--text4)", cursor: "pointer", fontSize: "0.8rem", padding: "4px" }} onMouseEnter={e => e.currentTarget.style.color = "var(--red)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text4)"}>
                      <i className="fas fa-trash-alt" />
                    </button>
                  </div>
                  
                  {asset.description && (
                    <p style={{ fontSize: "0.72rem", color: "var(--text3)", marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {asset.description}
                    </p>
                  )}
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "8px 0" }}>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "var(--text3)", textTransform: "uppercase" }}>Purchase</div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text2)" }}>₹{asset.purchase_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "var(--text3)", textTransform: "uppercase" }}>Current</div>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--accent)" }}>₹{asset.current_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 4 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.15rem 0.5rem", background: isUp ? "rgba(5,150,105,0.08)" : "rgba(220,38,38,0.08)", borderRadius: 6, border: `1px solid ${isUp ? "rgba(5,150,105,0.15)" : "rgba(220,38,38,0.15)"}` }}>
                      <i className={`fas fa-arrow-${isUp ? "up" : "down"}`} style={{ fontSize: "0.65rem", color: isUp ? "var(--green)" : "var(--red)" }} />
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isUp ? "var(--green)" : "var(--red)" }}>
                        {isUp ? "+" : ""}{gainPct}%
                      </span>
                    </div>
                    
                    {has24h && change24h !== 0 && (
                      <div style={{ fontSize: "0.7rem", color: change24h >= 0 ? "var(--green)" : "var(--red)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 2 }}>
                        <span>24h:</span>
                        <i className={`fas fa-caret-${change24h >= 0 ? "up" : "down"}`} />
                        <span>{change24h >= 0 ? "+" : ""}{change24h.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  
                  {asset.last_price_update && (
                    <div style={{ fontSize: "0.58rem", color: "var(--text4)", marginTop: 8, textAlign: "right" }}>
                      Synced: {new Date(asset.last_price_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "rgba(255,255,255,0.01)", borderRadius: 12, border: "1px dashed var(--border)" }}>
            <i className="fas fa-gem" style={{ fontSize: "2rem", color: "var(--text4)", opacity: 0.3, marginBottom: "0.6rem", display: "block" }} />
            <p style={{ fontSize: "0.85rem", color: "var(--text3)", marginBottom: "0.8rem" }}>No assets tracked yet.</p>
            <button onClick={() => setShowAdd(true)} className="btn btn-secondary btn-sm" style={{ width: "auto" }}>
              <i className="fas fa-plus" style={{ marginRight: 5 }} /> Add Your First Asset
            </button>
          </div>
        )}
      </div>

      {/* ── Health Score + Budget Status ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1rem", marginBottom: "1.6rem" }}>

        {/* Health Score */}
        <div className="card" style={{ padding: "1.6rem 2rem" }}>
          <div className="section-title"><i className="fas fa-heartbeat" />Financial Health Score</div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.2rem" }}>
            <svg width={100} height={100} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(240,180,41,0.06)" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" stroke={scoreColor} strokeWidth="8"
                strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
                transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
              <defs>
                <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <text x="50" y="47" textAnchor="middle" fill="#f5f0e8" fontSize="18" fontWeight="800">{health.score || 0}</text>
              <text x="50" y="61" textAnchor="middle" fill="var(--text3)" fontSize="9">/100</text>
            </svg>
            <div>
              <div style={{ color: scoreColor, fontWeight: 700, fontSize: "0.9rem", marginBottom: 6 }}>{health.status}</div>
              {(health.recommendations || []).map((r: string, i: number) => (
                <div key={i} style={{ fontSize: "0.73rem", color: "var(--text3)", marginBottom: 3, lineHeight: 1.4 }}>• {r}</div>
              ))}
            </div>
          </div>
          {(health.pillars || []).map((p: any) => (
            <div key={p.name} style={{ marginBottom: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: 3 }}>
                <span style={{ color: "var(--text3)" }}>{p.name}</span>
                <span style={{ color: "#f0b429", fontWeight: 600 }}>{p.points}/{p.max_points}</span>
              </div>
              <div className="score-bar" style={{ marginTop: 0 }}>
                <div className="bar-bg" style={{ flex: 1 }}>
                  <div className="bar-fill" style={{ width: `${(p.points / p.max_points) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Budget Status */}
        <div className="card" style={{ padding: "1.6rem 2rem" }}>
          <div className="section-title"><i className="fas fa-tasks" />Budget Status — This Month</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(d.budget_status || []).slice(0, 9).map((cat: any) => {
              const col = cat.status === "exceeded" ? "#ff6b6b" : cat.status === "warning" ? "#fbbf24" : "#f0b429";
              return (
                <div key={cat.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 3 }}>
                    <span style={{ color: "var(--text2)" }}>{cat.name}</span>
                    <span style={{ color: col, fontWeight: 600 }}>
                      {formatINRShort(cat.spent)} / {formatINRShort(cat.allocated)}
                      <span style={{ color: "var(--text3)", fontWeight: 400 }}> ({cat.percentage}%)</span>
                    </span>
                  </div>
                  <div style={{ height: 5, background: "rgba(240,180,41,0.05)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(cat.percentage, 100)}%`, background: col, borderRadius: 4, transition: "width 0.5s" }} />
                  </div>
                </div>
              );
            })}
            {(!d.budget_status?.length) && (
              <div style={{ color: "var(--text3)", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>
                No budget set up. <a href="/budget" style={{ color: "#f0b429" }}>Set up now →</a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem", marginBottom: "1.6rem" }}>

        {/* 6-month bar */}
        <div className="card" style={{ padding: "1.6rem 2rem" }}>
          <div className="section-title"><i className="fas fa-chart-bar" />Income vs Expenses — Last 6 Months</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={(d.six_month_chart || []).map((m: any) => ({ ...m, name: monthLabel(m.month).split(" ")[0] }))} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,180,41,0.04)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "var(--text3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatINRShort(v)} tick={{ fill: "var(--text4)", fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip
                contentStyle={{ background: "rgba(7,8,15,0.97)", border: "1px solid rgba(240,180,41,0.18)", borderRadius: 10, fontFamily: "Inter" }}
                labelStyle={{ color: "var(--text3)", fontSize: 11 }}
                formatter={(v: any) => [formatINR(v), ""]}
              />
              <Bar dataKey="income"   fill="#f0b429" radius={[5,5,0,0]} name="Income" />
              <Bar dataKey="expenses" fill="rgba(255,107,107,0.75)" radius={[5,5,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "1.2rem", marginTop: 8 }}>
            {[["#f0b429","Income"],["rgba(255,107,107,0.75)","Expenses"]].map(([c,l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: "var(--text3)" }}>
                <span style={{ width: 10, height: 4, borderRadius: 2, background: c as string, display: "inline-block" }} />{l}
              </div>
            ))}
          </div>
        </div>

        {/* Donut */}
        <div className="card" style={{ padding: "1.6rem 2rem" }}>
          <div className="section-title"><i className="fas fa-chart-pie" />Expense Breakdown</div>
          {d.expense_breakdown?.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
              <PieChart width={145} height={145} style={{ flexShrink: 0 }}>
                <Pie data={d.expense_breakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                  {d.expense_breakdown.map((e: any, i: number) => <Cell key={i} fill={CATEGORY_COLORS[e.category] || "#868e96"} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(7,8,15,0.97)", border: "1px solid rgba(240,180,41,0.18)", borderRadius: 10, fontFamily: "Inter" }} formatter={(v: any) => [formatINR(v), ""]} />
              </PieChart>
              <div style={{ flex: 1 }}>
                {d.expense_breakdown.slice(0, 6).map((e: any) => (
                  <div key={e.category} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", marginBottom: 5 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--text2)" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: CATEGORY_COLORS[e.category] || "#868e96", display: "inline-block", flexShrink: 0 }} />
                      {e.category}
                    </span>
                    <span style={{ color: "#f5f0e8", fontWeight: 600 }}>{formatINRShort(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--text3)", fontSize: "0.85rem", textAlign: "center", padding: "3rem 0" }}>
              <i className="fas fa-chart-pie" style={{ fontSize: "2.5rem", display: "block", marginBottom: 8, opacity: 0.15 }} />
              No expenses categorized yet
            </div>
          )}
        </div>
      </div>

      {/* ── Spending trend ── */}
      <div className="card" style={{ padding: "1.6rem 2rem" }}>
        <div className="section-title"><i className="fas fa-chart-line" />Daily Spending Trend — This Month</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={d.daily_trend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,180,41,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "var(--text4)", fontSize: 10 }} tickFormatter={v => v.split("-")[2]} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatINRShort(v)} tick={{ fill: "var(--text4)", fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
            <Tooltip contentStyle={{ background: "rgba(7,8,15,0.97)", border: "1px solid rgba(240,180,41,0.18)", borderRadius: 10, fontFamily: "Inter" }} formatter={(v: any) => [formatINR(v), "Cumulative"]} />
            {d.budget_limit > 0 && (
              <ReferenceLine y={d.budget_limit} stroke="rgba(255,107,107,0.5)" strokeDasharray="4 4"
                label={{ value: "Budget Limit", fill: "rgba(255,107,107,0.6)", fontSize: 10, position: "insideTopRight" }} />
            )}
            <Line type="monotone" dataKey="amount" stroke="#f0b429" strokeWidth={2.5} dot={false}
              activeDot={{ r: 4, fill: "#f0b429", stroke: "#07080f", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}

function StatCard({ icon, label, value, accent, sub, live }: {
  icon: string; label: string; value: string; accent: string; sub?: string; live?: boolean;
}) {
  const rgb =
    accent === "#f0b429" ? "240,180,41" :
    accent === "#34d399" ? "52,211,153"  :
    accent === "#ff6b6b" ? "255,107,107" : "99,102,241";
  return (
    <div className="card" style={{ padding: "1.3rem 1.5rem", position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: 0, right: 0, width: 80, height: 80,
        borderRadius: "0 1.4rem 0 80px",
        background: `radial-gradient(circle at 80% 20%, rgba(${rgb},0.08) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: "0.63rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</span>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `rgba(${rgb},0.10)`,
          border: `1px solid rgba(${rgb},0.14)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accent, fontSize: "0.9rem",
        }}>
          <i className={icon} />
        </div>
      </div>
      <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#f5f0e8", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: 4 }}>{sub}</div>}
      {live && (
        <div style={{ fontSize: "0.62rem", color: "#f0b429", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f0b429", display: "inline-block", boxShadow: "0 0 5px rgba(240,180,41,0.6)" }} />
          Live
        </div>
      )}
    </div>
  );
}
