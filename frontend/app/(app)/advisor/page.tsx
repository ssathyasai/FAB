"use client";
import { useState, useEffect } from "react";
import AIInsights from "@/components/advisor/AIInsights";
import AssetAdvisor from "@/components/advisor/AssetAdvisor";
import SavingsAdvisor from "@/components/advisor/SavingsAdvisor";
import DebtAdvisor from "@/components/advisor/DebtAdvisor";
import InvestmentAdvisor from "@/components/advisor/InvestmentAdvisor";
import LeakDetector from "@/components/advisor/LeakDetector";

const TABS = [
  { id: "insights",    label: "AI Insights",     icon: "fas fa-lightbulb",        col: "#f0b429" },
  { id: "asset",       label: "AssetGPT",         icon: "fas fa-building",         col: "#34d399" },
  { id: "savings",     label: "Saving Advisor",   icon: "fas fa-piggy-bank",       col: "#fbbf24" },
  { id: "debt",        label: "Debt Advisor",     icon: "fas fa-hand-holding-usd", col: "#ff6b6b" },
  { id: "investment",  label: "Investment",       icon: "fas fa-chart-line",       col: "#6366f1" },
  { id: "leak",        label: "Leak Detector",    icon: "fas fa-faucet",           col: "#fbbf24" },
];

export default function Advisor() {
  const [tab, setTab] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && TABS.some(t => t.id === tabParam)) {
        setTab(tabParam);
      } else {
        setTab("insights");
      }
    }
  }, []);

  if (!tab) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>;
  }

  const active = TABS.find(t => t.id === tab);

  return (
    <div className="fade-in" style={{ maxWidth: 1100 }}>

      {/* ── Page Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        marginBottom: "2rem", paddingBottom: "1.2rem",
        borderBottom: "1px solid rgba(240,180,41,0.10)",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 15,
          background: "linear-gradient(135deg,rgba(240,180,41,0.22),rgba(99,102,241,0.16))",
          border: "1px solid rgba(240,180,41,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#f0b429", fontSize: "1.3rem",
          boxShadow: "0 0 22px rgba(240,180,41,0.22)",
        }}>
          <i className="fas fa-brain" />
        </div>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#f5f0e8" }}>
            AI Financial Advisor
          </h1>
          <p style={{ color: "rgba(240,180,41,0.45)", fontSize: "0.78rem", marginTop: 2 }}>
            Powered by Gemini AI · Graceful rule-based fallback
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.8rem" }}>
        {TABS.map(t => {
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "0.5rem 1.1rem", borderRadius: "2rem",
              border: `1px solid ${isActive ? "rgba(240,180,41,0.35)" : "rgba(240,180,41,0.09)"}`,
              background: isActive
                ? "linear-gradient(135deg,rgba(240,180,41,0.16),rgba(99,102,241,0.12))"
                : "rgba(240,180,41,0.03)",
              color: isActive ? "#f0b429" : "rgba(240,180,41,0.45)",
              cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, transition: "all 0.2s",
              fontFamily: "Inter,sans-serif",
              boxShadow: isActive ? "0 2px 14px rgba(240,180,41,0.18)" : "none",
            }}>
              <i className={t.icon} style={{ marginRight: 6 }} />{t.label}
            </button>
          );
        })}
      </div>

      {/* ── Active tab content ── */}
      <div className="fade-in" key={tab}>
        {tab === "insights"   && <AIInsights />}
        {tab === "asset"      && <AssetAdvisor />}
        {tab === "savings"    && <SavingsAdvisor />}
        {tab === "debt"       && <DebtAdvisor />}
        {tab === "investment" && <InvestmentAdvisor />}
        {tab === "leak"       && <LeakDetector />}
      </div>
    </div>
  );
}
