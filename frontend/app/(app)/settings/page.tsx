"use client";
import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/lib/api";
import { requestProductTour, TOUR_STORAGE_KEY } from "@/lib/productTour";
import { PageHeader } from "@/components/ui";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export default function Settings() {
  const router = useRouter();
  const [s, setS] = useState<any>({ 
    name: "", 
    email: "", 
    phone_number: "",
    income_baseline: 0,
    income_type: "fixed",
    theme: "light",
    bank_enabled: true 
  });
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  const [loading, setL] = useState(true);
  const [saving, setSav] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { 
    // Get user info from localStorage
    const userStr = localStorage.getItem("fab_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setS((prev: any) => ({ ...prev, name: user.name, email: user.email }));
    }
    // Get settings
    getSettings().then(r => {
      setS((prev: any) => ({ 
        ...prev, 
        bank_enabled: r.data.bank_enabled,
        phone_number: r.data.phone_number || "",
        income_baseline: r.data.income_baseline || 0,
        income_type: r.data.income_type || "fixed",
        theme: r.data.theme || "light"
      }));
      // Apply theme
      document.documentElement.setAttribute("data-theme", r.data.theme || "light");
    }).finally(() => setL(false)); 
  }, []);

  const save = async () => {
    setSav(true);
    try {
      await updateSettings({ 
        bank_enabled: s.bank_enabled,
        phone_number: s.phone_number || null,
        income_baseline: s.income_baseline,
        income_type: s.income_type,
        theme: s.theme
      });
      // Apply theme immediately
      document.documentElement.setAttribute("data-theme", s.theme);
      toast.success("Settings saved");
    } catch { toast.error("Failed to save"); }
    finally { setSav(false); }
  };

  const changePassword = async () => {
    if (!passwords.current || !passwords.new) {
      toast.error("Please fill all password fields");
      return;
    }
    if (passwords.new.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error("New passwords don't match");
      return;
    }

    setChangingPassword(true);
    try {
      const token = localStorage.getItem("fab_token");
      await axios.post(
        `${API_URL}/api/settings/change-password`,
        {
          current_password: passwords.current,
          new_password: passwords.new
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Password changed successfully!");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
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
      const token = localStorage.getItem("fab_token");
      const response = await axios.post(
        `${API_URL}/api/settings/reset-all-data`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const result = response.data;
      
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
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Phone Number</label>
              <input 
                className="input-field" 
                type="tel" 
                value={s.phone_number}
                onChange={e => setS((x: any) => ({ ...x, phone_number: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="card" style={{ padding:"1.5rem 1.75rem" }}>
          <div className="section-title"><i className="fas fa-palette" />Appearance</div>
          <p style={{ color:"var(--text3)",fontSize:"0.85rem",lineHeight:1.6,marginBottom:"1.2rem" }}>
            Choose your preferred theme
          </p>
          <div style={{ display:"flex",gap:"0.75rem" }}>
            {["light", "dark"].map(theme => (
              <button
                key={theme}
                type="button"
                onClick={() => {
                  setS((x: any) => ({ ...x, theme }));
                  document.documentElement.setAttribute("data-theme", theme);
                }}
                style={{
                  flex:1,
                  padding:"1rem",
                  borderRadius:"10px",
                  border:`2px solid ${s.theme === theme ? "var(--accent)" : "var(--border)"}`,
                  background: s.theme === theme ? "var(--accent-dim)" : "var(--surface2)",
                  color: s.theme === theme ? "var(--accent)" : "var(--text2)",
                  fontSize:"0.9rem",
                  fontWeight:600,
                  cursor:"pointer",
                  textTransform:"capitalize",
                  transition:"all 0.2s",
                  display:"flex",
                  flexDirection:"column",
                  alignItems:"center",
                  gap:"0.5rem"
                }}
              >
                <i className={theme === "light" ? "fas fa-sun" : "fas fa-moon"} style={{ fontSize:"1.5rem" }} />
                {theme}
              </button>
            ))}
          </div>
        </div>

        {/* Product Tour */}
        <div className="card" style={{ padding:"1.5rem 1.75rem" }}>
          <div className="section-title"><i className="fas fa-route" />Product Tour</div>
          <p style={{ color:"var(--text3)",fontSize:"0.85rem",lineHeight:1.6,marginBottom:"1.2rem" }}>
            Replay the guided walkthrough of AI FAB features
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(TOUR_STORAGE_KEY);
              updateSettings({ tour_complete: false }).catch(() => {});
              requestProductTour();
              toast.success("Starting product tour…");
            }}
            className="btn btn-secondary"
            style={{ width:"100%" }}
          >
            <i className="fas fa-play-circle" /> Replay Product Tour
          </button>
        </div>

        {/* Budget Setup */}
        <div className="card" style={{ padding:"1.5rem 1.75rem" }}>
          <div className="section-title"><i className="fas fa-wallet" />Budget Setup</div>
          <p style={{ color:"var(--text3)",fontSize:"0.85rem",lineHeight:1.6,marginBottom:"1.2rem" }}>
            Configure your income and budget preferences
          </p>
          <div style={{ display:"flex",flexDirection:"column",gap:"1rem" }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Monthly Income</label>
              <div style={{ position:"relative" }}>
                <span style={{
                  position:"absolute",
                  left:"1rem",
                  top:"50%",
                  transform:"translateY(-50%)",
                  color:"var(--text3)",
                  fontWeight:600
                }}>₹</span>
                <input 
                  className="input-field" 
                  type="number" 
                  value={s.income_baseline}
                  onChange={e => setS((x: any) => ({ ...x, income_baseline: parseFloat(e.target.value) || 0 }))}
                  placeholder="50000"
                  style={{ paddingLeft:"2.5rem" }}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Income Type</label>
              <div style={{ display:"flex",gap:"0.5rem" }}>
                {["fixed", "variable"].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setS((x: any) => ({ ...x, income_type: type }))}
                    style={{
                      flex:1,
                      padding:"0.7rem",
                      borderRadius:"8px",
                      border:`2px solid ${s.income_type === type ? "var(--accent)" : "var(--border)"}`,
                      background: s.income_type === type ? "var(--accent-bg)" : "var(--surface2)",
                      color: s.income_type === type ? "var(--accent)" : "var(--text2)",
                      fontSize:"0.85rem",
                      fontWeight:600,
                      cursor:"pointer",
                      textTransform:"capitalize",
                      transition:"all 0.2s"
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={() => router.push("/budget/setup")}
              className="btn btn-secondary"
              style={{ width:"100%",marginTop:"0.5rem" }}
            >
              <i className="fas fa-magic" /> Run Budget Setup Wizard
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="card" style={{ padding:"1.5rem 1.75rem" }}>
          <div className="section-title"><i className="fas fa-key" />Change Password</div>
          <p style={{ color:"var(--text3)",fontSize:"0.85rem",lineHeight:1.6,marginBottom:"1.2rem" }}>
            Update your account password
          </p>
          <div style={{ display:"flex",flexDirection:"column",gap:"1rem" }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Current Password</label>
              <input 
                className="input-field" 
                type="password" 
                value={passwords.current}
                onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>New Password</label>
              <input 
                className="input-field" 
                type="password" 
                value={passwords.new}
                onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Confirm New Password</label>
              <input 
                className="input-field" 
                type="password" 
                value={passwords.confirm}
                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Repeat new password"
              />
            </div>
            <button 
              onClick={changePassword}
              disabled={changingPassword}
              className="btn btn-secondary"
              style={{ width:"100%" }}
            >
              {changingPassword ? "Changing..." : <><i className="fas fa-check" /> Change Password</>}
            </button>
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
