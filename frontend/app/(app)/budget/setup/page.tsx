"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { PageHeader } from "@/components/ui";
import toast from "react-hot-toast";

export default function BudgetSetupPage() {
  const router = useRouter();
  const [initializing, setInitializing] = useState(true);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasExistingBalance, setHasExistingBalance] = useState(false);
  
  // Step 1: Bank Balance
  const [bankBalance, setBankBalance] = useState("");
  
  // Step 2: Profile
  const [profile, setProfile] = useState({
    monthly_income: "",
    family_type: "nuclear",
    family_members: "4",
    city_type: "tier2",
    lifestyle: "moderate",
    earning_members: "1",
  });
  
  // Step 3: ML Allocation
  const [allocation, setAllocation] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [customAllocation, setCustomAllocation] = useState<any>({});

  // Check if bank balance already exists
  useEffect(() => {
    const checkExistingBalance = async () => {
      try {
        const response = await api.get("/api/bank/balance");
        const balance = response.data.balance;
        
        if (balance && balance > 0) {
          // Balance already set, skip Step 1
          setHasExistingBalance(true);
          setBankBalance(String(balance));
          setStep(2); // Start from profile step
          toast.success("Bank balance already set, continuing with profile setup");
        }
      } catch (error) {
        console.error("Error checking balance:", error);
      } finally {
        setInitializing(false);
      }
    };

    checkExistingBalance();
  }, []);

  const handleNext = async () => {
    if (step === 1) {
      if (!bankBalance || parseFloat(bankBalance) <= 0) {
        toast.error("Enter a valid bank balance");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!profile.monthly_income || parseFloat(profile.monthly_income) <= 0) {
        toast.error("Enter your monthly income");
        return;
      }
      
      // Get ML-based allocation
      setLoading(true);
      try {
        const response = await api.post("/api/budget/smart-allocation", {
          monthly_income: parseFloat(profile.monthly_income),
          family_type: profile.family_type,
          family_members: parseInt(profile.family_members),
          city_type: profile.city_type,
          lifestyle: profile.lifestyle,
          earning_members: parseInt(profile.earning_members),
        });
        setAllocation(response.data);
        setCustomAllocation(response.data.allocation); // Initialize custom allocation
        setStep(3);
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || "Failed to generate allocation");
      } finally {
        setLoading(false);
      }
    } else if (step === 3) {
      // Validate custom allocation if in edit mode
      if (editMode) {
        const total = Object.values(customAllocation).reduce((sum: number, val: any) => sum + parseFloat(val || 0), 0);
        const income = parseFloat(profile.monthly_income);
        
        if (Math.abs(total - income) > 1) { // Allow 1 rupee difference for rounding
          toast.error(`Total allocation (₹${total.toFixed(0)}) must equal monthly income (₹${income.toFixed(0)})`);
          return;
        }
      }
      
      // Save everything
      setLoading(true);
      try {
        // Save bank balance only if it wasn't already set
        if (!hasExistingBalance) {
          await api.post("/api/bank/set-balance", { balance: parseFloat(bankBalance) });
        }
        
        // Save budget with profile
        await api.post("/api/budget/setup-complete", {
          bank_balance: parseFloat(bankBalance),
          profile: {
            ...profile,
            monthly_income: parseFloat(profile.monthly_income),
            family_members: parseInt(profile.family_members),
            earning_members: parseInt(profile.earning_members),
          },
          allocation: editMode ? customAllocation : allocation.allocation, // Use custom if edited
        });
        
        toast.success("Budget setup complete! 🎉");
        setTimeout(() => router.push("/budget/overview"), 1000);
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || "Failed to save budget");
      } finally {
        setLoading(false);
      }
    }
  };

  const updateCustomAllocation = (category: string, value: string) => {
    setCustomAllocation((prev: any) => ({
      ...prev,
      [category]: parseFloat(value) || 0,
    }));
  };

  const getTotalAllocation = () => {
    return Object.values(customAllocation).reduce((sum: number, val: any) => sum + parseFloat(val || 0), 0);
  };

  const getRemainingAmount = () => {
    const income = parseFloat(profile.monthly_income);
    const total = getTotalAllocation();
    return income - total;
  };

  // Show loading while checking existing balance
  if (initializing) {
    return (
      <div className="page-enter" style={{ maxWidth: "700px", margin: "0 auto", padding: "4rem 0", textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 1rem" }} />
        <div style={{ color: "var(--text3)", fontSize: "0.9rem" }}>Checking setup status...</div>
      </div>
    );
  }

  // Calculate actual step number for display (adjust if Step 1 is skipped)
  const displayStep = hasExistingBalance ? step - 1 : step;
  const totalSteps = hasExistingBalance ? 2 : 3;

  return (
    <div className="page-enter" style={{ maxWidth: "700px", margin: "0 auto" }}>
      <PageHeader
        icon="fas fa-rocket"
        title="Budget Setup Wizard"
        color="#10b981"
        sub={`Step ${displayStep} of ${totalSteps} · AI-Powered Smart Allocation`}
      />

      {/* Info Banner if balance already set */}
      {hasExistingBalance && (
        <div style={{
          marginBottom: "1.5rem",
          padding: "1rem 1.2rem",
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.20)",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          gap: "0.8rem"
        }}>
          <i className="fas fa-check-circle" style={{ color: "#10b981", fontSize: "1.2rem" }} />
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#10b981", marginBottom: "0.2rem" }}>
              Bank Balance Already Set
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>
              Your bank balance of {formatINR(parseFloat(bankBalance))} is saved. You can update it anytime in Bank Account section.
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          {hasExistingBalance ? (
            // 2-step progress (skip bank balance)
            [2, 3].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: "6px",
                  borderRadius: "99px",
                  background: s <= step ? "linear-gradient(90deg, #10b981, #06b6d4)" : "rgba(255,255,255,0.10)",
                  transition: "all 0.3s",
                }}
              />
            ))
          ) : (
            // 3-step progress (include bank balance)
            [1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: "6px",
                  borderRadius: "99px",
                  background: s <= step ? "linear-gradient(90deg, #10b981, #06b6d4)" : "rgba(255,255,255,0.10)",
                  transition: "all 0.3s",
                }}
              />
            ))
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text4)" }}>
          {hasExistingBalance ? (
            <>
              <span>Your Profile</span>
              <span>Review & Save</span>
            </>
          ) : (
            <>
              <span>Bank Balance</span>
              <span>Your Profile</span>
              <span>Review & Save</span>
            </>
          )}
        </div>
      </div>
      {/* STEP 1: Bank Balance */}
      {step === 1 && (
        <div className="card" style={{ padding: "2.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981, #06b6d4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                fontSize: "2rem",
                boxShadow: "0 8px 32px rgba(16,185,129,0.30)",
              }}
            >
              🏦
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Enter Your Current Bank Balance
            </h2>
            <p style={{ color: "var(--text3)", fontSize: "0.88rem" }}>
              This will be your starting point for tracking
            </p>
          </div>

          <div className="form-group">
            <label>Bank Balance (₹)</label>
            <input
              type="number"
              className="input-field"
              placeholder="e.g., 100000"
              value={bankBalance}
              onChange={(e) => setBankBalance(e.target.value)}
              style={{ fontSize: "1.2rem", textAlign: "center", fontWeight: 600 }}
              autoFocus
            />
            <div className="hint">Enter your total available balance across all accounts</div>
          </div>
        </div>
      )}

      {/* STEP 2: Profile */}
      {step === 2 && (
        <div className="card" style={{ padding: "2.5rem" }}>
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Tell Us About Yourself
            </h2>
            <p style={{ color: "var(--text3)", fontSize: "0.88rem" }}>
              Our AI will create a personalized budget based on your profile
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            {/* Monthly Income */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>💰 Monthly Income (₹)</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 80000"
                value={profile.monthly_income}
                onChange={(e) => setProfile({ ...profile, monthly_income: e.target.value })}
              />
            </div>

            {/* Family Type */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>👨‍👩‍👧‍👦 Family Type</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
                {["single", "nuclear", "joint"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setProfile({ ...profile, family_type: type })}
                    style={{
                      padding: "0.8rem",
                      borderRadius: "10px",
                      border: `2px solid ${profile.family_type === type ? "#10b981" : "rgba(255,255,255,0.10)"}`,
                      background: profile.family_type === type ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.03)",
                      color: profile.family_type === type ? "#10b981" : "var(--text2)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      transition: "all 0.25s",
                      textTransform: "capitalize",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Family Members */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>👥 Family Members</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 4"
                value={profile.family_members}
                onChange={(e) => setProfile({ ...profile, family_members: e.target.value })}
                min="1"
                max="20"
              />
            </div>

            {/* City Type */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>🏙️ City Type</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
                {[
                  ["metro", "Metro (Mumbai, Delhi, etc.)"],
                  ["tier1", "Tier-1 (Pune, Ahmedabad)"],
                  ["tier2", "Tier-2 (Indore, Jaipur)"],
                  ["tier3", "Tier-3 (Smaller cities)"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setProfile({ ...profile, city_type: value })}
                    style={{
                      padding: "0.8rem",
                      borderRadius: "10px",
                      border: `2px solid ${profile.city_type === value ? "#3b82f6" : "rgba(255,255,255,0.10)"}`,
                      background: profile.city_type === value ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                      color: profile.city_type === value ? "#3b82f6" : "var(--text2)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      transition: "all 0.25s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lifestyle */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>✨ Lifestyle</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
                {["minimalist", "moderate", "lavish"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setProfile({ ...profile, lifestyle: type })}
                    style={{
                      padding: "0.8rem",
                      borderRadius: "10px",
                      border: `2px solid ${profile.lifestyle === type ? "#8b5cf6" : "rgba(255,255,255,0.10)"}`,
                      background: profile.lifestyle === type ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)",
                      color: profile.lifestyle === type ? "#8b5cf6" : "var(--text2)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      transition: "all 0.25s",
                      textTransform: "capitalize",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Earning Members */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>💼 Earning Members</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 2"
                value={profile.earning_members}
                onChange={(e) => setProfile({ ...profile, earning_members: e.target.value })}
                min="1"
                max="10"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Review Allocation */}
      {step === 3 && allocation && (
        <div>
          <div className="card" style={{ padding: "2rem", marginBottom: "1.5rem", background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.06) 100%)", border: "1px solid rgba(16,185,129,0.20)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ fontSize: "2.5rem" }}>🤖</div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    AI-Generated Budget Ready!
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "var(--text3)" }}>
                    {allocation.profile_summary} · {allocation.savings_rate}% savings rate
                  </p>
                </div>
              </div>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="btn-ghost"
                  style={{ flexShrink: 0 }}
                >
                  <i className="fas fa-edit" /> Customize
                </button>
              )}
            </div>
            {allocation.insights?.map((insight: string, i: number) => (
              <div key={i} style={{ fontSize: "0.82rem", color: "var(--text2)", marginBottom: "0.4rem", paddingLeft: "1rem" }}>
                {insight}
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                Monthly Budget Breakdown
              </h3>
              {editMode && (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--text3)" }}>
                    Remaining: <strong style={{ color: getRemainingAmount() === 0 ? "#10b981" : getRemainingAmount() > 0 ? "#f59e0b" : "#ef4444" }}>
                      {formatINR(getRemainingAmount())}
                    </strong>
                  </div>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setCustomAllocation(allocation.allocation); // Reset to AI allocation
                      toast.success("Reset to AI recommendations");
                    }}
                    className="btn-secondary"
                    style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}
                  >
                    <i className="fas fa-undo" /> Reset
                  </button>
                </div>
              )}
            </div>

            {editMode ? (
              // Edit Mode: Inputs for each category
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {Object.entries(customAllocation).map(([category, amount]: [string, any]) => (
                  <div key={category} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text1)", marginBottom: "0.3rem" }}>
                        {category}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text4)" }}>
                        AI Suggested: {formatINR(allocation.allocation[category])}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.2rem", color: "var(--text3)" }}>₹</span>
                      <input
                        type="number"
                        className="input-field"
                        value={amount}
                        onChange={(e) => updateCustomAllocation(category, e.target.value)}
                        style={{ width: "140px", textAlign: "right", fontWeight: 700, fontSize: "1rem" }}
                      />
                    </div>
                  </div>
                ))}
                
                {/* Total Summary */}
                <div style={{ padding: "1.2rem", background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.06))", border: "1px solid rgba(59,130,246,0.20)", borderRadius: "12px", marginTop: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.9rem", color: "var(--text2)" }}>Total Allocated:</span>
                    <span style={{ fontSize: "1.2rem", fontWeight: 800, color: getTotalAllocation() === parseFloat(profile.monthly_income) ? "#10b981" : "#f59e0b" }}>
                      {formatINR(getTotalAllocation())}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.9rem", color: "var(--text2)" }}>Monthly Income:</span>
                    <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text1)" }}>
                      {formatINR(parseFloat(profile.monthly_income))}
                    </span>
                  </div>
                  <div style={{ height: "1px", background: "rgba(255,255,255,0.10)", margin: "0.8rem 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text1)" }}>
                      {getRemainingAmount() === 0 ? "✅ Balanced" : getRemainingAmount() > 0 ? "⚠️ Under-allocated" : "❌ Over-allocated"}
                    </span>
                    <span style={{ fontSize: "1.2rem", fontWeight: 800, color: getRemainingAmount() === 0 ? "#10b981" : getRemainingAmount() > 0 ? "#f59e0b" : "#ef4444" }}>
                      {getRemainingAmount() === 0 ? "Perfect!" : formatINR(Math.abs(getRemainingAmount()))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // View Mode: Display only
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                {Object.entries(allocation.allocation).map(([category, amount]: [string, any]) => (
                  <div
                    key={category}
                    style={{
                      padding: "1rem",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "10px",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: "0.3rem" }}>
                      {category}
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#10b981" }}>
                      {formatINR(amount)}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text4)", marginTop: "0.2rem" }}>
                      {((amount / parseFloat(profile.monthly_income)) * 100).toFixed(1)}% of income
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="btn-secondary" style={{ flex: 1 }} disabled={loading}>
            <i className="fas fa-arrow-left" /> Back
          </button>
        )}
        <button onClick={handleNext} className="btn-primary" style={{ flex: 2 }} disabled={loading}>
          {loading ? (
            <>
              <div className="spinner-sm" /> Processing...
            </>
          ) : step === 3 ? (
            <>
              <i className="fas fa-check" /> Complete Setup
            </>
          ) : (
            <>
              Next <i className="fas fa-arrow-right" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
