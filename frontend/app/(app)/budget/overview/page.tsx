"use client";
import { useEffect, useState, useCallback } from "react";
import { getDashboardSummary, runAlertChecks } from "@/lib/api";
import { formatINR, formatINRShort, monthLabel, CATEGORY_COLORS } from "@/lib/utils";
import { PageHeader, StatCard, Loading } from "@/components/ui";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ReferenceLine } from "recharts";

export default function BudgetOverview() {
  const [d, setD] = useState<any>(null);
  const [loading, setL] = useState(true);

  const load = useCallback(async () => {
    try { const r = await getDashboardSummary(); setD(r.data); runAlertChecks().catch(()=>{}); }
    catch {} finally { setL(false); }
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 6000); return () => clearInterval(iv); }, [load]);

  if (loading) return <Loading text="Loading dashboard..." />;

  const data = d || {};
  const health = data.health_score || {};
  const scoreColor = { green: "#10b981", blue: "#3b82f6", amber: "#f59e0b", red: "#ef4444" }[health.color as string] ?? "#10b981";
  const C = 2 * Math.PI * 38;
  const offset = C - (health.score / 100) * C;

  return (
    <div className="page-enter">
      <PageHeader icon="fas fa-chart-pie" title="Budget Overview" color="#10b981"
        sub={`${monthLabel(data.month || "")} · ${data.days_remaining ?? 0} days remaining`}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text3)" }}>
          <span className="live-dot" /> Auto-refresh
        </span>
      </PageHeader>

      {/* ── 4 stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard icon="fas fa-university"  label="Bank Balance"    value={data.balance  ?? 0} color="#3b82f6" live />
        <StatCard icon="fas fa-arrow-down"  label="Monthly Income"  value={data.income   ?? 0} color="#10b981" />
        <StatCard icon="fas fa-arrow-up"    label="Monthly Expenses"value={data.expenses ?? 0} color="#ef4444" />
        <StatCard icon="fas fa-piggy-bank"  label="Net Savings"     value={data.savings  ?? 0} color="#06b6d4"
          sub={`${data.savings_pct ?? 0}% of income`} />
      </div>

      {/* ── Row 2: Health + Budget bars ── */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "1rem", marginBottom: "1.5rem" }}>

        {/* Health score */}
        <div className="card" style={{ padding: "1.6rem" }}>
          <div className="section-header"><i className="fas fa-heartbeat" />Health Score</div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.3rem", marginBottom: "1.2rem" }}>
            <svg width={90} height={90} viewBox="0 0 90 90" style={{ flexShrink: 0 }}>
              <circle cx="45" cy="45" r="38" fill="none" stroke="#e4e4e7" strokeWidth="7" />
              <circle cx="45" cy="45" r="38" fill="none" stroke={scoreColor} strokeWidth="7"
                strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
                transform="rotate(-90 45 45)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
              <text x="45" y="42" textAnchor="middle" fill="#09090b" fontSize="17" fontWeight="800">{health.score ?? 0}</text>
              <text x="45" y="55" textAnchor="middle" fill="#71717a" fontSize="9">/100</text>
            </svg>
            <div>
              <div style={{ color: scoreColor, fontWeight: 700, fontSize: "0.88rem", marginBottom: 6 }}>{health.status}</div>
              {(health.recommendations ?? []).map((r: string, i: number) => (
                <div key={i} style={{ fontSize: "0.72rem", color: "var(--text3)", marginBottom: 3, lineHeight: 1.4 }}>• {r}</div>
              ))}
            </div>
          </div>
          {(health.pillars ?? []).map((p: any) => (
            <div key={p.name} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: 3 }}>
                <span style={{ color: "var(--text2)" }}>{p.name}</span>
                <span style={{ color: scoreColor, fontWeight: 700 }}>{p.points}/{p.max_points}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${(p.points/p.max_points)*100}%`, background: `linear-gradient(90deg,${scoreColor},${scoreColor}88)` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Budget bars */}
        <div className="card" style={{ padding: "1.6rem" }}>
          <div className="section-header"><i className="fas fa-tasks" />Budget Status</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(data.budget_status ?? []).slice(0, 9).map((cat: any) => {
              const col = cat.status==="exceeded" ? "#ff6b6b" : cat.status==="warning" ? "#fbbf24" : "#34d399";
              return (
                <div key={cat.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 3 }}>
                    <span style={{ color: "var(--text2)" }}>{cat.name}</span>
                    <span style={{ fontWeight: 600, color: col }}>
                      {formatINRShort(cat.spent)} / {formatINRShort(cat.allocated)}
                      <span style={{ color: "var(--text4)", fontWeight: 400 }}> ({cat.percentage}%)</span>
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min(cat.percentage,100)}%`, background: col }} />
                  </div>
                </div>
              );
            })}
            {!data.budget_status?.length && (
              <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text3)", fontSize: "0.85rem" }}>
                No budget yet. <a href="/budget/plan" style={{ color: "var(--accent)" }}>Set up →</a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ padding: "1.6rem" }}>
          <div className="section-header"><i className="fas fa-chart-bar" />Income vs Expenses — 6 Months</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={(data.six_month_chart ?? []).map((m: any) => ({ ...m, name: monthLabel(m.month).split(" ")[0] }))} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatINRShort(v)} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(v: any) => [formatINR(v), ""]} />
              <Bar dataKey="income"   fill="#10b981" radius={[5,5,0,0]} name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[5,5,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding: "1.6rem" }}>
          <div className="section-header"><i className="fas fa-chart-pie" />Expenses by Category</div>
          {data.expense_breakdown?.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <PieChart width={120} height={120} style={{ margin: "0 auto" }}>
                <Pie data={data.expense_breakdown} dataKey="amount" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
                  {data.expense_breakdown.map((e: any, i: number) => <Cell key={i} fill={CATEGORY_COLORS[e.category] || "#868e96"} />)}
                </Pie>
              </PieChart>
              {data.expense_breakdown.slice(0, 5).map((e: any) => (
                <div key={e.category} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text2)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: CATEGORY_COLORS[e.category] || "#868e96", display: "inline-block" }} />
                    {e.category}
                  </span>
                  <span style={{ fontWeight: 600 }}>{formatINRShort(e.amount)}</span>
                </div>
              ))}
            </div>
          ) : <div style={{ color: "var(--text3)", textAlign: "center", padding: "3rem 0", fontSize: "0.85rem" }}>No data yet</div>}
        </div>
      </div>

      {/* Trend */}
      <div className="card" style={{ padding: "1.6rem" }}>
        <div className="section-header"><i className="fas fa-chart-line" />Daily Spending Trend</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data.daily_trend ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={v => v.split("-")[2]} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatINRShort(v)} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(v: any) => [formatINR(v), "Cumulative"]} />
            {data.budget_limit > 0 && <ReferenceLine y={data.budget_limit} stroke="#f59e0b" strokeDasharray="4 4" />}
            <Line type="monotone" dataKey="amount" stroke="var(--accent)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "var(--accent)", stroke: "#fff", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
