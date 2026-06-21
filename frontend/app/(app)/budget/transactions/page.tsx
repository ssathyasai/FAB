"use client";
import { useEffect, useState } from "react";
import { getTransactions, categorizeTransaction } from "@/lib/api";
import { api } from "@/lib/api";
import { formatINR, formatDate, formatTime, EXPENSE_CATEGORIES, CATEGORY_ICONS } from "@/lib/utils";
import { PageHeader, Loading, Empty } from "@/components/ui";
import toast from "react-hot-toast";

const TX_TYPES = ["expense", "income", "savings", "transfer"];
const INCOME_TYPES = ["Salary", "Business", "Freelance", "Investment", "Gift", "Other"];

export default function BudgetTransactions() {
  const [txns, setTxns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setL] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [filter, setFilter] = useState({ status: "", month: "", type: "" });
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

  const load = async () => {
    const p: any = {};
    if (filter.status) p.status = filter.status;
    if (filter.month) p.month = filter.month;
    try {
      const r = await getTransactions(p);
      setTxns(r.data.transactions);
      setTotal(r.data.total);
    } catch {
    } finally {
      setL(false);
    }
  };

  useEffect(() => {
    setL(true);
    load();
  }, [filter]);

  const openModal = (tx: any) => {
    setModal(tx);
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
      load();
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
      load();
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

  if (loading) return <Loading text="Loading transactions..." />;

  return (
    <div className="page-enter">
      <PageHeader
        icon="fas fa-exchange-alt"
        title="Transactions"
        color="#3b82f6"
        sub={`${total} total · ${txns.filter((t) => t.status === "pending").length} pending`}
      >
        <button onClick={() => setAddingNew(true)} className="btn-primary" style={{ width: "auto", padding: "0.7rem 1.3rem" }}>
          <i className="fas fa-plus" /> Add Transaction
        </button>
      </PageHeader>

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
                <p style={{ color: "var(--text3)", fontSize: "0.85rem" }}>Assign a category to track this expense</p>
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
          </div>
        </div>
      )}
    </div>
  );
}
