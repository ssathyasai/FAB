"use client";
import { useEffect, useState } from "react";
import { api, getCurrentBudget, setupBudget } from "@/lib/api";
import { formatINR, EXPENSE_CATEGORIES } from "@/lib/utils";
import { PageHeader, Loading, AIError } from "@/components/ui";
import toast from "react-hot-toast";

export default function BudgetOptimizer() {
  const [current, setCurrent] = useState<any>(null);
  const [optimized, setOptimized] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [applying, setApplying] = useState(false);

  const load = async () => {
    try {
      const res = await getCurrentBudget();
      setCurrent(res.data.budget);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const optimize = async () => {
    if (!current) {
      toast.error("Set up a budget first in Budget Plan");
      return;
    }

    setOptimizing(true);
    try {
      const response = await api.post("/api/budget/optimize");
      setOptimized(response.data);
      toast.success("Optimization complete!");
    } catch (error: any) {
      if (error?.response?.data?.detail?.includes("Gemini") || error?.response?.data?.detail?.includes("API")) {
        toast.error("AI service unavailable. Showing rule-based optimization.");
      } else {
        toast.error(error?.response?.data?.detail || "Optimization failed");
      }
    } finally {
      setOptimizing(false);
    }
  };

  const applyOptimized = async () => {
    if (!optimized?.optimized_budget) return;

    setApplying(true);
    try {
      // Convert optimized budget object to allocations object for the API
      const allocations: Record<string, number> = {};
      const totalIncome = current.income_baseline;
      
      for (const [category, amount] of Object.entries(optimized.optimized_budget)) {
        const percentage = ((amount as number) / totalIncome) * 100;
        allocations[category] = percentage;
      }

      const budgetData = {
        income_baseline: totalIncome,
        income_type: current.income_type || "fixed",
        allocations: allocations,
      };
      
      await setupBudget(budgetData);
      toast.success("Optimized budget applied!");
      setTimeout(() => {
        window.location.href = "/budget/plan";
      }, 1000);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to apply budget");
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <Loading text="Loading budget..." />;

  if (!current) {
    return (
      <div className="page-enter">
        <PageHeader icon="fas fa-magic" title="Budget Optimizer" color="#8b5cf6" sub="AI-powered budget recommendations" />
        <div className="card" style={{ padding: "4rem 2rem", textAlign: "center" }}>
          <i className="fas fa-chart-pie" style={{ fontSize: "3rem", color: "rgba(139,92,246,0.15)", marginBottom: "1rem" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text2)", marginBottom: "0.5rem" }}>
            No Budget Found
          </h3>
          <p style={{ color: "var(--text3)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            Set up your budget first, then come back to optimize it.
          </p>
          <a href="/budget/plan" className="btn-primary" style={{ width: "auto", display: "inline-flex" }}>
            <i className="fas fa-plus" /> Set Up Budget
          </a>
        </div>
      </div>
    );
  }

  // Convert categories array to object for calculations
  const currentCategories: Record<string, number> = {};
  if (Array.isArray(current.categories)) {
    current.categories.forEach((cat: any) => {
      currentCategories[cat.name] = cat.allocated;
    });
  }

  const totalCurrent = Object.values(currentCategories).reduce((a, b) => a + b, 0);
  const totalOptimized = optimized?.optimized_budget
    ? Object.values(optimized.optimized_budget as Record<string, number>).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="page-enter">
      <PageHeader icon="fas fa-magic" title="Budget Optimizer" color="#8b5cf6" sub="AI-powered budget recommendations">
        <button onClick={optimize} disabled={optimizing} className="btn-primary" style={{ width: "auto" }}>
          {optimizing ? (
            <>
              <div className="spinner-sm" /> Optimizing...
            </>
          ) : (
            <>
              <i className="fas fa-wand-magic-sparkles" /> Optimize Budget
            </>
          )}
        </button>
      </PageHeader>

      {/* Current Budget */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div className="section-header">
          <i className="fas fa-clipboard-list" />
          Current Budget
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          <div>
            <div className="stat-label">Monthly Income</div>
            <div className="stat-value" style={{ fontSize: "1.3rem" }}>
              {formatINR(current.income_baseline)}
            </div>
          </div>
          <div>
            <div className="stat-label">Total Allocated</div>
            <div className="stat-value" style={{ fontSize: "1.3rem" }}>
              {formatINR(totalCurrent)}
            </div>
          </div>
          <div>
            <div className="stat-label">Allocation %</div>
            <div className="stat-value" style={{ fontSize: "1.3rem", color: totalCurrent > current.income_baseline ? "#ef4444" : "#10b981" }}>
              {((totalCurrent / current.income_baseline) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Result */}
      {optimized && (
        <>
          {optimized.ai_unavailable && <AIError message="no_key" />}

          <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem", background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.06) 100%)", border: "1px solid rgba(139,92,246,0.20)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.2rem" }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", boxShadow: "0 4px 20px rgba(139,92,246,0.30)" }}>
                ✨
              </div>
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text1)", marginBottom: "0.3rem" }}>
                  Optimized Budget Recommendation
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text3)" }}>
                  {optimized.ai_unavailable ? "Rule-based optimization" : "Powered by Gemini AI"}
                </div>
              </div>
            </div>

            {/* Key Insights */}
            {optimized.insights && (
              <div style={{ marginBottom: "1.2rem", padding: "1rem", background: "rgba(255,255,255,0.04)", borderRadius: "12px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  💡 Key Insights
                </div>
                <div style={{ fontSize: "0.88rem", color: "var(--text2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {optimized.insights}
                </div>
              </div>
            )}

            <button onClick={applyOptimized} disabled={applying} className="btn-primary" style={{ width: "100%" }}>
              {applying ? (
                <>
                  <div className="spinner-sm" /> Applying...
                </>
              ) : (
                <>
                  <i className="fas fa-check" /> Apply Optimized Budget
                </>
              )}
            </button>
          </div>

          {/* Comparison */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {[...EXPENSE_CATEGORIES, "Savings"].map((cat) => {
              const currentVal = currentCategories[cat] || 0;
              const optimizedVal = optimized.optimized_budget[cat] || 0;
              const diff = optimizedVal - currentVal;
              const diffPct = currentVal > 0 ? ((diff / currentVal) * 100) : 0;

              return (
                <div key={cat} className="card" style={{ padding: "1.2rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text2)" }}>{cat}</span>
                    {diff !== 0 && (
                      <div className="badge" style={{
                        background: diff > 0 ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                        color: diff > 0 ? "#10b981" : "#ef4444",
                        border: `1px solid ${diff > 0 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                      }}>
                        {diff > 0 ? "+" : ""}{diffPct.toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                    <div>
                      <div style={{ color: "var(--text4)", marginBottom: "0.2rem" }}>Current</div>
                      <div style={{ fontWeight: 600, color: "var(--text2)" }}>{formatINR(currentVal)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "var(--text4)", marginBottom: "0.2rem" }}>Optimized</div>
                      <div style={{ fontWeight: 700, color: "#8b5cf6" }}>{formatINR(optimizedVal)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
