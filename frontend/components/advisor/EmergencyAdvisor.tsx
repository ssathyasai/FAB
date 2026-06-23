"use client";
import { useState, useEffect } from "react";
import { postEmergencyAdvisor, api } from "@/lib/api";
import toast from "react-hot-toast";

const EMERGENCY_TYPES = [
  "Job Loss",
  "Medical Emergency",
  "Salary Delay",
  "Accident",
  "Home Damage",
  "Business Loss",
  "Family Emergency",
  "Vehicle Breakdown",
  "Legal Issue",
  "Natural Disaster"
];

type Question = { key: string; label: string; type: string };

export default function EmergencyAdvisor() {
  const [emergencyType, setEmergencyType] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Auto-fetch user's financial data
  const [financialData, setFinancialData] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    assets: 0,
    loading: true
  });

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      // Fetch income from settings
      const settingsRes = await api.get("/api/settings");
      const income = settingsRes.data.income_baseline || 0;
      
      // Fetch savings/balance
      const balanceRes = await api.get("/api/balance");
      const savings = balanceRes.data.balance || 0;
      
      // Fetch current month expenses
      const currentMonth = new Date().toISOString().slice(0, 7);
      let expenses = 0;
      try {
        const budgetRes = await api.get(`/api/budget?month=${currentMonth}`);
        if (budgetRes.data.budget) {
          expenses = budgetRes.data.budget.categories?.reduce((sum: number, cat: any) => sum + (cat.spent || 0), 0) || 0;
        }
      } catch (e) {
        console.log("No budget data");
      }
      
      // Fetch assets count
      const assetsRes = await api.get("/api/assets");
      const assetsCount = (assetsRes.data.assets || []).length;
      
      setFinancialData({
        income,
        expenses,
        savings,
        assets: assetsCount,
        loading: false
      });
    } catch (error) {
      console.error("Failed to fetch financial data:", error);
      setFinancialData({ income: 0, expenses: 0, savings: 0, assets: 0, loading: false });
    }
  };

  const getQuestions = (): Question[] => {
    switch (emergencyType) {
      case "Job Loss":
        return [
          { key: "notice_period", label: "Notice Period (days)", type: "number" },
          { key: "severance_package", label: "Severance Package Amount (₹)", type: "number" },
          { key: "job_search_timeline", label: "Expected Job Search Duration (months)", type: "number" },
          { key: "has_emi", label: "Do you have EMI/Loans? (Yes/No)", type: "text" },
          { key: "dependents", label: "Number of Dependents", type: "number" },
        ];
      
      case "Medical Emergency":
        return [
          { key: "patient", label: "Patient (Self/Parent/Spouse/Child)", type: "text" },
          { key: "condition", label: "Medical Condition", type: "text" },
          { key: "total_cost", label: "Total Treatment Cost Required (₹)", type: "number" },
          { key: "insurance_coverage", label: "Insurance Will Cover (₹)", type: "number" },
          { key: "urgency", label: "When is Money Needed? (Immediate/This Week/This Month)", type: "text" },
        ];
      
      case "Salary Delay":
        return [
          { key: "delay_duration", label: "How Long is the Delay? (days/months)", type: "text" },
          { key: "pending_bills", label: "Pending Bills Amount (₹)", type: "number" },
          { key: "rent_due", label: "Rent Due (₹)", type: "number" },
          { key: "company_status", label: "Company Status (Stable/Financial Issues/Closing)", type: "text" },
        ];
      
      case "Accident":
        return [
          { key: "accident_type", label: "Type (Vehicle/Personal Injury/Both)", type: "text" },
          { key: "medical_cost", label: "Medical Treatment Cost (₹)", type: "number" },
          { key: "vehicle_damage", label: "Vehicle/Property Damage Cost (₹)", type: "number" },
          { key: "insurance_claim", label: "Insurance Claim Amount (₹)", type: "number" },
          { key: "income_loss_duration", label: "Unable to Work For (months)", type: "number" },
        ];
      
      case "Home Damage":
        return [
          { key: "damage_type", label: "Type of Damage (Fire/Water/Storm/Earthquake)", type: "text" },
          { key: "repair_cost", label: "Estimated Repair Cost (₹)", type: "number" },
          { key: "insurance_claim", label: "Insurance Claim Amount (₹)", type: "number" },
          { key: "temporary_stay_needed", label: "Need Temporary Accommodation? (Yes/No)", type: "text" },
          { key: "urgency", label: "Repair Urgency (Immediate/This Week/This Month)", type: "text" },
        ];
      
      case "Business Loss":
        return [
          { key: "business_type", label: "Type of Business", type: "text" },
          { key: "loss_amount", label: "Total Loss Amount (₹)", type: "number" },
          { key: "outstanding_loans", label: "Outstanding Business Loans (₹)", type: "number" },
          { key: "can_recover", label: "Can Business Recover? (Yes/No/Uncertain)", type: "text" },
          { key: "employees_affected", label: "Number of Employees", type: "number" },
        ];
      
      case "Family Emergency":
        return [
          { key: "emergency_description", label: "Brief Description", type: "text" },
          { key: "amount_needed", label: "Total Amount Required (₹)", type: "number" },
          { key: "urgency", label: "How Urgent? (Immediate/Days/Weeks)", type: "text" },
          { key: "family_contribution", label: "Family Can Contribute (₹)", type: "number" },
          { key: "location", label: "Location (Same City/Different State/International)", type: "text" },
        ];
      
      case "Vehicle Breakdown":
        return [
          { key: "vehicle_type", label: "Vehicle Type (Car/Bike/Commercial)", type: "text" },
          { key: "problem", label: "Problem (Engine/Accident/Major Repair)", type: "text" },
          { key: "repair_cost", label: "Estimated Repair Cost (₹)", type: "number" },
          { key: "insurance_coverage", label: "Insurance Coverage (₹)", type: "number" },
          { key: "need_alternate", label: "Need Alternative Transport? (Yes/No)", type: "text" },
        ];
      
      case "Legal Issue":
        return [
          { key: "issue_type", label: "Type of Legal Issue", type: "text" },
          { key: "lawyer_fees", label: "Lawyer Fees (₹)", type: "number" },
          { key: "case_duration", label: "Expected Case Duration (months)", type: "number" },
          { key: "court_fees", label: "Court Fees and Other Costs (₹)", type: "number" },
        ];
      
      case "Natural Disaster":
        return [
          { key: "disaster_type", label: "Type (Flood/Earthquake/Cyclone/Fire)", type: "text" },
          { key: "damage_extent", label: "Extent of Damage (Partial/Major/Total)", type: "text" },
          { key: "immediate_needs", label: "Immediate Needs (Shelter/Food/Medical)", type: "text" },
          { key: "estimated_loss", label: "Estimated Total Loss (₹)", type: "number" },
          { key: "government_aid_applied", label: "Applied for Government Aid? (Yes/No)", type: "text" },
        ];
      
      default:
        return [];
    }
  };

  const handleSubmit = async () => {
    const questions = getQuestions();
    const missing = questions.filter(q => !details[q.key] || String(details[q.key]).trim() === "");
    
    if (missing.length > 0) {
      toast.error(`Please fill all fields: ${missing.map(q => q.label).join(", ")}`);
      return;
    }
    
    setLoading(true);
    try {
      // Get full financial data
      const assetsRes = await api.get("/api/assets");
      const assets = assetsRes.data.assets || [];
      
      const payload = {
        emergency_type: emergencyType,
        emergency_details: details,
        user_financial_data: {
          monthly_income: financialData.income,
          monthly_expenses: financialData.expenses,
          current_savings: financialData.savings,
          assets: assets.map((a: any) => ({
            name: a.name,
            type: a.asset_type,
            value: a.current_value || 0
          }))
        }
      };
      
      const response = await postEmergencyAdvisor(payload);
      setResult(response.data);
      toast.success("Recovery plan generated!");
    } catch (error: any) {
      console.error("Emergency advisor error:", error);
      toast.error(error?.response?.data?.detail || "Failed to get recovery plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Financial Summary Card - Top */}
      {!financialData.loading && !result && (
        <div className="card" style={{ 
          padding: "1.2rem", 
          background: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(251,146,60,0.05))", 
          borderRadius: "1rem",
          border: "1px solid rgba(239,68,68,0.3)",
          marginBottom: "1.5rem"
        }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            📊 Your Financial Status
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.3rem" }}>Monthly Income</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#34d399" }}>₹{financialData.income.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.3rem" }}>Monthly Expenses</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f59e0b" }}>₹{financialData.expenses.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.3rem" }}>Available Savings</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#3b82f6" }}>₹{financialData.savings.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.3rem" }}>Assets</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#a78bfa" }}>{financialData.assets} items</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="card" style={{ padding: "2rem" }}>
        {!result ? (
          <>
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", fontSize: "1.3rem" }}>🆘 Emergency Recovery Advisor</h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: "2rem" }}>
              Select your emergency type and provide details to get an immediate action plan
            </p>
            
            {/* Emergency Type Selection */}
            <div style={{ marginBottom: "2rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.8)", display: "block", marginBottom: "1rem" }}>
                Step 1: Select Emergency Type
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.8rem" }}>
                {EMERGENCY_TYPES.map(type => (
                  <button 
                    key={type} 
                    onClick={() => { setEmergencyType(type); setDetails({}); }} 
                    style={{
                      padding: "1rem", 
                      borderRadius: "0.75rem", 
                      textAlign: "center",
                      border: emergencyType === type ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
                      background: emergencyType === type ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.03)",
                      color: emergencyType === type ? "#ef4444" : "rgba(255,255,255,0.7)",
                      cursor: "pointer", 
                      fontSize: "0.9rem", 
                      fontWeight: emergencyType === type ? 600 : 500,
                      transition: "all 0.2s",
                      boxShadow: emergencyType === type ? "0 0 0 3px rgba(239,68,68,0.1)" : "none"
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Questions */}
            {emergencyType && (
              <div style={{ marginBottom: "2rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.8)", display: "block", marginBottom: "1rem" }}>
                  Step 2: Provide Emergency Details
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                  {getQuestions().map(q => (
                    <div key={q.key}>
                      <label style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 6 }}>
                        {q.label}
                      </label>
                      <input 
                        className="input-field" 
                        type={q.type}
                        placeholder={q.label}
                        value={details[q.key] || ""} 
                        onChange={e => setDetails(d => ({ ...d, [q.key]: e.target.value }))} 
                        style={{ padding: "0.75rem", fontSize: "0.9rem", width: "100%" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            {emergencyType && (
              <button 
                className="btn-primary" 
                style={{ 
                  padding: "1rem", 
                  fontSize: "1rem", 
                  fontWeight: 600, 
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  width: "100%",
                  borderRadius: "0.75rem"
                }} 
                onClick={handleSubmit} 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: "0.5rem" }} />
                    Analyzing Your Situation...
                  </>
                ) : (
                  <>
                    <i className="fas fa-bolt" style={{ marginRight: "0.5rem" }} />
                    Get My Recovery Plan
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <>
            {/* Back Button */}
            <button 
              onClick={() => { setResult(null); setEmergencyType(""); setDetails({}); }}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                fontSize: "0.85rem",
                marginBottom: "1.5rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <i className="fas fa-arrow-left" />
              Start New Emergency Analysis
            </button>

            {/* Severity Badge */}
            <div style={{ 
              padding: "1.2rem", 
              background: result.severity === "Critical" ? "rgba(239,68,68,0.15)" : result.severity === "High" ? "rgba(251,146,60,0.15)" : "rgba(234,179,8,0.15)",
              border: `2px solid ${result.severity === "Critical" ? "#ef4444" : result.severity === "High" ? "#fb923c" : "#eab308"}`,
              borderRadius: "0.75rem",
              marginBottom: "1.5rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ 
                  fontSize: "2rem",
                  color: result.severity === "Critical" ? "#ef4444" : result.severity === "High" ? "#fb923c" : "#eab308"
                }}>
                  {result.severity === "Critical" ? "🚨" : result.severity === "High" ? "⚠️" : "📋"}
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.2rem" }}>EMERGENCY SEVERITY</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: result.severity === "Critical" ? "#ef4444" : result.severity === "High" ? "#fb923c" : "#eab308" }}>
                    {result.severity}
                  </div>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>


              {/* Immediate Actions */}
              {result.immediate_actions && result.immediate_actions.length > 0 && (
                <div style={{ 
                  padding: "1.5rem", 
                  background: "rgba(239,68,68,0.05)",
                  borderRadius: "0.75rem",
                  border: "2px solid rgba(239,68,68,0.3)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1rem" }}>
                    <div style={{ fontSize: "1.5rem" }}>⚡</div>
                    <h4 style={{ fontWeight: 700, fontSize: "1.1rem", color: "#ef4444", margin: 0 }}>
                      Immediate Actions (Next 24-48 Hours)
                    </h4>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                    {result.immediate_actions.map((action: string, i: number) => (
                      <div key={i} style={{ 
                        padding: "1rem", 
                        background: "rgba(239,68,68,0.08)", 
                        borderLeft: "4px solid #ef4444",
                        borderRadius: "0.5rem",
                        display: "flex",
                        gap: "1rem"
                      }}>
                        <div style={{ 
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: "#ef4444",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {i + 1}
                        </div>
                        <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.9rem", lineHeight: "1.6" }}>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Funding Options */}
              {result.funding_options && result.funding_options.length > 0 && (
                <div style={{ 
                  padding: "1.5rem", 
                  background: "rgba(52,211,153,0.05)",
                  borderRadius: "0.75rem",
                  border: "2px solid rgba(52,211,153,0.3)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1rem" }}>
                    <div style={{ fontSize: "1.5rem" }}>💰</div>
                    <h4 style={{ fontWeight: 700, fontSize: "1.1rem", color: "#34d399", margin: 0 }}>
                      Funding Options
                    </h4>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
                    {result.funding_options.map((option: any, i: number) => (
                      <div key={i} style={{ 
                        padding: "1.2rem", 
                        background: "rgba(52,211,153,0.08)",
                        borderRadius: "0.75rem",
                        border: "1px solid rgba(52,211,153,0.2)"
                      }}>
                        <div style={{ fontWeight: 700, color: "#34d399", marginBottom: "0.6rem", fontSize: "1rem" }}>
                          {option.option}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", marginBottom: "0.8rem", lineHeight: "1.5" }}>
                          {option.description}
                        </div>
                        {option.steps && option.steps.length > 0 && (
                          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.8rem" }}>
                            {option.steps.map((step: string, j: number) => (
                              <div key={j} style={{ marginBottom: "0.3rem", display: "flex", gap: "0.5rem" }}>
                                <span>•</span>
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {option.timeline && (
                          <div style={{ 
                            display: "inline-block",
                            padding: "0.4rem 0.8rem",
                            background: "rgba(59,130,246,0.15)",
                            borderRadius: "0.5rem",
                            fontSize: "0.75rem", 
                            color: "#3b82f6", 
                            fontWeight: 600 
                          }}>
                            ⏱️ {option.timeline}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Recovery Timeline & Recommendations */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                {/* Recovery Timeline */}
                {result.recovery_timeline && (
                  <div style={{ 
                    padding: "1.5rem", 
                    background: "rgba(99,102,241,0.05)",
                    borderRadius: "0.75rem",
                    border: "2px solid rgba(99,102,241,0.3)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1rem" }}>
                      <div style={{ fontSize: "1.5rem" }}>🗓️</div>
                      <h4 style={{ fontWeight: 700, fontSize: "1.1rem", color: "#6366f1", margin: 0 }}>
                        Recovery Timeline
                      </h4>
                    </div>
                    {Object.entries(result.recovery_timeline).map(([period, actions]: [string, any]) => (
                      <div key={period} style={{ marginBottom: "1rem" }}>
                        <div style={{ 
                          fontSize: "0.8rem", 
                          fontWeight: 600, 
                          color: "#6366f1", 
                          marginBottom: "0.5rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          {period.replace(/_/g, ' ')}
                        </div>
                        {actions.map((action: string, i: number) => (
                          <div key={i} style={{ 
                            color: "rgba(255,255,255,0.65)", 
                            fontSize: "0.8rem", 
                            marginBottom: "0.4rem",
                            paddingLeft: "1rem",
                            lineHeight: "1.5"
                          }}>
                            • {action}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Key Recommendations */}
                {result.key_recommendations && result.key_recommendations.length > 0 && (
                  <div style={{ 
                    padding: "1.5rem", 
                    background: "rgba(168,85,247,0.05)",
                    borderRadius: "0.75rem",
                    border: "2px solid rgba(168,85,247,0.3)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1rem" }}>
                      <div style={{ fontSize: "1.5rem" }}>💡</div>
                      <h4 style={{ fontWeight: 700, fontSize: "1.1rem", color: "#a855f7", margin: 0 }}>
                        Key Recommendations
                      </h4>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                      {result.key_recommendations.map((rec: string, i: number) => (
                        <div key={i} style={{ 
                          padding: "0.8rem", 
                          background: "rgba(168,85,247,0.08)",
                          borderLeft: "3px solid #a855f7",
                          borderRadius: "0.5rem"
                        }}>
                          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.85rem", lineHeight: "1.6" }}>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
