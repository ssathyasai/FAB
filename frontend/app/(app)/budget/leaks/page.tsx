"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatINR, formatDate } from "@/lib/utils";
import { PageHeader, Loading, Empty } from "@/components/ui";
import toast from "react-hot-toast";

interface Leak {
  category: string;
  issue: string;
  amount: number;
  frequency: string;
  potential_savings: number;
  recommendation: string;
  severity: "high" | "medium" | "low";
  transactions: any[];
}

export default function LeakDetector() {
  const [leaks, setLeaks] = useState<Leak[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/budget/leak-detector");
      setLeaks(response.data.leaks || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to load leak detector");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await api.post("/api/budget/analyze-leaks");
      setLeaks(response.data.leaks || []);
      toast.success("Analysis complete!");
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <Loading text="Analyzing spending patterns..." />;

  const totalSavings = leaks.reduce((sum, leak) => sum + leak.potential_savings, 0);
  const severityColor = (s: string) => 
    s === "high" ? "#ef4444" : s === "medium" ? "#f59e0b" : "#10b981";

  return (
    <div className="page-enter">
      <PageHeader
        icon="fas fa-tint"
        title="Leak Detector"
        color="#ef4444"
        sub="Find and fix unnecessary expenses to boost your savings"
      >
        <button onClick={runAnalysis} disabled={analyzing} className="btn-primary" style={{ width: "auto", padding: "0.7rem 1.4rem" }}>
          {analyzing ? (
            <>
              <div className="spinner-sm" /> Analyzing...
            </>
          ) : (
            <>
              <i className="fas fa-sync-alt" /> Run Analysis
            </>
          )}
        </button>
      </PageHeader>

      {/* Summary Card */}
      {leaks.length > 0 && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem", background: "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.04) 100%)", border: "1px solid rgba(239,68,68,0.20)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: "linear-gradient(135deg, #ef4444, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", boxShadow: "0 4px 20px rgba(239,68,68,0.30)" }}>
              💧
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Potential Monthly Savings
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ef4444", letterSpacing: "-0.02em" }}>
                {formatINR(totalSavings)}
              </div>
            </div>
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.5 }}>
            We found <strong style={{ color: "#ef4444" }}>{leaks.length} spending leak{leaks.length !== 1 ? "s" : ""}</strong> in your budget. 
            Fix these to save {formatINR(totalSavings * 12)} per year!
          </div>
        </div>
      )}

      {/* Leaks List */}
      {leaks.length === 0 ? (
        <Empty
          icon="fas fa-check-circle"
          title="No Leaks Detected!"
          sub="Your spending looks healthy. Keep up the good work!"
          action={
            <button onClick={runAnalysis} className="btn-primary" style={{ width: "auto", marginTop: "1rem" }}>
              <i className="fas fa-sync-alt" /> Run Analysis
            </button>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {leaks.map((leak, idx) => (
            <div key={idx} className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.5rem" }}>
                    <div
                      className="badge"
                      style={{
                        background: `rgba(${leak.severity === "high" ? "239,68,68" : leak.severity === "medium" ? "245,158,11" : "16,185,129"},0.12)`,
                        color: severityColor(leak.severity),
                        border: `1px solid rgba(${leak.severity === "high" ? "239,68,68" : leak.severity === "medium" ? "245,158,11" : "16,185,129"},0.25)`,
                        textTransform: "uppercase",
                      }}
                    >
                      {leak.severity} Priority
                    </div>
                    <div className="badge-gray">{leak.category}</div>
                  </div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text1)", marginBottom: "0.6rem" }}>
                    {leak.issue}
                  </h3>
                  <div style={{ fontSize: "0.85rem", color: "var(--text3)", marginBottom: "0.8rem" }}>
                    Frequency: <strong style={{ color: "var(--text2)" }}>{leak.frequency}</strong> · 
                    Current Spending: <strong style={{ color: "#ef4444" }}>{formatINR(leak.amount)}</strong>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Save Monthly
                  </div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#10b981" }}>
                    {formatINR(leak.potential_savings)}
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div
                style={{
                  padding: "1rem",
                  background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(6,182,212,0.04) 100%)",
                  border: "1px solid rgba(16,185,129,0.15)",
                  borderRadius: "12px",
                  marginBottom: leak.transactions.length > 0 ? "1rem" : 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.8rem" }}>
                  <i className="fas fa-lightbulb" style={{ color: "#10b981", marginTop: "0.2rem", fontSize: "1rem" }} />
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#10b981", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                      💡 Recommendation
                    </div>
                    <div style={{ fontSize: "0.88rem", color: "var(--text1)", lineHeight: 1.6 }}>
                      {leak.recommendation}
                    </div>
                  </div>
                </div>
              </div>

              {/* Related Transactions */}
              {leak.transactions.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
                    Recent Transactions ({leak.transactions.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {leak.transactions.slice(0, 3).map((txn: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "0.6rem 0.8rem",
                          background: "rgba(255,255,255,0.02)",
                          borderRadius: "8px",
                          fontSize: "0.82rem",
                        }}
                      >
                        <span style={{ color: "var(--text2)" }}>
                          {txn.note || txn.expense_category || "Transaction"}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <span style={{ color: "var(--text4)", fontSize: "0.75rem" }}>
                            {formatDate(txn.created_at)}
                          </span>
                          <span style={{ color: "#ef4444", fontWeight: 600 }}>
                            -{formatINR(txn.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
