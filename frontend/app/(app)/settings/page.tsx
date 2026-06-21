"use client";
import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/lib/api";
import { PageHeader } from "@/components/ui";
import toast from "react-hot-toast";

export default function Settings() {
  const [s, setS]       = useState<any>({ name:"",email:"",bank_enabled:true });
  const [loading, setL] = useState(true);
  const [saving, setSav]= useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { 
    // Get user info from localStorage
    const userStr = localStorage.getItem("fab_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setS((prev: any) => ({ ...prev, name: user.name, email: user.email }));
    }
    // Get settings
    getSettings().then(r => setS((prev: any) => ({ ...prev, bank_enabled: r.data.bank_enabled }))).finally(() => setL(false)); 
  }, []);

  const save = async () => {
    setSav(true);
    try {
      await updateSettings({ bank_enabled: s.bank_enabled });
      toast.success("Settings saved");
    } catch { toast.error("Failed to save"); }
    finally { setSav(false); }
  };

  const resetAllData = async () => {
    const confirmed = window.confirm(
      "⚠️ DANGER: This will delete ALL your data including:\n\n" +
      "• All transactions\n" +
      "• Budget settings\n" +
      "• Alerts\n" +
      "• Bank accounts\n" +
      "• User settings\n\n" +
      "This action CANNOT be undone!\n\n" +
      "Are you absolutely sure you want to continue?"
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      "⚠️ FINAL WARNING!\n\n" +
      "You are about to delete EVERYTHING.\n" +
      "Type 'RESET' in the next prompt to confirm."
    );

    if (!doubleConfirm) return;

    const userInput = window.prompt("Type 'RESET' to confirm (case-sensitive):");

    if (userInput !== "RESET") {
      toast.error("Reset cancelled - confirmation text didn't match");
      return;
    }

    setResetting(true);
    try {
      const response = await fetch("http://localhost:8000/api/settings/reset-all-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("🎉 All data has been reset! Redirecting to login...");
        
        // Clear local storage
        localStorage.removeItem("fab_token");
        localStorage.removeItem("fab_user");
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        toast.error(result.message || "Failed to reset data");
      }
    } catch (error) {
      toast.error("Failed to reset data. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:"4rem" }}><div className="spinner" /></div>;

  return (
    <div className="page-enter" style={{ maxWidth:640 }}>
      <PageHeader icon="fas fa-cog" title="Settings" sub="Manage your profile and preferences" />

      <div style={{ display:"flex",flexDirection:"column",gap:"1rem" }}>
        
        {/* Personal Details */}
        <div className="card" style={{ padding:"1.5rem 1.75rem" }}>
          <div className="section-title"><i className="fas fa-user" />Personal Details</div>
          <p style={{ color:"var(--text3)",fontSize:"0.85rem",lineHeight:1.6,marginBottom:"1.2rem" }}>
            Your account information
          </p>
          <div style={{ display:"flex",flexDirection:"column",gap:"1rem" }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Full Name</label>
              <input 
                className="input-field" 
                type="text" 
                value={s.name}
                disabled
                style={{ background:"var(--surface2)",cursor:"not-allowed" }}
              />
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Email Address</label>
              <input 
                className="input-field" 
                type="email" 
                value={s.email}
                disabled
                style={{ background:"var(--surface2)",cursor:"not-allowed" }}
              />
            </div>
            <div style={{ fontSize:"0.75rem",color:"var(--text4)",marginTop:"-0.5rem" }}>
              <i className="fas fa-info-circle" /> Personal details cannot be changed after registration
            </div>
          </div>
        </div>

        {/* Bank Account Access */}
        <div className="card" style={{ padding:"1.5rem 1.75rem" }}>
          <div className="section-title"><i className="fas fa-university" />Bank Account Access</div>
          <p style={{ color:"var(--text3)",fontSize:"0.85rem",lineHeight:1.6,marginBottom:"1.2rem" }}>
            Enable or disable automatic transaction tracking
          </p>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",padding:"1rem 1.2rem",background:"var(--surface2)",borderRadius:"10px",border:"1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize:"0.9rem",fontWeight:600,color:"var(--text1)",marginBottom:"0.25rem" }}>Enable Bank Access</div>
              <div style={{ fontSize:"0.75rem",color:"var(--text3)" }}>
                {s.bank_enabled ? "Bank features are active" : "Bank features are disabled"}
              </div>
            </div>
            <button
              onClick={() => setS((x: any) => ({ ...x, bank_enabled: !x.bank_enabled }))}
              style={{
                position:"relative",width:52,height:28,borderRadius:99,
                background:s.bank_enabled ? "var(--accent)" : "var(--border2)",
                border:"none",cursor:"pointer",transition:"background 0.2s",
              }}
            >
              <div style={{
                position:"absolute",top:3,left:s.bank_enabled?26:3,
                width:22,height:22,borderRadius:"50%",
                background:"#fff",transition:"left 0.2s",
                boxShadow:"var(--shadow-sm)"
              }} />
            </button>
          </div>
          {!s.bank_enabled && (
            <div style={{
              marginTop:"1rem",padding:"0.75rem 1rem",
              background:"#fffbeb",border:"1px solid #fde68a",
              borderRadius:"8px",fontSize:"0.82rem",color:"var(--amber)",
              display:"flex",alignItems:"center",gap:"0.6rem"
            }}>
              <i className="fas fa-exclamation-triangle" />
              <span>Bank features disabled. Transactions won&apos;t be tracked automatically.</span>
            </div>
          )}
        </div>

        <button onClick={save} disabled={saving} className="btn btn-primary btn-full">
          {saving
            ? <>Saving...</>
            : <><i className="fas fa-save" /> Save Settings</>}
        </button>

        {/* DANGER ZONE */}
        <div className="card" style={{
          padding: "1.5rem 1.75rem",
          background: "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(220,38,38,0.06) 100%)",
          border: "1px solid rgba(239,68,68,0.20)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <i className="fas fa-exclamation-triangle" style={{ color: "#ef4444", fontSize: "1.2rem" }} />
            <div className="section-title" style={{ marginBottom: 0, color: "#ef4444" }}>
              Danger Zone
            </div>
          </div>
          
          <p style={{ color: "var(--text3)", fontSize: "0.85rem", lineHeight: 1.6, marginBottom: "1.2rem" }}>
            Reset all your data and start fresh. This will delete <strong>everything</strong>: transactions, budgets, alerts, settings, and bank accounts.
            This action cannot be undone.
          </p>

          <button
            onClick={resetAllData}
            disabled={resetting}
            style={{
              width: "100%",
              padding: "0.8rem 1.5rem",
              borderRadius: "10px",
              border: "2px solid #ef4444",
              background: resetting ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.12)",
              color: "#ef4444",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: resetting ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              if (!resetting) {
                e.currentTarget.style.background = "rgba(239,68,68,0.20)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!resetting) {
                e.currentTarget.style.background = "rgba(239,68,68,0.12)";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            {resetting ? (
              <>
                <div className="spinner-sm" style={{ borderTopColor: "#ef4444" }} />
                Resetting...
              </>
            ) : (
              <>
                <i className="fas fa-trash-alt" />
                Reset All Data
              </>
            )}
          </button>

          <div style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.15)",
            borderRadius: "8px",
            fontSize: "0.75rem",
            color: "#fca5a5",
            lineHeight: 1.6,
          }}>
            <strong>⚠️ Warning:</strong> This will require you to register again and complete the budget setup wizard from scratch.
          </div>
        </div>
      </div>
    </div>
  );
}
