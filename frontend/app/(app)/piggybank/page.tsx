"use client";
import { useState, useEffect } from "react";
import { getPiggyBanks, createPiggyBank, deletePiggyBank, addPiggyBankTransaction, getPiggyBankTransactions } from "@/lib/api";
import { PageHeader } from "@/components/ui";

const COLORS = ["#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#10b981", "#06b6d4", "#f59e0b"];
const ICONS = ["fas fa-piggy-bank", "fas fa-coins", "fas fa-gift", "fas fa-home", "fas fa-car", "fas fa-plane", "fas fa-graduation-cap"];

export default function PiggyBankPage() {
  const [banks, setBanks] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newBank, setNewBank] = useState({ name: "", goal_amount: "", color: COLORS[0], icon: ICONS[0] });
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionNote, setTransactionNote] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const r = await getPiggyBanks();
      setBanks(r.data.piggy_banks);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newBank.name) return;
    setLoading(true);
    try {
      await createPiggyBank({
        name: newBank.name,
        goal_amount: newBank.goal_amount ? parseFloat(newBank.goal_amount) : null,
        color: newBank.color,
        icon: newBank.icon,
      });
      setNewBank({ name: "", goal_amount: "", color: COLORS[0], icon: ICONS[0] });
      setShowCreate(false);
      load();
    } catch {} finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this piggy bank?")) return;
    try {
      await deletePiggyBank(id);
      load();
    } catch {}
  };

  const addTransaction = async () => {
    if (!selectedBank || !transactionAmount) return;
    setLoading(true);
    try {
      await addPiggyBankTransaction(selectedBank.id, {
        amount: parseFloat(transactionAmount),
        note: transactionNote,
      });
      setTransactionAmount("");
      setTransactionNote("");
      load();
      loadTransactions(selectedBank.id);
    } catch {} finally { setLoading(false); }
  };

  const loadTransactions = async (id: string) => {
    try {
      const r = await getPiggyBankTransactions(id);
      setTransactions(r.data.transactions);
    } catch {}
  };

  const selectBank = (bank: any) => {
    setSelectedBank(bank);
    loadTransactions(bank.id);
  };

  const totalSaved = banks.reduce((acc, b) => acc + b.current_amount, 0);

  return (
    <div className="page-enter">
      <PageHeader icon="fas fa-piggy-bank" title="Virtual Piggy Bank" color="#f59e0b"
        sub="Save money for your goals in virtual piggy banks" />

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ padding: "1.2rem", textAlign: "center", borderTop: "2px solid #f59e0b" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f59e0b" }}>₹{totalSaved.toFixed(0)}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: 4 }}>TOTAL SAVED</div>
        </div>
        <div className="card" style={{ padding: "1.2rem", textAlign: "center", borderTop: "2px solid #3b82f6" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#3b82f6" }}>{banks.length}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: 4 }}>PIGGY BANKS</div>
        </div>
        <div className="card" style={{ padding: "1.2rem", textAlign: "center", borderTop: "2px solid #10b981" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#10b981" }}>
            {banks.filter(b => b.goal_amount && b.current_amount >= b.goal_amount).length}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: 4 }}>GOALS ACHIEVED</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h3 style={{ fontWeight: 700 }}>My Piggy Banks</h3>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <i className="fas fa-plus" style={{ marginRight: 6 }} />
          Create New
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h4 style={{ fontWeight: 700, marginBottom: "1rem" }}>Create Piggy Bank</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="label">Name</label>
              <input className="input-field" placeholder="e.g., Vacation Fund" value={newBank.name}
                onChange={e => setNewBank({ ...newBank, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Goal Amount (₹) - Optional</label>
              <input className="input-field" type="number" placeholder="e.g., 50000" value={newBank.goal_amount}
                onChange={e => setNewBank({ ...newBank, goal_amount: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label className="label">Color</label>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: 6 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setNewBank({ ...newBank, color: c })} style={{
                  width: 40, height: 40, borderRadius: "50%", background: c,
                  border: newBank.color === c ? "3px solid white" : "2px solid rgba(255,255,255,0.1)",
                  cursor: "pointer", boxShadow: newBank.color === c ? `0 0 12px ${c}` : "none",
                }} />
              ))}
            </div>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label className="label">Icon</label>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: 6 }}>
              {ICONS.map(i => (
                <button key={i} onClick={() => setNewBank({ ...newBank, icon: i })} style={{
                  width: 40, height: 40, borderRadius: 8, border: newBank.icon === i ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,0.1)",
                  background: newBank.icon === i ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)",
                  color: newBank.icon === i ? "var(--accent)" : "rgba(255,255,255,0.4)",
                  cursor: "pointer", fontSize: "1.1rem",
                }}>
                  <i className={i} />
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button className="btn-primary" onClick={create} disabled={loading || !newBank.name}>
              {loading ? "Creating..." : "Create"}
            </button>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selectedBank ? "1fr 1.5fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {banks.map(bank => {
            const progress = bank.goal_amount ? (bank.current_amount / bank.goal_amount * 100) : 0;
            const isActive = selectedBank?.id === bank.id;
            return (
              <div key={bank.id} className="card" onClick={() => selectBank(bank)} style={{
                padding: "1.2rem", cursor: "pointer",
                border: isActive ? `2px solid ${bank.color}` : "1px solid rgba(255,255,255,0.06)",
                background: isActive ? `${bank.color}10` : "rgba(255,255,255,0.02)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: bank.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "white" }}>
                      <i className={bank.icon} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{bank.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>
                        {bank.goal_amount ? `Goal: ₹${bank.goal_amount.toFixed(0)}` : "No goal set"}
                      </div>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); remove(bank.id); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.9rem" }}>
                    <i className="fas fa-trash" />
                  </button>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: bank.color, marginBottom: 8 }}>
                  ₹{bank.current_amount.toFixed(0)}
                </div>
                {bank.goal_amount && (
                  <>
                    <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(progress, 100)}%`, height: "100%", background: bank.color, transition: "width 0.3s" }} />
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: 4, textAlign: "right" }}>
                      {progress.toFixed(0)}% Complete
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {selectedBank && (
          <div className="card" style={{ padding: "1.5rem" }}>
            <h4 style={{ fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: selectedBank.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", color: "white" }}>
                <i className={selectedBank.icon} />
              </div>
              {selectedBank.name}
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <label className="label">Add Money (₹)</label>
                <input className="input-field" type="number" placeholder="Amount" value={transactionAmount}
                  onChange={e => setTransactionAmount(e.target.value)} />
              </div>
              <div>
                <label className="label">Note (Optional)</label>
                <input className="input-field" placeholder="e.g., Monthly savings" value={transactionNote}
                  onChange={e => setTransactionNote(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <button className="btn-primary" onClick={addTransaction} disabled={loading || !transactionAmount}>
                {loading ? "Processing..." : "Add Money"}
              </button>
              <button className="btn-secondary" onClick={() => {
                setTransactionAmount((-selectedBank.current_amount).toString());
              }}>
                Withdraw All
              </button>
            </div>

            <h5 style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.8rem", color: "var(--text3)" }}>TRANSACTION HISTORY</h5>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 400, overflowY: "auto" }}>
              {transactions.map(t => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.8rem", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: t.amount > 0 ? "#10b981" : "#ef4444" }}>
                      {t.amount > 0 ? "+" : ""}₹{t.amount.toFixed(0)}
                    </div>
                    {t.note && <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>{t.note}</div>}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text3)" }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--text3)", padding: "2rem", fontSize: "0.85rem" }}>
                  No transactions yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {banks.length === 0 && !showCreate && (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text3)" }}>
          <i className="fas fa-piggy-bank" style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }} />
          <p>No piggy banks yet. Create your first one!</p>
        </div>
      )}
    </div>
  );
}
