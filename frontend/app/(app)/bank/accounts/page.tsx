"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { PageHeader, Loading } from "@/components/ui";
import toast from "react-hot-toast";

export default function BankAccounts() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newBalance, setNewBalance] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/api/bank/balance");
      setBalance(response.data.balance || 0);
      setNewBalance(String(response.data.balance || 0));
    } catch (error) {
      console.error("Failed to load balance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateBalance = async () => {
    const amount = parseFloat(newBalance);
    if (isNaN(amount) || amount < 0) {
      toast.error("Enter a valid balance");
      return;
    }

    try {
      await api.post("/api/bank/set-balance", { balance: amount });
      toast.success("Balance updated successfully!");
      setBalance(amount);
      setEditing(false);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to update balance");
    }
  };

  if (loading) return <Loading text="Loading bank account..." />;

  return (
    <div className="page-enter">
      <PageHeader
        icon="fas fa-university"
        title="Bank Account"
        color="#8b5cf6"
        sub="Your current bank balance"
      />

      {/* Main Balance Card */}
      <div
        className="card"
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "3rem 2.5rem",
          textAlign: "center",
          background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(6,182,212,0.06) 100%)",
          border: "1px solid rgba(139,92,246,0.20)",
        }}
      >
        {/* Bank Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            fontSize: "2rem",
            boxShadow: "0 8px 32px rgba(139,92,246,0.30)",
          }}
        >
          <i className="fas fa-university" />
        </div>

        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            marginBottom: "1rem",
            color: "var(--text2)",
          }}
        >
          Current Balance
        </h2>

        {!editing ? (
          <>
            {/* Display Balance */}
            <div
              style={{
                fontSize: "3rem",
                fontWeight: 800,
                color: "#8b5cf6",
                letterSpacing: "-0.03em",
                marginBottom: "1.5rem",
              }}
            >
              {formatINR(balance)}
            </div>

            <button
              onClick={() => {
                setEditing(true);
                setNewBalance(String(balance));
              }}
              className="btn-primary"
              style={{
                padding: "0.8rem 2rem",
              }}
            >
              <i className="fas fa-edit" /> Update Balance
            </button>
          </>
        ) : (
          <>
            {/* Edit Balance */}
            <div style={{ marginBottom: "1.5rem" }}>
              <input
                type="number"
                className="input-field"
                placeholder="Enter new balance"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                autoFocus
                style={{
                  fontSize: "1.5rem",
                  textAlign: "center",
                  fontWeight: 700,
                  maxWidth: "400px",
                  margin: "0 auto",
                }}
              />
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text4)",
                  marginTop: "0.5rem",
                }}
              >
                Enter your current bank balance in ₹
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button onClick={updateBalance} className="btn-primary">
                <i className="fas fa-check" /> Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setNewBalance(String(balance));
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Info Text */}
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            fontSize: "0.82rem",
            color: "var(--text3)",
            textAlign: "left",
          }}
        >
          <div style={{ marginBottom: "0.5rem", fontWeight: 600, color: "var(--text2)" }}>
            <i className="fas fa-info-circle" /> How it works:
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.6 }}>
            <li>This balance is set during budget setup</li>
            <li>When you add money → Auto-categorized as Income ✅</li>
            <li>When you spend money → Appears in Transactions (needs categorization)</li>
            <li>Update this balance anytime to reflect your current account</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
