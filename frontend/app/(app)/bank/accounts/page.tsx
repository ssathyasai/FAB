"use client";
import { useEffect, useState } from "react";
import { api, getTransactions, categorizeTransaction, splitCategorizeTransaction } from "@/lib/api";
import { formatINR, formatDate, formatTime, EXPENSE_CATEGORIES, CATEGORY_ICONS } from "@/lib/utils";
import { PageHeader, Loading, Empty } from "@/components/ui";
import toast from "react-hot-toast";

const TX_TYPES = ["expense", "income", "savings", "transfer"];
const INCOME_TYPES = ["Salary", "Business", "Freelance", "Investment", "Gift", "Other"];

export default function BankAccounts() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newBalance, setNewBalance] = useState("");

  // Transactions State
  const [txns, setTxns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ status: "", month: "", type: "" });
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({
    category_type: "expense",
    expense_category: "",
    income_type: "",
    note: "",
  });
  const [addingNew, setAddingNew] = useState(false);
  const [newTxn, setNewTxn] = useState({
    amount: "",
    type: "debit",
    category: "",
    note: "",
    actual_price: "",
  });

  // Split Transactions State
  const [isSplitting, setIsSplitting] = useState(false);
  const [splits, setSplits] = useState<any[]>([
    { expense_category: "", amount: "", note: "" },
    { expense_category: "", amount: "", note: "" },
  ]);

  const loadBalance = async () => {
    try {
      const response = await api.get("/api/bank/balance");
      setBalance(response.data.balance || 0);
      setNewBalance(String(response.data.balance || 0));
    } catch (error) {
      console.error("Failed to load balance:", error);
    }
  };

  const loadTransactions = async () => {
    const p: any = {};
    if (filter.status) p.status = filter.status;
    if (filter.month) p.month = filter.month;
    try {
      const r = await getTransactions(p);
      setTxns(r.data.transactions);
      setTotal(r.data.total);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  };

  const loadAll = async () => {
    try {
      await Promise.all([loadBalance(), loadTransactions()]);
    } catch (error) {
      console.error("Failed to load bank data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filter]);

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
      loadAll();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to update balance");
    }
  };

  const openModal = (tx: any) => {
    setModal(tx);
    setIsSplitting(false);
    setSplits([
      { expense_category: "", amount: "", note: "" },
      { expense_category: "", amount: "", note: "" },
    ]);
    setForm({
      category_type: tx.category_type === "uncategorized" ? "expense" : tx.category_type,
      expense_category: tx.expense_category || "",
      income_type: tx.income_type || "",
      note: tx.note || "",
    });
  };

  const save = async () => {
    try {
      await categorizeTransaction(modal.id, form);
      toast.success("✅ Transaction categorized!");
      setModal(null);
      loadAll();
    } catch {
      toast.error("Failed to categorize");
    }
  };

  const addTransaction = async () => {
    if (!newTxn.amount || parseFloat(newTxn.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    try {
      const data: any = {
        amount: parseFloat(newTxn.amount),
        type: newTxn.type,
        category: newTxn.category || undefined,
        note: newTxn.note || undefined,
      };

      if (newTxn.actual_price) {
        data.actual_price = parseFloat(newTxn.actual_price);
      }

      const response = await api.post("/api/bank/record-transaction", data);

      if (response.data.leak_detected) {
        toast.error("⚠️ Suspicious transaction detected! Check alerts.", {
          duration: 5000,
        });
      } else {
        toast.success("Transaction recorded!");
      }

      setAddingNew(false);
      setNewTxn({ amount: "", type: "debit", category: "", note: "", actual_price: "" });
      loadAll();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to record transaction");
    }
  };

  const getCategoryIcon = (tx: any) => {
    if (tx.expense_category) return CATEGORY_ICONS[tx.expense_category] || "📦";
    if (tx.transaction_type === "credit") return "💰";
    return "💸";
  };

  const getCategoryName = (tx: any) => {
    if (tx.expense_category) return tx.expense_category;
    if (tx.income_type) return tx.income_type;
    if (tx.status === "pending") return "Needs Categorization";
    return "Uncategorized";
  };

  // Splits helper functions
  const splitTotal = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const remainingAmount = modal ? modal.amount - splitTotal : 0;

  const updateSplit = (index: number, key: string, value: any) => {
    const nextSplits = [...splits];
    nextSplits[index] = { ...nextSplits[index], [key]: value };
    setSplits(nextSplits);
  };

  const addSplitRow = () => {
    setSplits([...splits, { expense_category: "", amount: "", note: "" }]);
  };

  const removeSplitRow = (index: number) => {
    if (splits.length <= 2) return;
    setSplits(splits.filter((_, i) => i !== index));
  };

  const saveSplits = async () => {
    if (Math.abs(remainingAmount) > 0.01) {
      toast.error(`Allocated amounts must sum to exactly ${formatINR(modal.amount)}`);
      return;
    }

    for (let i = 0; i < splits.length; i++) {
      const s = splits[i];
      const amt = parseFloat(s.amount);
      if (!s.expense_category) {
        toast.error(`Please select a category for row ${i + 1}`);
        return;
      }
      if (isNaN(amt) || amt <= 0) {
        toast.error(`Please enter a valid amount for row ${i + 1}`);
        return;
      }
    }

    try {
      const payload = {
        splits: splits.map((s) => ({
          expense_category: s.expense_category,
          amount: parseFloat(s.amount),
          note: s.note || undefined,
        })),
      };
      await splitCategorizeTransaction(modal.id, payload);
      toast.success("✅ Transaction split and categorized!");
      setModal(null);
      loadAll();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to split transaction");
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
          maxWidth: "400px",
          margin: "0 auto 2rem",
          padding: "2rem 1.5rem",
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


      </div>

      {/* ── Transactions Section ── */}
      <div style={{ marginTop: "3rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text1)" }}>
            <i className="fas fa-exchange-alt" style={{ marginRight: "0.6rem", color: "#3b82f6" }} />
            Transactions
          </h2>
          <p style={{ color: "var(--text3)", fontSize: "0.85rem", marginTop: 2 }}>
            {total} total · {txns.filter((t) => t.status === "pending").length} pending
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.8rem" }}>
          <button onClick={() => setAddingNew(true)} className="btn-primary" style={{ width: "auto", padding: "0.7rem 1.3rem" }}>
            <i className="fas fa-plus" /> Add Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <select
          className="input"
          style={{ width: "auto", padding: "0.6rem 1rem", fontSize: "0.85rem" }}
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Status</option>
          <option value="pending">⏳ Pending</option>
          <option value="categorized">✅ Categorized</option>
        </select>
        <input
          className="input"
          type="month"
          style={{ width: "auto", padding: "0.6rem 1rem", fontSize: "0.85rem" }}
          value={filter.month}
          onChange={(e) => setFilter((f) => ({ ...f, month: e.target.value }))}
        />
      </div>

      {txns.length === 0 ? (
        <Empty
          icon="fas fa-receipt"
          title="No transactions found"
          sub="Record your first transaction to start tracking"
          action={
            <button onClick={() => setAddingNew(true)} className="btn-primary" style={{ width: "auto", marginTop: "1rem" }}>
              <i className="fas fa-plus" /> Add Transaction
            </button>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {txns.map((tx) => (
            <div
              key={tx.id}
              className="card card-hover"
              style={{
                padding: "1.3rem 1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "1.2rem",
                cursor: tx.status === "pending" && tx.transaction_type === "debit" ? "pointer" : "default",
              }}
              onClick={() => tx.status === "pending" && tx.transaction_type === "debit" && openModal(tx)}
            >
              {/* Icon */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    tx.transaction_type === "credit"
                      ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.10))"
                      : "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.10))",
                  border: `2px solid ${tx.transaction_type === "credit" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                  fontSize: "1.3rem",
                  boxShadow:
                    tx.transaction_type === "credit"
                      ? "0 4px 16px rgba(16,185,129,0.15)"
                      : "0 4px 16px rgba(239,68,68,0.15)",
                }}
              >
                {getCategoryIcon(tx)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text1)" }}>
                    {getCategoryName(tx)}
                  </span>
                  {tx.status === "pending" ? (
                    <span className="badge-warning">⏳ PENDING</span>
                  ) : tx.transaction_type === "credit" ? (
                    <span className="badge-income">💰 INCOME</span>
                  ) : (
                    <span className="badge-expense">💸 EXPENSE</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text3)",
                    display: "flex",
                    gap: "1rem",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <span>
                    <i className="fas fa-calendar" style={{ marginRight: "0.3rem" }} />
                    {formatDate(tx.created_at)}
                  </span>
                  <span>
                    <i className="fas fa-clock" style={{ marginRight: "0.3rem" }} />
                    {formatTime(tx.created_at)}
                  </span>
                  {tx.note && (
                    <span>
                      <i className="fas fa-sticky-note" style={{ marginRight: "0.3rem" }} />
                      {tx.note}
                    </span>
                  )}
                  <span>
                    Balance: <strong style={{ color: "var(--text2)" }}>{formatINR(tx.balance_after)}</strong>
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  flexShrink: 0,
                  color: tx.transaction_type === "credit" ? "#10b981" : "#ef4444",
                }}
              >
                {tx.transaction_type === "credit" ? "+" : "−"}
                {formatINR(tx.amount)}
              </div>

              {/* Action */}
              {tx.status === "pending" && tx.transaction_type === "debit" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal(tx);
                  }}
                  className="btn-ghost"
                  style={{ flexShrink: 0 }}
                >
                  <i className="fas fa-tag" /> Categorize
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Transaction Modal */}
      {addingNew && (
        <div
          onClick={(e) => e.target === e.currentTarget && setAddingNew(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 550, padding: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: "1.3rem", marginBottom: "0.3rem" }}>
                  <i className="fas fa-plus-circle" style={{ color: "#3b82f6", marginRight: "0.5rem" }} />
                  Add Transaction
                </h2>
                <p style={{ color: "var(--text3)", fontSize: "0.85rem" }}>
                  Record a manual transaction
                </p>
              </div>
              <button
                onClick={() => setAddingNew(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "var(--text3)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              {/* Amount */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Amount (₹)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g., 5000"
                  value={newTxn.amount}
                  onChange={(e) => setNewTxn({ ...newTxn, amount: e.target.value })}
                  style={{ fontSize: "1.1rem", fontWeight: 600 }}
                  autoFocus
                />
              </div>

              {/* Type */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Transaction Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  {["debit", "credit"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewTxn({ ...newTxn, type })}
                      style={{
                        padding: "0.8rem",
                        borderRadius: "10px",
                        border: `2px solid ${newTxn.type === type ? (type === "debit" ? "#ef4444" : "#10b981") : "rgba(255,255,255,0.10)"}`,
                        background:
                          newTxn.type === type
                            ? type === "debit"
                              ? "rgba(239,68,68,0.12)"
                              : "rgba(16,185,129,0.12)"
                            : "rgba(255,255,255,0.03)",
                        color: newTxn.type === type ? (type === "debit" ? "#ef4444" : "#10b981") : "var(--text2)",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        transition: "all 0.25s",
                        textTransform: "capitalize",
                      }}
                    >
                      {type === "debit" ? "💸 Money Out (Expense)" : "💰 Money In (Income)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Category</label>
                <select
                  className="input-field"
                  value={newTxn.category}
                  onChange={(e) => setNewTxn({ ...newTxn, category: e.target.value })}
                >
                  <option value="">Select category...</option>
                  {newTxn.type === "debit"
                    ? EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_ICONS[c]} {c}
                        </option>
                      ))
                    : INCOME_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                </select>
              </div>

              {/* Actual Price (for leak detection) */}
              {newTxn.type === "debit" && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>
                    Actual Price{" "}
                    <span style={{ color: "var(--text4)", textTransform: "none", fontWeight: 400 }}>
                      (optional - for leak detection)
                    </span>
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="If different from charged amount..."
                    value={newTxn.actual_price}
                    onChange={(e) => setNewTxn({ ...newTxn, actual_price: e.target.value })}
                  />
                  <div className="hint">
                    If you were charged ₹10,000 but actual price was ₹8,000, enter 8000 here to detect the leak
                  </div>
                </div>
              )}

              {/* Note */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>
                  Note{" "}
                  <span style={{ color: "var(--text4)", textTransform: "none", fontWeight: 400 }}>
                    (optional)
                  </span>
                </label>
                <input
                  className="input-field"
                  placeholder="e.g., Groceries from BigBasket"
                  value={newTxn.note}
                  onChange={(e) => setNewTxn({ ...newTxn, note: e.target.value })}
                />
              </div>

              <button onClick={addTransaction} className="btn-primary" style={{ width: "100%" }}>
                <i className="fas fa-check" /> Record Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categorize Modal */}
      {modal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 550, padding: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: "1.3rem", marginBottom: "0.3rem" }}>
                  <i className="fas fa-tag" style={{ color: "#3b82f6", marginRight: "0.5rem" }} />
                  Categorize Transaction
                </h2>
                <p style={{ color: "var(--text3)", fontSize: "0.85rem" }}>Assign category to track this expense</p>
              </div>
              <button
                onClick={() => setModal(null)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "var(--text3)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                }}
              >
                ×
              </button>
            </div>

            {/* Amount Display */}
            <div
              style={{
                padding: "1.2rem 1.5rem",
                borderRadius: 14,
                background:
                  modal.transaction_type === "credit"
                    ? "linear-gradient(135deg, rgba(16,185,129,0.10), rgba(6,182,212,0.08))"
                    : "linear-gradient(135deg, rgba(239,68,68,0.10), rgba(245,158,11,0.08))",
                border: `1px solid ${modal.transaction_type === "credit" ? "rgba(16,185,129,0.20)" : "rgba(239,68,68,0.20)"}`,
                marginBottom: "1.8rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "var(--text2)", fontSize: "0.88rem", fontWeight: 600 }}>
                <i
                  className={modal.transaction_type === "credit" ? "fas fa-arrow-down" : "fas fa-arrow-up"}
                  style={{ marginRight: "0.5rem" }}
                />
                {modal.transaction_type === "credit" ? "Money In" : "Money Out"}
              </span>
              <span
                style={{
                  fontWeight: 900,
                  fontSize: "1.4rem",
                  color: modal.transaction_type === "credit" ? "#10b981" : "#ef4444",
                }}
              >
                {formatINR(modal.amount)}
              </span>
            </div>

            {/* Mode Selector Tabs (only for debit) */}
            {modal.transaction_type === "debit" && (
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 8 }}>
                <button
                  onClick={() => setIsSplitting(false)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: 6,
                    border: "none",
                    background: !isSplitting ? "rgba(59,130,246,0.15)" : "transparent",
                    color: !isSplitting ? "#3b82f6" : "var(--text3)",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Single Category
                </button>
                <button
                  onClick={() => setIsSplitting(true)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: 6,
                    border: "none",
                    background: isSplitting ? "rgba(59,130,246,0.15)" : "transparent",
                    color: isSplitting ? "#3b82f6" : "var(--text3)",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Split Categories
                </button>
              </div>
            )}

            {!isSplitting ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                {/* Type */}
                <div>
                  <label className="label">Transaction Type</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
                    {TX_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setForm((f) => ({ ...f, category_type: t }))}
                        style={{
                          padding: "0.8rem 0.5rem",
                          borderRadius: 10,
                          border: `2px solid ${form.category_type === t ? "#3b82f6" : "rgba(255,255,255,0.08)"}`,
                          background: form.category_type === t ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.02)",
                          color: form.category_type === t ? "#3b82f6" : "var(--text3)",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          fontFamily: "Inter",
                          textTransform: "capitalize",
                          transition: "all 0.2s",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                {form.category_type === "expense" && (
                  <div>
                    <label className="label">Expense Category</label>
                    <select
                      className="input"
                      value={form.expense_category}
                      onChange={(e) => setForm((f) => ({ ...f, expense_category: e.target.value }))}
                    >
                      <option value="">Select category...</option>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_ICONS[c]} {c}
                        </option>
                      ))}
                    </select>
                    {form.expense_category && (
                      <div style={{ fontSize: "0.75rem", color: "#3b82f6", marginTop: 6 }}>
                        ✅ Will update your <strong>{form.expense_category}</strong> budget
                      </div>
                    )}
                  </div>
                )}

                {form.category_type === "income" && (
                  <div>
                    <label className="label">Income Source</label>
                    <select
                      className="input"
                      value={form.income_type}
                      onChange={(e) => setForm((f) => ({ ...f, income_type: e.target.value }))}
                    >
                      <option value="">Select source...</option>
                      {INCOME_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="label">
                    Note <span style={{ color: "var(--text4)", textTransform: "none", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    className="input"
                    placeholder="e.g., Zomato order, Electricity bill..."
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>

                <button onClick={save} className="btn-primary" style={{ width: "100%" }}>
                  <i className="fas fa-check" /> Save & Categorize
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text2)" }}>Splits List</span>
                  <button
                    onClick={addSplitRow}
                    className="btn-secondary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", width: "auto" }}
                  >
                    <i className="fas fa-plus" /> Add Row
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", maxHeight: "250px", overflowY: "auto", paddingRight: "4px" }}>
                  {splits.map((s, index) => (
                    <div key={index} style={{ display: "flex", gap: "0.6rem", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "0.8rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text3)" }}>#{index + 1}</span>
                      
                      <div style={{ flex: 1.5, minWidth: 0 }}>
                        <select
                          className="input"
                          style={{ padding: "0.5rem", fontSize: "0.8rem", marginBottom: 0 }}
                          value={s.expense_category}
                          onChange={(e) => updateSplit(index, "expense_category", e.target.value)}
                        >
                          <option value="">Category...</option>
                          {EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {CATEGORY_ICONS[c]} {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ flex: 1.5, minWidth: 0 }}>
                        <input
                          type="text"
                          className="input"
                          placeholder="Note (optional)..."
                          style={{ padding: "0.5rem", fontSize: "0.8rem", marginBottom: 0 }}
                          value={s.note}
                          onChange={(e) => updateSplit(index, "note", e.target.value)}
                        />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                          type="number"
                          className="input"
                          placeholder="Amount..."
                          style={{ padding: "0.5rem", fontSize: "0.8rem", marginBottom: 0, textAlign: "right" }}
                          value={s.amount}
                          onChange={(e) => updateSplit(index, "amount", e.target.value)}
                        />
                      </div>

                      {splits.length > 2 && (
                        <button
                          onClick={() => removeSplitRow(index)}
                          style={{
                            background: "rgba(239,68,68,0.1)",
                            border: "none",
                            color: "#ef4444",
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.8rem"
                          }}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Split summary and validation indicator */}
                <div style={{
                  padding: "0.8rem 1rem",
                  borderRadius: 8,
                  background: remainingAmount === 0 ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                  border: `1px solid ${remainingAmount === 0 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}`,
                  fontSize: "0.85rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ color: "var(--text3)" }}>Total Split: <strong style={{ color: "var(--text1)" }}>{formatINR(splitTotal)}</strong></div>
                    <div style={{ fontSize: "0.75rem", color: remainingAmount === 0 ? "#10b981" : "#f59e0b", marginTop: 2 }}>
                      {remainingAmount === 0 ? "✅ Perfect match!" : remainingAmount > 0 ? `⚠️ ₹${formatINR(remainingAmount).replace("₹", "")} left to allocate` : `⚠️ Overallocated by ₹${formatINR(Math.abs(remainingAmount)).replace("₹", "")}`}
                    </div>
                  </div>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: remainingAmount === 0 ? "#10b981" : "#f59e0b" }}>
                    {remainingAmount === 0 ? <i className="fas fa-check-circle" /> : <i className="fas fa-exclamation-circle" />}
                  </span>
                </div>

                <button
                  onClick={saveSplits}
                  className="btn-primary"
                  disabled={remainingAmount !== 0}
                  style={{ width: "100%", marginTop: 4, opacity: remainingAmount !== 0 ? 0.6 : 1, cursor: remainingAmount !== 0 ? "not-allowed" : "pointer" }}
                >
                  <i className="fas fa-check" /> Save Splits
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
