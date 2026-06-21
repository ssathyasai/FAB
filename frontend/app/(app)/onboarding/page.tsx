"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSettings } from "@/lib/api";
import toast from "react-hot-toast";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    income_baseline: "",
    income_type: "fixed",
    phone_number: "",
  });
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step === 1) {
      if (!data.income_baseline || parseFloat(data.income_baseline) <= 0) {
        toast.error("Please enter a valid income");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await updateSettings({
        income_baseline: parseFloat(data.income_baseline),
        income_type: data.income_type,
        phone_number: data.phone_number || null,
        onboarding_complete: true,
      });
      toast.success("Welcome to FAB Finance! 🎉");
      router.push("/budget/setup");
    } catch (err) {
      toast.error("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem"
    }}>
      <div style={{
        maxWidth: "540px",
        width: "100%",
        background: "rgba(240,180,41,0.04)",
        border: "1px solid rgba(240,180,41,0.12)",
        borderRadius: "1.5rem",
        padding: "3rem 2.5rem",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
      }}>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "1rem",
            background: "linear-gradient(135deg, #f0b429 0%, #6366f1 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            fontSize: "2rem"
          }}>
            💰
          </div>
          <h1 style={{
            fontSize: "2rem",
            fontWeight: 800,
            color: "#f5f0e8",
            marginBottom: "0.5rem"
          }}>
            Welcome to FAB Finance
          </h1>
          <p style={{ color: "rgba(240,180,41,0.5)", fontSize: "0.95rem" }}>
            Let's set up your profile in 2 quick steps
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "0.75rem"
          }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                flex: 1,
                height: "4px",
                borderRadius: "99px",
                background: s <= step
                  ? "linear-gradient(90deg, #f0b429 0%, #6366f1 100%)"
                  : "rgba(240,180,41,0.1)"
              }} />
            ))}
          </div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.75rem",
            color: "rgba(240,180,41,0.4)"
          }}>
            <span>Step {step} of 2</span>
            <span>{step === 1 ? "Income" : "Contact"}</span>
          </div>
        </div>

        {/* Step 1: Income */}
        {step === 1 && (
          <div className="page-enter">
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#f5f0e8",
                marginBottom: "0.75rem"
              }}>
                Monthly Income *
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(240,180,41,0.5)",
                  fontSize: "1.1rem",
                  fontWeight: 600
                }}>
                  ₹
                </span>
                <input
                  type="number"
                  value={data.income_baseline}
                  onChange={e => setData({ ...data, income_baseline: e.target.value })}
                  placeholder="50000"
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "0.9rem 1rem 0.9rem 2.5rem",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(240,180,41,0.2)",
                    borderRadius: "0.75rem",
                    color: "#f5f0e8",
                    fontSize: "1.1rem",
                    fontWeight: 600
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#f5f0e8",
                marginBottom: "0.75rem"
              }}>
                Income Type *
              </label>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {["fixed", "variable"].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setData({ ...data, income_type: type })}
                    style={{
                      flex: 1,
                      padding: "0.9rem",
                      borderRadius: "0.75rem",
                      border: `2px solid ${data.income_type === type ? "#f0b429" : "rgba(240,180,41,0.15)"}`,
                      background: data.income_type === type
                        ? "rgba(240,180,41,0.12)"
                        : "rgba(240,180,41,0.03)",
                      color: data.income_type === type ? "#f0b429" : "rgba(240,180,41,0.5)",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize",
                      transition: "all 0.2s"
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              padding: "1rem",
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "0.75rem",
              fontSize: "0.8rem",
              color: "rgba(240,180,41,0.6)",
              lineHeight: 1.6
            }}>
              <i className="fas fa-info-circle" style={{ color: "#6366f1", marginRight: "0.5rem" }} />
              This helps us provide personalized budget recommendations
            </div>
          </div>
        )}

        {/* Step 2: Contact */}
        {step === 2 && (
          <div className="page-enter">
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#f5f0e8",
                marginBottom: "0.75rem"
              }}>
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={data.phone_number}
                onChange={e => setData({ ...data, phone_number: e.target.value })}
                placeholder="+91 98765 43210"
                autoFocus
                style={{
                  width: "100%",
                  padding: "0.9rem 1rem",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(240,180,41,0.2)",
                  borderRadius: "0.75rem",
                  color: "#f5f0e8",
                  fontSize: "0.95rem"
                }}
              />
            </div>

            <div style={{
              padding: "1rem",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: "0.75rem",
              fontSize: "0.8rem",
              color: "rgba(240,180,41,0.6)",
              lineHeight: 1.6
            }}>
              <i className="fas fa-check-circle" style={{ color: "#22c55e", marginRight: "0.5rem" }} />
              You can update these details anytime in Settings
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: "flex",
          gap: "0.75rem",
          marginTop: "2rem"
        }}>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              disabled={loading}
              style={{
                padding: "0.9rem 1.5rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(240,180,41,0.2)",
                background: "rgba(240,180,41,0.05)",
                color: "rgba(240,180,41,0.7)",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <i className="fas fa-arrow-left" /> Back
            </button>
          )}
          
          <button
            onClick={handleNext}
            disabled={loading}
            style={{
              flex: 1,
              padding: "0.9rem 1.5rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "linear-gradient(135deg, #f0b429 0%, #6366f1 100%)",
              color: "#fff",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? (
              "Saving..."
            ) : step === 2 ? (
              <>Continue to Budget Setup <i className="fas fa-arrow-right" /></>
            ) : (
              <>Next <i className="fas fa-arrow-right" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
