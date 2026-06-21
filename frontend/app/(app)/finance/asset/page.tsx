"use client";
import { useState, useEffect } from "react";
import { getAssets, createAsset, updateAsset, deleteAsset, getAssetDashboard, postAssetAdvisor, updateAssetValues, getTrackableAssets } from "@/lib/api";
import { PageHeader } from "@/components/ui";

const ASSET_TYPES = [
  "Land", "Agricultural Land", "Residential Plot", "Commercial Plot",
  "House", "Apartment", "Commercial Building", "Warehouse", "Shop",
  "Gold", "Silver", "Jewelry",
  "Vehicle", "Car", "Bike",
  "Machinery", "Business", "Franchise",
  "Stocks", "Mutual Funds", "Fixed Deposits", "Bonds", "Cryptocurrency",
  "Savings", "Other"
];

const REAL_ESTATE_TYPES = ["Land", "Agricultural Land", "Residential Plot", "Commercial Plot", "House", "Apartment", "Commercial Building", "Warehouse", "Shop"];
const GOALS = ["Wealth Growth", "Passive Income", "Retirement Planning", "Asset Appreciation", "Business Expansion", "Emergency Liquidity", "Capital Preservation"];
const RISKS = ["Low Risk", "Medium Risk", "High Risk"];

export default function AssetsManagement() {
  const [tab, setTab] = useState<"list" | "advisor">("list");
  const [assets, setAssets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [trackableTypes, setTrackableTypes] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [newAsset, setNewAsset] = useState({
    asset_type: "",
    name: "",
    description: "",
    purchase_value: "",
    purchase_date: "",
    location: "",
    quantity: "",
  });

  // Advisor state
  const [advisorStep, setAdvisorStep] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [assetDetails, setAssetDetails] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState({ goal: "", risk: "" });
  const [advisorResult, setAdvisorResult] = useState<any>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [fetchingValue, setFetchingValue] = useState(false);

  const loadAssets = async () => {
    try {
      const r = await getAssets();
      setAssets(r.data.assets);
      setSummary(r.data.summary);
    } catch {}
  };

  const loadDashboard = async () => {
    try {
      const r = await getAssetDashboard();
      setDashboard(r.data);
    } catch {}
  };

  const loadTrackableTypes = async () => {
    try {
      const r = await getTrackableAssets();
      setTrackableTypes(r.data.trackable_types);
    } catch {}
  };

  const triggerUpdate = async () => {
    setUpdating(true);
    try {
      await updateAssetValues();
      // Reload data after update
      await loadAssets();
      await loadDashboard();
    } catch {} finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    loadAssets();
    loadDashboard();
    loadTrackableTypes();
  }, []);

  // Auto-refresh every 60 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadAssets();
      loadDashboard();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const addAsset = async () => {
    if (!newAsset.asset_type || !newAsset.name || !newAsset.purchase_value) return;
    setLoading(true);
    setFetchingValue(true);
    try {
      const response = await createAsset({
        ...newAsset,
        purchase_value: parseFloat(newAsset.purchase_value),
        quantity: newAsset.quantity ? parseFloat(newAsset.quantity) : null,
      });
      
      // Show success with AI-fetched value
      const valueInfo = response.data.initial_value_info;
      if (valueInfo && valueInfo.ai_fetched) {
        alert(`✅ Asset added!\n\nCurrent Market Value: ₹${valueInfo.current_value.toLocaleString()}\nConfidence: ${valueInfo.confidence}\nSource: ${valueInfo.source}`);
      }
      
      setNewAsset({ asset_type: "", name: "", description: "", purchase_value: "", purchase_date: "", location: "", quantity: "" });
      setShowAdd(false);
      loadAssets();
      loadDashboard();
    } catch (err: any) {
      console.error("Error adding asset:", err);
      const errorMsg = err.response?.data?.detail || err.message || "Unknown error occurred";
      alert(`❌ Error adding asset:\n\n${errorMsg}`);
    } finally {
      setLoading(false);
      setFetchingValue(false);
    }
  };

  const removeAsset = async (id: string) => {
    if (!confirm("Delete this asset?")) return;
    try {
      await deleteAsset(id);
      loadAssets();
      loadDashboard();
    } catch {}
  };

  const runAdvisor = async () => {
    setAdvisorLoading(true);
    try {
      const r = await postAssetAdvisor({
        asset_type: selectedAsset,
        asset_details: assetDetails,
        user_profile: profile,
        risk_tolerance: profile.risk,
        financial_goal: profile.goal,
      });
      setAdvisorResult(r.data);
      setAdvisorStep(3);
    } catch {} finally { setAdvisorLoading(false); }
  };

  const needsLocation = REAL_ESTATE_TYPES.includes(newAsset.asset_type);

  return (
    <div className="page-enter">
      <PageHeader icon="fas fa-gem" title="Assets Management" color="#8b5cf6"
        sub="Track your assets and get AI-powered recommendations" />

      {/* Live Tracking Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", padding: "1rem", background: "rgba(139,92,246,0.08)", borderRadius: 12, border: "1px solid rgba(139,92,246,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: autoRefresh ? "#10b981" : "#6b7280", animation: autoRefresh ? "pulse 2s infinite" : "none" }} />
            <span style={{ fontSize: "0.85rem", color: "var(--text3)" }}>
              {autoRefresh ? "Live Tracking Active" : "Auto-refresh Paused"}
            </span>
          </div>
          <button onClick={() => setAutoRefresh(!autoRefresh)} style={{
            padding: "0.4rem 0.8rem", fontSize: "0.75rem", borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
            color: "var(--text2)", cursor: "pointer",
          }}>
            {autoRefresh ? "Pause" : "Resume"}
          </button>
        </div>
        <button onClick={triggerUpdate} disabled={updating} style={{
          padding: "0.6rem 1.2rem", borderRadius: 8,
          border: "1px solid #8b5cf6", background: "rgba(139,92,246,0.15)",
          color: "#8b5cf6", cursor: updating ? "not-allowed" : "pointer",
          fontWeight: 600, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6,
        }}>
          <i className={`fas fa-sync-alt ${updating ? "fa-spin" : ""}`} />
          {updating ? "Updating Prices..." : "Update Asset Values"}
        </button>
      </div>

      {/* Info Banner */}
      <div style={{ padding: "0.8rem 1rem", background: "rgba(16,185,129,0.08)", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)", marginBottom: "1rem", fontSize: "0.85rem", color: "var(--text2)" }}>
        <i className="fas fa-info-circle" style={{ marginRight: 6, color: "#10b981" }} />
        <strong>AI-Powered Tracking:</strong> ALL asset types are automatically tracked using live market data from AI.
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {[["list", "My Assets", "fas fa-list"], ["advisor", "Asset Advisor", "fas fa-lightbulb"]].map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id as any)} style={{
            padding: "0.6rem 1.2rem", borderRadius: "2rem",
            border: `1px solid ${tab === id ? "#8b5cf6" : "rgba(255,255,255,0.1)"}`,
            background: tab === id ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.02)",
            color: tab === id ? "#8b5cf6" : "var(--text3)",
            cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
          }}>
            <i className={icon as string} style={{ marginRight: 6 }} />{label}
          </button>
        ))}
      </div>

      {/* ──────────── ASSETS LIST TAB ──────────── */}
      {tab === "list" && (
        <>
          {/* Summary Cards */}
          {summary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="card" style={{ padding: "1.2rem", textAlign: "center", borderTop: "2px solid #8b5cf6" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#8b5cf6" }}>{summary.total_assets}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: 4 }}>TOTAL ASSETS</div>
              </div>
              <div className="card" style={{ padding: "1.2rem", textAlign: "center", borderTop: "2px solid #3b82f6" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#3b82f6" }}>₹{summary.total_current_value.toFixed(0)}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: 4 }}>CURRENT VALUE</div>
              </div>
              <div className="card" style={{ padding: "1.2rem", textAlign: "center", borderTop: `2px solid ${summary.total_gain_loss >= 0 ? "#10b981" : "#ef4444"}` }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: summary.total_gain_loss >= 0 ? "#10b981" : "#ef4444" }}>
                  ₹{summary.total_gain_loss.toFixed(0)}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: 4 }}>GAIN/LOSS</div>
              </div>
              <div className="card" style={{ padding: "1.2rem", textAlign: "center", borderTop: `2px solid ${summary.total_gain_loss_pct >= 0 ? "#10b981" : "#ef4444"}` }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: summary.total_gain_loss_pct >= 0 ? "#10b981" : "#ef4444" }}>
                  {summary.total_gain_loss_pct.toFixed(1)}%
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: 4 }}>RETURN</div>
              </div>
            </div>
          )}

          {/* Dashboard */}
          {dashboard && dashboard.by_type?.length > 0 && (
            <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h4 style={{ fontWeight: 700, marginBottom: "1rem" }}>Assets by Type</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "1rem" }}>
                {dashboard.by_type.map((t: any) => (
                  <div key={t.type} style={{ padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.type}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text3)" }}>{t.count} assets</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#8b5cf6", marginTop: 6 }}>₹{t.current_value.toFixed(0)}</div>
                    <div style={{ fontSize: "0.75rem", color: t.gain_loss >= 0 ? "#10b981" : "#ef4444" }}>
                      {t.gain_loss >= 0 ? "+" : ""}₹{t.gain_loss.toFixed(0)} ({t.gain_loss_pct.toFixed(1)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ fontWeight: 700 }}>My Assets</h3>
            <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
              <i className="fas fa-plus" style={{ marginRight: 6 }} />
              Add Asset
            </button>
          </div>

          {showAdd && (
            <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h4 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Add New Asset</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text3)", marginBottom: "1rem" }}>
                <i className="fas fa-magic" style={{ marginRight: 6, color: "#8b5cf6" }} />
                Just enter asset details - AI will fetch current market value automatically!
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="label">Asset Type *</label>
                  <select className="input-field" value={newAsset.asset_type}
                    onChange={e => setNewAsset({ ...newAsset, asset_type: e.target.value })}>
                    <option value="">Select type...</option>
                    {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Name *</label>
                  <input className="input-field" placeholder="e.g., 10g Gold, Reliance Stock" value={newAsset.name}
                    onChange={e => setNewAsset({ ...newAsset, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Purchase Value (₹) *</label>
                  <input className="input-field" type="number" placeholder="Original cost" value={newAsset.purchase_value}
                    onChange={e => setNewAsset({ ...newAsset, purchase_value: e.target.value })} />
                </div>
                <div>
                  <label className="label">Purchase Date (Optional)</label>
                  <input className="input-field" type="date" value={newAsset.purchase_date}
                    onChange={e => setNewAsset({ ...newAsset, purchase_date: e.target.value })} />
                </div>
                {needsLocation && (
                  <div>
                    <label className="label">Location *</label>
                    <input className="input-field" placeholder="City/Area" value={newAsset.location}
                      onChange={e => setNewAsset({ ...newAsset, location: e.target.value })} />
                  </div>
                )}
                <div>
                  <label className="label">Quantity (Optional)</label>
                  <input className="input-field" type="number" placeholder="10 for 10g gold, 50 for 50 shares" value={newAsset.quantity}
                    onChange={e => setNewAsset({ ...newAsset, quantity: e.target.value })} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Description (Optional)</label>
                  <input className="input-field" placeholder="Additional details" value={newAsset.description}
                    onChange={e => setNewAsset({ ...newAsset, description: e.target.value })} />
                </div>
              </div>
              {fetchingValue && (
                <div style={{ marginTop: "1rem", padding: "0.8rem", background: "rgba(139,92,246,0.1)", borderRadius: 8, fontSize: "0.85rem", color: "#8b5cf6" }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />
                  AI is fetching current market value...
                </div>
              )}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button className="btn-primary" onClick={addAsset} disabled={loading || !newAsset.asset_type || !newAsset.name || !newAsset.purchase_value}>
                  {loading ? (fetchingValue ? "Fetching Market Value..." : "Adding...") : "Add Asset (AI will fetch current value)"}
                </button>
                <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Assets List */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1rem" }}>
            {assets.map(asset => {
              const gain = asset.current_value - asset.purchase_value;
              const gainPct = (gain / asset.purchase_value * 100).toFixed(1);
              const lastUpdate = asset.last_price_update ? new Date(asset.last_price_update) : null;
              const priceChange24h = asset.price_change_24h || 0;
              const hasLiveTracking = asset.last_price_update; // All assets with updates have live tracking
              
              return (
                <div key={asset.id} className="card" style={{ padding: "1.2rem", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ fontSize: "0.7rem", color: "var(--text3)", textTransform: "uppercase" }}>{asset.asset_type}</div>
                        {hasLiveTracking && (
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} title="Live tracking enabled" />
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "1rem" }}>{asset.name}</div>
                      {asset.quantity && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>Qty: {asset.quantity}</div>
                      )}
                    </div>
                    <button onClick={() => removeAsset(asset.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                  {asset.description && <p style={{ fontSize: "0.8rem", color: "var(--text3)", marginBottom: 8 }}>{asset.description}</p>}
                  {asset.location && <div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: 6 }}>
                    <i className="fas fa-map-marker-alt" style={{ marginRight: 4 }} />{asset.location}
                  </div>}
                  
                  {/* 24h Price Change */}
                  {hasLiveTracking && priceChange24h !== 0 && (
                    <div style={{ fontSize: "0.75rem", color: priceChange24h >= 0 ? "#10b981" : "#ef4444", marginBottom: 6 }}>
                      <i className={`fas fa-arrow-${priceChange24h >= 0 ? "up" : "down"}`} style={{ marginRight: 4 }} />
                      {priceChange24h >= 0 ? "+" : ""}{priceChange24h.toFixed(2)}% (24h)
                    </div>
                  )}
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text3)" }}>Purchase</div>
                      <div style={{ fontWeight: 600 }}>₹{asset.purchase_value.toFixed(0)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text3)" }}>Current</div>
                      <div style={{ fontWeight: 600, color: "#8b5cf6" }}>₹{asset.current_value.toFixed(0)}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, padding: "0.5rem", background: gain >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", borderRadius: 6 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: gain >= 0 ? "#10b981" : "#ef4444" }}>
                      {gain >= 0 ? "+" : ""}₹{gain.toFixed(0)} ({gainPct}%)
                    </div>
                  </div>
                  
                  {/* Last Update Timestamp */}
                  {lastUpdate && (
                    <div style={{ fontSize: "0.65rem", color: "var(--text3)", marginTop: 6, textAlign: "right" }}>
                      Updated: {lastUpdate.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {assets.length === 0 && !showAdd && (
            <div style={{ textAlign: "center", padding: "4rem", color: "var(--text3)" }}>
              <i className="fas fa-gem" style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }} />
              <p>No assets yet. Add your first asset!</p>
            </div>
          )}
        </>
      )}

      {/* ──────────── ASSET ADVISOR TAB ──────────── */}
      {tab === "advisor" && (
        <>
          {advisorStep === 1 && (
            <div className="card" style={{ padding: "1.8rem" }}>
              <div className="section-header"><i className="fas fa-th" />Select Asset Type</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: "0.5rem", marginBottom: "1.5rem" }}>
                {ASSET_TYPES.map(t => (
                  <button key={t} onClick={() => setSelectedAsset(t)} style={{
                    padding: "0.6rem 0.8rem", borderRadius: 8, textAlign: "left",
                    border: `1px solid ${selectedAsset === t ? "var(--accent)" : "rgba(255,255,255,0.07)"}`,
                    background: selectedAsset === t ? "var(--accent-dim)" : "rgba(255,255,255,0.02)",
                    color: selectedAsset === t ? "var(--accent)" : "var(--text3)",
                    cursor: "pointer", fontSize: "0.8rem", fontWeight: selectedAsset === t ? 600 : 400,
                  }}>{t}</button>
                ))}
              </div>
              <button onClick={() => setAdvisorStep(2)} disabled={!selectedAsset} className="btn btn-primary">
                Continue with {selectedAsset || "…"} →
              </button>
            </div>
          )}

          {advisorStep === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="card" style={{ padding: "1.8rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                  <div className="section-header" style={{ marginBottom: 0 }}><i className="fas fa-file-alt" />Asset Details — {selectedAsset}</div>
                  <button onClick={() => setAdvisorStep(1)} className="btn btn-secondary btn-sm">← Change</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                  {REAL_ESTATE_TYPES.includes(selectedAsset) && (
                    <div>
                      <label className="label">Location</label>
                      <input className="input-field" placeholder="City/Area" value={assetDetails["Location"] || ""}
                        onChange={e => setAssetDetails({ ...assetDetails, "Location": e.target.value })} />
                    </div>
                  )}
                  {["Market Value (₹)", "Current Usage", "Additional Details"].map(k => (
                    <div key={k}>
                      <label className="label">{k}</label>
                      <input className="input-field" placeholder={k} value={assetDetails[k] || ""}
                        onChange={e => setAssetDetails({ ...assetDetails, [k]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: "1.8rem" }}>
                <div className="section-header"><i className="fas fa-sliders-h" />Your Preferences</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                  <div>
                    <label className="label">Financial Goal</label>
                    <select className="input-field" value={profile.goal}
                      onChange={e => setProfile({ ...profile, goal: e.target.value })}>
                      <option value="">Select goal...</option>
                      {GOALS.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Risk Tolerance</label>
                    <select className="input-field" value={profile.risk}
                      onChange={e => setProfile({ ...profile, risk: e.target.value })}>
                      <option value="">Select risk level...</option>
                      {RISKS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={runAdvisor} disabled={advisorLoading || !profile.goal || !profile.risk}
                  className="btn btn-primary" style={{ marginTop: "1.2rem", width: "100%" }}>
                  {advisorLoading ? <><div className="spinner spinner-sm" /> Analyzing with AI…</> : "Get AI Recommendations →"}
                </button>
              </div>
            </div>
          )}

          {advisorStep === 3 && advisorResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontWeight: 800, fontSize: "1.1rem" }}>Results — {selectedAsset}</h2>
                <button onClick={() => { setAdvisorStep(1); setAdvisorResult(null); setSelectedAsset(""); }} className="btn btn-secondary btn-sm">Start Over</button>
              </div>

              {advisorResult.error ? (
                <div className="card" style={{ padding: "1.5rem", color: "#ffd93d" }}>
                  <i className="fas fa-key" style={{ marginRight: 8 }} />{advisorResult.error}
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.8rem" }}>
                    {[["Asset Health", "asset_health_score", "#34d399"]].map(([l, k, c]) => (
                      <div key={k} className="card" style={{ padding: "1.2rem", textAlign: "center", borderTop: `2px solid ${c}` }}>
                        <div style={{ fontSize: "2rem", fontWeight: 900, color: c as string }}>{advisorResult[k] ?? 0}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: 4 }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  {advisorResult.market_outlook && (
                    <div className="card" style={{ padding: "1.2rem" }}>
                      <div className="section-header"><i className="fas fa-globe" />Market Outlook</div>
                      <p style={{ color: "var(--text2)", fontSize: "0.88rem" }}>{advisorResult.market_outlook}</p>
                    </div>
                  )}

                  {(advisorResult.top_5_recommendations || []).map((rec: any) => (
                    <div key={rec.rank} className="card" style={{ padding: "1.5rem", borderLeft: "3px solid var(--accent)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontWeight: 700 }}>#{rec.rank} {rec.title}</div>
                        <span className="badge badge-amber">{rec.risk_level}</span>
                      </div>
                      <p style={{ color: "var(--text2)", fontSize: "0.85rem", marginBottom: 10 }}>{rec.description}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, fontSize: "0.78rem", padding: "0.8rem", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                        <div><span style={{ color: "var(--text3)" }}>Cost </span><strong>{rec.estimated_cost}</strong></div>
                        <div><span style={{ color: "var(--text3)" }}>Return </span><strong style={{ color: "#34d399" }}>{rec.estimated_return_potential}</strong></div>
                        <div><span style={{ color: "var(--text3)" }}>Horizon </span><strong>{rec.time_horizon}</strong></div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
