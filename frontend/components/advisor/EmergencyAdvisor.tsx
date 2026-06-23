"use client";
import { useState, useEffect } from "react";
import { postEmergencyAdvisor } from "@/lib/api";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const EMERGENCY_TYPES = [
  "Medical Emergency",
  "Job Loss",
  "Accident",
  "Home Damage",
  "Business Loss",
  "Family Emergency",
  "Vehicle Breakdown",
  "Legal Issue"
];

type Field = [string, string, string]; // [key, label, inputType]

export default function EmergencyAdvisor() {
  const [eType, setEType] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Auto-fetch user's financial data
  const [userData, setUserData] = useState<any>({
    assets: [],
    income: 0,
    expenses: 0,
    savings: 0,
    loading: true
  });

  useEffect(() => {
    fetchUserFinancialData();
  }, []);

  const fetchUserFinancialData = async () => {
    try {
      setUserData(prev => ({ ...prev, loading: true }));
      
      // Fetch assets
      const assetsRes = await api.get("/api/assets");
      const assets = assetsRes.data.assets || [];
      
      // Fetch budget/income from settings
      const settingsRes = await api.get("/api/settings");
      const income = settingsRes.data.income_baseline || 0;
      
      // Fetch current month budget to get expenses
      const currentMonth = new Date().toISOString().slice(0, 7);
      let expenses = 0;
      try {
        const budgetRes = await api.get(`/api/budget?month=${currentMonth}`);
        if (budgetRes.data.budget) {
          expenses = budgetRes.data.budget.categories?.reduce((sum: number, cat: any) => sum + (cat.spent || 0), 0) || 0;
        }
      } catch (e) {
        console.log("No budget data yet, expenses will be 0");
      }
      
      // Fetch bank balance (savings)
      const balanceRes = await api.get("/api/balance");
      const savings = balanceRes.data.balance || 0;
      
      setUserData({
        assets,
        income,
        expenses,
        savings,
        loading: false
      });
      
      console.log("[Emergency Advisor] Financial data loaded:", { income, expenses, savings, assets: assets.length });
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      toast.error("Failed to load your financial data. Using defaults.");
      setUserData({ assets: [], income: 0, expenses: 0, savings: 0, loading: false });
    }
  };

  const submit = async () => {
    // Validate all required fields are filled
    const fields = getFields();
    const missingFields = fields.filter(([key]) => !details[key] || String(details[key]).trim() === "");
    
    if (missingFields.length > 0) {
      toast.error(`Please fill all required fields: ${missingFields.map(([_, label]) => label).join(", ")}`);
      return;
    }
    
    setLoading(true);
    try {
      // Prepare enhanced payload with user's financial data
      const payload = {
        emergency_type: eType,
        emergency_details: details,
        user_financial_data: {
          assets: userData.assets.map((a: any) => ({
            type: a.asset_type,
            name: a.name,
            current_value: a.current_value,
            purchase_value: a.purchase_value
          })),
          monthly_income: userData.income,
          monthly_expenses: userData.expenses,
          current_savings: userData.savings,
          total_assets_value: userData.assets.reduce((sum: number, a: any) => sum + (a.current_value || 0), 0)
        }
      };
      
      console.log("[Emergency Advisor] Submitting with payload:", payload);
      
      const r = await postEmergencyAdvisor(payload);
      setResult(r.data);
      toast.success("Emergency recovery plan generated!");
    } catch (e: any) {
      console.error("Emergency advisor error:", e);
      const errorMsg = e.response?.data?.detail || e.message || "Failed to get emergency advice";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getFields = (): Field[] => {
    if (eType === "Job Loss") return [
      ["emi_amount", "Total Monthly EMI/Loan Payments (₹)", "number"],
      ["severance_package", "Severance Package Received (₹)", "number"],
      ["job_search_duration", "Expected Job Search Duration (months)", "number"],
      ["has_health_insurance", "Do you have Health Insurance? (Yes/No)", "text"],
      ["dependents", "Number of Dependents", "number"],
    ];
    
    if (eType === "Medical Emergency") return [
      ["patient_relation", "Patient (Self/Parent/Spouse/Child)", "text"],
      ["medical_condition", "Medical Condition/Diagnosis", "text"],
      ["total_medical_cost", "Total Medical Cost Required (₹)", "number"],
      ["insurance_coverage", "Insurance Will Cover (₹)", "number"],
      ["urgency", "When is Money Needed? (Immediate/This Week/This Month)", "text"],
      ["hospital_name", "Hospital/Treatment Center", "text"],
    ];
    
    if (eType === "Business Loss") return [
      ["business_type", "Type of Business", "text"],
      ["loss_amount", "Total Loss/Damage Amount (₹)", "number"],
      ["business_loans", "Outstanding Business Loans (₹)", "number"],
      ["can_recover", "Can Business Recover? (Yes/No/Uncertain)", "text"],
      ["recovery_timeline", "Expected Recovery Timeline (months)", "number"],
      ["employees", "Number of Employees Affected", "number"],
    ];
    
    if (eType === "Home Damage") return [
      ["damage_type", "Type of Damage (Fire/Water/Earthquake/Storm)", "text"],
      ["repair_cost", "Estimated Repair Cost (₹)", "number"],
      ["insurance_claim", "Insurance Claim Amount Applied (₹)", "number"],
      ["repair_urgency", "Repair Urgency (Immediate/This Week/This Month)", "text"],
      ["temporary_stay_needed", "Need Temporary Accommodation? (Yes/No)", "text"],
      ["family_members", "Number of Family Members Affected", "number"],
    ];
    
    if (eType === "Accident") return [
      ["accident_type", "Accident Type (Vehicle/Personal Injury/Both)", "text"],
      ["medical_expenses", "Medical Treatment Cost (₹)", "number"],
      ["vehicle_damage_cost", "Vehicle/Property Damage (₹)", "number"],
      ["insurance_coverage", "Insurance Will Cover (₹)", "number"],
      ["income_loss_duration", "Unable to Work Duration (months)", "number"],
      ["accident_date", "When did it happen? (e.g., Yesterday, Last Week)", "text"],
    ];
    
    if (eType === "Family Emergency") return [
      ["emergency_description", "Brief Description of Emergency", "text"],
      ["amount_needed", "Total Amount Required (₹)", "number"],
      ["urgency", "How Urgent? (Immediate/Days/Weeks)", "text"],
      ["family_contribution", "Family Can Contribute (₹)", "number"],
      ["location", "Location (Same City/Different State/International)", "text"],
    ];
    
    if (eType === "Legal Issue") return [
      ["legal_issue_type", "Type of Legal Issue", "text"],
      ["lawyer_fees", "Lawyer/Legal Fees (₹)", "number"],
      ["case_duration", "Expected Case Duration (months)", "number"],
      ["court_fees", "Court Fees and Other Costs (₹)", "number"],
      ["settlement_amount", "Settlement Amount if Applicable (₹)", "number"],
    ];
    
    if (eType === "Vehicle Breakdown") return [
      ["vehicle_type", "Vehicle Type (Car/Bike/Commercial)", "text"],
      ["problem_type", "Problem (Engine/Accident/Theft/Major Repair)", "text"],
      ["repair_cost", "Estimated Repair/Replacement Cost (₹)", "number"],
      ["insurance_coverage", "Insurance Coverage (₹)", "number"],
      ["need_alternate_transport", "Need Alternative Transport? (Yes/No)", "text"],
      ["vehicle_age", "Vehicle Age (years)", "number"],
    ];
    
    return [];
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", gap: "1.5rem", height: "calc(100vh - 120px)" }}>
        {/* Left Panel */}
        <div style={{ width: "380px", display: "flex", flexDirection: "column" }}>
        <div className="card" style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "1.1rem" }}>🆘 Emergency Advisor</h3>
          
          {/* User Financial Summary */}
          {!userData.loading && (
            <div style={{ 
              padding: "0.8rem", 
              background: "rgba(99,102,241,0.1)", 
              borderRadius: "0.5rem",
              border: "1px solid rgba(99,102,241,0.3)",
              marginBottom: "1rem"
            }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem" }}>
                YOUR FINANCIAL DATA
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.75rem" }}>
                <div>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Income:</span>{" "}
                  <span style={{ color: "#34d399", fontWeight: 600 }}>₹{userData.income.toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Expenses:</span>{" "}
                  <span style={{ color: "#f59e0b", fontWeight: 600 }}>₹{userData.expenses.toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Savings:</span>{" "}
                  <span style={{ color: "#3b82f6", fontWeight: 600 }}>₹{userData.savings.toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Assets:</span>{" "}
                  <span style={{ color: "#a78bfa", fontWeight: 600 }}>{userData.assets.length} items</span>
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
                {EMERGENCY_TYPES.map(t => (
                  <button 
                    key={t} 
                    onClick={() => { setEType(t); setDetails({}); setResult(null); }} 
                    style={{
                      padding: "0.7rem 1rem", 
                      borderRadius: "0.5rem", 
                      textAlign: "left",
                      border: eType === t ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,0.1)",
                      background: eType === t ? "var(--accent-dim)" : "rgba(255,255,255,0.02)",
                      color: eType === t ? "var(--accent)" : "rgba(255,255,255,0.7)",
                      cursor: "pointer", 
                      fontSize: "0.85rem", 
                      fontWeight: eType === t ? 600 : 400,
                      transition: "all 0.2s"
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Fields */}
            {eType && (
              <>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--accent)", display: "block", marginBottom: 12 }}>
                    EMERGENCY-SPECIFIC DETAILS
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                    {getFields().map(([key, label, type]) => (
                      <div key={key}>
                        <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>
                          {label}
                        </label>
                        <input 
                          className="input-field" 
                          type={type}
                          placeholder={label}
                          value={details[key] || ""} 
                          onChange={e => setDetails(d => ({ ...d, [key]: e.target.value }))} 
                          style={{ padding: "0.6rem", fontSize: "0.85rem", width: "100%" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Submit Button */}
          {eType && (
            <button 
              className="btn-primary" 
              style={{ padding: "0.8rem", marginTop: "1rem", fontSize: "0.9rem", fontWeight: 600 }} 
              onClick={submit} 
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
          {result.error ? (
            <div className="card" style={{ padding: "1.5rem", color: "#ff6b6b", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚠️</div>
              <div style={{ fontWeight: 600 }}>{result.error}</div>
            </div>
          ) : (
            <>
              {/* Financial Summary */}
              {result.financial_summary && (
                <div className="card" style={{ padding: "1.2rem", borderLeft: "3px solid #3b82f6" }}>
                  <h4 style={{ fontWeight: 700, color: "#3b82f6", marginBottom: "0.8rem", fontSize: "0.95rem" }}>
                    📊 Your Financial Situation
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>Monthly Income</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#34d399" }}>
                        ₹{result.financial_summary.income?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>Monthly Expenses</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f59e0b" }}>
                        ₹{result.financial_summary.expenses?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>Available Savings</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#3b82f6" }}>
                        ₹{result.financial_summary.savings?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                  {result.financial_summary.gap && (
                    <div style={{ marginTop: "0.8rem", padding: "0.6rem", background: "rgba(255,107,107,0.1)", borderRadius: "0.4rem", borderLeft: "3px solid #ff6b6b" }}>
                      <div style={{ fontSize: "0.75rem", color: "#ff6b6b", fontWeight: 600 }}>
                        💰 Financial Gap: ₹{result.financial_summary.gap.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Situation Assessment */}
              {result.situation_assessment && (
                <div className="card" style={{ padding: "1.2rem", borderLeft: "3px solid #ff6b6b" }}>
                  <h4 style={{ fontWeight: 700, color: "#ff6b6b", marginBottom: "0.5rem", fontSize: "0.95rem", textTransform: "uppercase" }}>
                    🚨 Situation: {result.situation_assessment.severity}
                  </h4>
                  <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                    {result.situation_assessment.assessment}
                  </p>
                </div>
              )}

              {/* Immediate Actions */}
              {result.immediate_actions && result.immediate_actions.length > 0 && (
                <div className="card" style={{ padding: "1.2rem" }}>
                  <h4 style={{ fontWeight: 700, marginBottom: "0.8rem", fontSize: "0.95rem", color: "#ff6b6b" }}>
                    ⚡ IMMEDIATE ACTIONS (Next 24-48 Hours)
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {result.immediate_actions.map((action: string, i: number) => (
                      <div key={i} style={{ 
                        padding: "0.7rem", 
                        background: "rgba(255,107,107,0.05)", 
                        borderLeft: "3px solid #ff6b6b",
                        borderRadius: "0.3rem"
                      }}>
                        <span style={{ color: "#ff6b6b", fontWeight: 700, marginRight: "0.5rem" }}>{i + 1}.</span>
                        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Where to Get Money - SPECIFIC GUIDANCE */}
              {result.funding_sources && (
                <div className="card" style={{ padding: "1.2rem", borderLeft: "3px solid #34d399" }}>
                  <h4 style={{ fontWeight: 700, marginBottom: "0.8rem", fontSize: "0.95rem", color: "#34d399" }}>
                    💰 WHERE TO GET MONEY - Specific Places to Approach
                  </h4>
                  {result.funding_sources.map((source: any, i: number) => (
                    <div key={i} style={{ 
                      marginBottom: "1rem", 
                      padding: "0.8rem", 
                      background: "rgba(52,211,153,0.05)",
                      borderRadius: "0.5rem",
                      border: "1px solid rgba(52,211,153,0.2)"
                    }}>
                      <div style={{ fontWeight: 700, color: "#34d399", marginBottom: "0.4rem", fontSize: "0.9rem" }}>
                        {i + 1}. {source.source}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                        {source.description}
                      </div>
                      {source.where_to_approach && (
                        <div style={{ 
                          padding: "0.6rem", 
                          background: "rgba(59,130,246,0.1)", 
                          borderRadius: "0.3rem",
                          marginTop: "0.5rem"
                        }}>
                          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.3rem" }}>
                            📍 WHERE TO APPROACH:
                          </div>
                          {source.where_to_approach.map((place: string, j: number) => (
                            <div key={j} style={{ color: "#3b82f6", fontSize: "0.8rem", marginBottom: "0.2rem" }}>
                              • {place}
                            </div>
                          ))}
                        </div>
                      )}
                      {source.timeline && (
                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginTop: "0.4rem" }}>
                          ⏱️ Timeline: {source.timeline}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Asset Liquidation Guide */}
              {result.asset_liquidation && result.asset_liquidation.length > 0 && (
                <div className="card" style={{ padding: "1.2rem" }}>
                  <h4 style={{ fontWeight: 700, marginBottom: "0.8rem", fontSize: "0.95rem", color: "#f59e0b" }}>
                    🏦 HOW TO SELL YOUR ASSETS - Step by Step
                  </h4>
                  {result.asset_liquidation.map((asset: any, i: number) => (
                    <div key={i} style={{ 
                      marginBottom: "0.8rem", 
                      padding: "0.8rem", 
                      background: "rgba(245,158,11,0.05)",
                      borderRadius: "0.4rem",
                      border: "1px solid rgba(245,158,11,0.2)"
                    }}>
                      <div style={{ fontWeight: 700, color: "#f59e0b", marginBottom: "0.4rem" }}>
                        {asset.asset_type}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem" }}>
                        💵 Expected Value: ₹{asset.expected_value?.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.5rem" }}>
                        {asset.how_to_sell}
                      </div>
                      {asset.where_to_sell && (
                        <div style={{ 
                          padding: "0.5rem", 
                          background: "rgba(59,130,246,0.1)", 
                          borderRadius: "0.3rem",
                          marginTop: "0.4rem"
                        }}>
                          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.3rem" }}>
                            📍 WHERE TO SELL:
                          </div>
                          {asset.where_to_sell.map((place: string, j: number) => (
                            <div key={j} style={{ color: "#3b82f6", fontSize: "0.75rem", marginBottom: "0.1rem" }}>
                              • {place}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Recovery Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="card" style={{ padding: "1.2rem" }}>
                  <h4 style={{ fontWeight: 700, marginBottom: "0.8rem", fontSize: "0.95rem" }}>
                    💡 Recovery Recommendations
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {result.recommendations.map((rec: string, i: number) => (
                      <div key={i} style={{ 
                        padding: "0.7rem", 
                        background: "rgba(255,255,255,0.02)",
                        borderLeft: "3px solid var(--accent)",
                        borderRadius: "0.3rem"
                      }}>
                        <span style={{ color: "var(--accent)", fontWeight: 700, marginRight: "0.5rem" }}>{i + 1}.</span>
                        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline Roadmap */}
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
                        color: "var(--accent)", 
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
            </>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
