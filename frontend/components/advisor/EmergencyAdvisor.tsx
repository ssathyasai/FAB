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
    <div style={{ display: "flex", gap: "1.5rem", height: "calc(100vh - 120px)" }}>
      {/* Left Panel - Input */}
      <div style={{ width: "380px", display: "flex", flexDirection: "column" }}>
        <div className="card" style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "1.1rem" }}>🆘 Emergency Recovery</h3>
          
          {/* Financial Summary Card */}
          {!financialData.loading && (
            <div style={{ 
              padding: "0.8rem", 
              background: "rgba(239,68,68,0.1)", 
              borderRadius: "0.5rem",
              border: "1px solid rgba(239,68,68,0.3)",
              marginBottom: "1rem"
            }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem" }}>
                YOUR FINANCIAL STATUS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.75rem" }}>
                <div>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Income:</span>{" "}
                  <span style={{ color: "#34d399", fontWeight: 600 }}>₹{financialData.income.toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Expenses:</span>{" "}
                  <span style={{ color: "#f59e0b", fontWeight: 600 }}>₹{financialData.expenses.toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Savings:</span>{" "}
                  <span style={{ color: "#3b82f6", fontWeight: 600 }}>₹{financialData.savings.toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Assets:</span>{" "}
                  <span style={{ color: "#a78bfa", fontWeight: 600 }}>{financialData.assets} items</span>
                </div>
              </div>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: "0.5rem" }}>
                ✓ Auto-loaded from your profile
              </div>
            </div>
          )}
          
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Emergency Type Selection */}
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 8 }}>
                SELECT EMERGENCY TYPE
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {EMERGENCY_TYPES.map(type => (
                  <button 
                    key={type} 
                    onClick={() => { setEmergencyType(type); setDetails({}); setResult(null); }} 
                    style={{
                      padding: "0.7rem 1rem", 
                      borderRadius: "0.5rem", 
                      textAlign: "left",
                      border: emergencyType === type ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
                      background: emergencyType === type ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.02)",
                      color: emergencyType === type ? "#ef4444" : "rgba(255,255,255,0.7)",
                      cursor: "pointer", 
                      fontSize: "0.85rem", 
                      fontWeight: emergencyType === type ? 600 : 400,
                      transition: "all 0.2s"
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Questions */}
            {emergencyType && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#ef4444", display: "block", marginBottom: 12 }}>
                  EMERGENCY DETAILS
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  {getQuestions().map(q => (
                    <div key={q.key}>
                      <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>
                        {q.label}
                      </label>
                      <input 
                        className="input-field" 
                        type={q.type}
                        placeholder={q.label}
                        value={details[q.key] || ""} 
                        onChange={e => setDetails(d => ({ ...d, [q.key]: e.target.value }))} 
                        style={{ padding: "0.6rem", fontSize: "0.85rem", width: "100%" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          {emergencyType && (
            <button 
              className="btn-primary" 
              style={{ padding: "0.8rem", marginTop: "1rem", fontSize: "0.9rem", fontWeight: 600, background: "#ef4444" }} 
              onClick={handleSubmit} 
              disabled={loading}
            >
              {loading ? "🔄 Analyzing..." : "💡 Get Recovery Plan"}
            </button>
          )}
        </div>
      </div>

      {/* Right Panel - Results */}
      {result && (
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Severity Badge */}
          <div className="card" style={{ 
            padding: "1rem", 
            background: result.severity === "Critical" ? "rgba(239,68,68,0.1)" : result.severity === "High" ? "rgba(251,146,60,0.1)" : "rgba(234,179,8,0.1)",
            border: `2px solid ${result.severity === "Critical" ? "#ef4444" : result.severity === "High" ? "#fb923c" : "#eab308"}`
          }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: result.severity === "Critical" ? "#ef4444" : result.severity === "High" ? "#fb923c" : "#eab308" }}>
              🚨 Severity: {result.severity}
            </div>
          </div>

          {/* Immediate Actions */}
          {result.immediate_actions && result.immediate_actions.length > 0 && (
            <div className="card" style={{ padding: "1.2rem", borderLeft: "3px solid #ef4444" }}>
              <h4 style={{ fontWeight: 700, marginBottom: "0.8rem", fontSize: "0.95rem", color: "#ef4444" }}>
                ⚡ IMMEDIATE ACTIONS (Next 24-48 Hours)
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {result.immediate_actions.map((action: string, i: number) => (
                  <div key={i} style={{ 
                    padding: "0.7rem", 
                    background: "rgba(239,68,68,0.05)", 
                    borderLeft: "3px solid #ef4444",
                    borderRadius: "0.3rem"
                  }}>
                    <span style={{ color: "#ef4444", fontWeight: 700, marginRight: "0.5rem" }}>{i + 1}.</span>
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Funding Options */}
          {result.funding_options && result.funding_options.length > 0 && (
            <div className="card" style={{ padding: "1.2rem", borderLeft: "3px solid #34d399" }}>
              <h4 style={{ fontWeight: 700, marginBottom: "0.8rem", fontSize: "0.95rem", color: "#34d399" }}>
                💰 FUNDING OPTIONS
              </h4>
              {result.funding_options.map((option: any, i: number) => (
                <div key={i} style={{ 
                  marginBottom: "1rem", 
                  padding: "0.8rem", 
                  background: "rgba(52,211,153,0.05)",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(52,211,153,0.2)"
                }}>
                  <div style={{ fontWeight: 700, color: "#34d399", marginBottom: "0.4rem", fontSize: "0.9rem" }}>
                    {i + 1}. {option.option}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                    {option.description}
                  </div>
                  {option.steps && option.steps.length > 0 && (
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                      {option.steps.map((step: string, j: number) => (
                        <div key={j} style={{ marginBottom: "0.2rem" }}>• {step}</div>
                      ))}
                    </div>
                  )}
                  {option.timeline && (
                    <div style={{ fontSize: "0.75rem", color: "#3b82f6", marginTop: "0.4rem", fontWeight: 600 }}>
                      ⏱️ {option.timeline}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Recovery Timeline */}
          {result.recovery_timeline && (
            <div className="card" style={{ padding: "1.2rem" }}>
              <h4 style={{ fontWeight: 700, marginBottom: "0.8rem", fontSize: "0.95rem" }}>
                🗓️ Recovery Timeline
              </h4>
              {Object.entries(result.recovery_timeline).map(([period, actions]: [string, any]) => (
                <div key={period} style={{ marginBottom: "0.8rem" }}>
                  <div style={{ 
                    fontSize: "0.8rem", 
                    fontWeight: 600, 
                    color: "#6366f1", 
                    marginBottom: "0.4rem",
                    textTransform: "uppercase"
                  }}>
                    {period.replace(/_/g, ' ')}
                  </div>
                  {actions.map((action: string, i: number) => (
                    <div key={i} style={{ 
                      color: "rgba(255,255,255,0.6)", 
                      fontSize: "0.75rem", 
                      marginBottom: "0.2rem",
                      paddingLeft: "0.8rem"
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
            <div className="card" style={{ padding: "1.2rem" }}>
              <h4 style={{ fontWeight: 700, marginBottom: "0.8rem", fontSize: "0.95rem" }}>
                💡 Key Recommendations
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {result.key_recommendations.map((rec: string, i: number) => (
                  <div key={i} style={{ 
                    padding: "0.7rem", 
                    background: "rgba(255,255,255,0.02)",
                    borderLeft: "3px solid #6366f1",
                    borderRadius: "0.3rem"
                  }}>
                    <span style={{ color: "#6366f1", fontWeight: 700, marginRight: "0.5rem" }}>{i + 1}.</span>
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
