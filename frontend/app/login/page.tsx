"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login"|"signup"|"verify"|"login-verify"|"forgot"|"forgot-verify"|"forgot-reset">("login");
  const [form, setForm] = useState({ name:"", email:"", password:"", confirm:"", otp:"", resetToken:"", newPassword:"", confirmNew:"" });
  const [loading, setL] = useState(false);
  const [showP, setShowP] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const f = (k: string, v: string) => setForm(x => ({ ...x, [k]: v }));

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Enter your name");
    if (form.password !== form.confirm) return toast.error("Passwords don't match");
    if (form.password.length < 6) return toast.error("Password min 6 characters");
    if (!acceptedTerms) return toast.error("Please accept the Terms and Conditions");
    
    setL(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, {
        name: form.name,
        email: form.email,
        password: form.password
      });
      
      if (res.data.status === "otp_sent") {
        toast.success("Verification code sent to your email!");
        setMode("verify");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally { setL(false); }
  };

  const submitVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.otp.trim() || form.otp.length !== 6) {
      return toast.error("Enter the 6-digit code");
    }
    
    setL(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/verify-otp`, {
        email: form.email,
        otp: form.otp
      });
      
      localStorage.setItem("fab_token", res.data.token);
      localStorage.setItem("fab_user", JSON.stringify(res.data.user));
      toast.success("Account created successfully!");
      router.push("/onboarding");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Invalid verification code");
    } finally { setL(false); }
  };

  const resendOTP = async () => {
    setL(true);
    try {
      await axios.post(`${API_URL}/api/auth/resend-otp`, { email: form.email });
      toast.success("New code sent to your email!");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to resend code");
    } finally { setL(false); }
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) return toast.error("Enter your email");
    if (!form.password) return toast.error("Enter your password");
    
    setL(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { 
        email: form.email, 
        password: form.password
      });
      
      if (res.data.status === "otp_sent") {
        toast.success("✅ Password verified! OTP sent to your email (check spam folder if not received)", {
          duration: 5000
        });
        setMode("login-verify");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Invalid email or password");
    } finally { setL(false); }
  };

  const submitLoginVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.otp.trim() || form.otp.length !== 6) {
      return toast.error("Enter the 6-digit code");
    }
    
    setL(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login-verify`, {
        email: form.email,
        otp: form.otp
      });
      
      localStorage.setItem("fab_token", res.data.token);
      localStorage.setItem("fab_user", JSON.stringify(res.data.user));
      toast.success(`Welcome back, ${res.data.user.name}!`);
      router.push("/budget/overview");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Invalid verification code");
    } finally { setL(false); }
  };

  const resendLoginOTP = async () => {
    setL(true);
    try {
      await axios.post(`${API_URL}/api/auth/login-resend`, { email: form.email });
      toast.success("✅ New code sent! Check your email (and spam folder)", {
        duration: 5000
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to resend code");
    } finally { setL(false); }
  };

  const submitForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) return toast.error("Enter your email");
    
    setL(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email: form.email });
      toast.success("✅ Password reset code sent to your email (check spam folder)", {
        duration: 5000
      });
      setMode("forgot-verify");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to send reset code");
    } finally { setL(false); }
  };

  const submitForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.otp.trim() || form.otp.length !== 6) {
      return toast.error("Enter the 6-digit code");
    }
    
    setL(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/reset-password-verify`, {
        email: form.email,
        otp: form.otp
      });
      
      if (res.data.status === "verified") {
        f("resetToken", res.data.reset_token);
        toast.success("Code verified! Now set your new password");
        setMode("forgot-reset");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Invalid verification code");
    } finally { setL(false); }
  };

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.newPassword) return toast.error("Enter new password");
    if (form.newPassword !== form.confirmNew) return toast.error("Passwords don't match");
    if (form.newPassword.length < 6) return toast.error("Password min 6 characters");
    
    setL(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password-complete`, {
        email: form.email,
        reset_token: form.resetToken,
        new_password: form.newPassword
      });
      
      toast.success("✅ Password reset successfully! You can now login");
      // Reset form and go to login
      setForm({ name:"", email:"", password:"", confirm:"", otp:"", resetToken:"", newPassword:"", confirmNew:"" });
      setMode("login");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to reset password");
    } finally { setL(false); }
  };

  const resendForgotOTP = async () => {
    setL(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password-resend`, { email: form.email });
      toast.success("✅ New code sent! Check your email (and spam folder)", {
        duration: 5000
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to resend code");
    } finally { setL(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <i className="fas fa-coins" />
        </div>
        <h1 className="login-title">FIN TRACKER</h1>
        <p className="login-subtitle">AI-Powered Financial Advisor & Budget Planner</p>

        {mode !== "verify" && mode !== "login-verify" && mode !== "forgot-verify" && mode !== "forgot-reset" && (
          <div className="login-tabs">
            <button type="button" className={`login-tab-btn ${mode==="login"?"on":"off"}`} onClick={() => setMode("login")}>Sign In</button>
            <button type="button" className={`login-tab-btn ${mode==="signup"?"on":"off"}`} onClick={() => setMode("signup")}>Create Account</button>
          </div>
        )}

        {mode === "verify" || mode === "login-verify" ? (
          <form onSubmit={mode === "verify" ? submitVerify : submitLoginVerify}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <i className="fas fa-envelope-open-text" style={{ fontSize: "3rem", color: "#6366f1", marginBottom: "1rem" }} />
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>Check your email</h2>
              <p style={{ color: "#71717a", fontSize: "0.875rem" }}>
                We sent a 6-digit code to<br />
                <strong>{form.email}</strong>
              </p>
            </div>

            <div className="form-group">
              <label>Verification Code</label>
              <input 
                className="input" 
                type="text" 
                placeholder="000000" 
                value={form.otp} 
                onChange={e => f("otp", e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem" }}
                autoComplete="off"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Verifying..." : mode === "verify" ? 
                <><i className="fas fa-check-circle" /> Verify & Create Account</> :
                <><i className="fas fa-sign-in-alt" /> Verify & Sign In</>
              }
            </button>

            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button 
                type="button" 
                onClick={mode === "verify" ? resendOTP : resendLoginOTP} 
                disabled={loading}
                style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "0.875rem", textDecoration: "underline" }}
              >
                Resend code
              </button>
              <span style={{ margin: "0 0.5rem", color: "#d4d4d8" }}>|</span>
              <button 
                type="button" 
                onClick={() => setMode(mode === "verify" ? "signup" : "login")}
                style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: "0.875rem" }}
              >
                Change email
              </button>
            </div>
          </form>
        ) : mode === "login" ? (
          <form onSubmit={submitLogin}>
            <div className="form-group">
              <label>Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => f("email",e.target.value)} autoComplete="email" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="pass-wrap">
                <input className="input" type={showP?"text":"password"} placeholder="Your password" value={form.password} onChange={e => f("password",e.target.value)} style={{ paddingRight:"2.5rem" }} autoComplete="current-password" />
                <button type="button" className="pass-toggle" onClick={() => setShowP(s => !s)}>
                  <i className={showP?"fas fa-eye-slash":"fas fa-eye"} />
                </button>
              </div>
            </div>
            
            <div style={{ textAlign: "right", marginBottom: "1rem" }}>
              <button 
                type="button" 
                onClick={() => setMode("forgot")}
                style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "0.875rem", textDecoration: "underline" }}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Verifying..." : <><i className="fas fa-sign-in-alt" /> Continue</>}
            </button>
          </form>
        ) : mode === "forgot" ? (
          <form onSubmit={submitForgotPassword}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <i className="fas fa-key" style={{ fontSize: "3rem", color: "#6366f1", marginBottom: "1rem" }} />
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>Reset Password</h2>
              <p style={{ color: "#71717a", fontSize: "0.875rem" }}>
                Enter your email address and we'll send you a verification code
              </p>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => f("email",e.target.value)} autoComplete="email" />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Sending code..." : <><i className="fas fa-paper-plane" /> Send Reset Code</>}
            </button>

            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button 
                type="button" 
                onClick={() => setMode("login")}
                style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: "0.875rem" }}
              >
                <i className="fas fa-arrow-left" /> Back to Sign In
              </button>
            </div>
          </form>
        ) : mode === "forgot-verify" ? (
          <form onSubmit={submitForgotVerify}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <i className="fas fa-envelope-open-text" style={{ fontSize: "3rem", color: "#6366f1", marginBottom: "1rem" }} />
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>Check your email</h2>
              <p style={{ color: "#71717a", fontSize: "0.875rem" }}>
                We sent a 6-digit code to<br />
                <strong>{form.email}</strong>
              </p>
            </div>

            <div className="form-group">
              <label>Verification Code</label>
              <input 
                className="input" 
                type="text" 
                placeholder="000000" 
                value={form.otp} 
                onChange={e => f("otp", e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem" }}
                autoComplete="off"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Verifying..." : <><i className="fas fa-check-circle" /> Verify Code</>}
            </button>

            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button 
                type="button" 
                onClick={resendForgotOTP} 
                disabled={loading}
                style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "0.875rem", textDecoration: "underline" }}
              >
                Resend code
              </button>
              <span style={{ margin: "0 0.5rem", color: "#d4d4d8" }}>|</span>
              <button 
                type="button" 
                onClick={() => setMode("forgot")}
                style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: "0.875rem" }}
              >
                Change email
              </button>
            </div>
          </form>
        ) : mode === "forgot-reset" ? (
          <form onSubmit={submitResetPassword}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <i className="fas fa-lock" style={{ fontSize: "3rem", color: "#6366f1", marginBottom: "1rem" }} />
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>Set New Password</h2>
              <p style={{ color: "#71717a", fontSize: "0.875rem" }}>
                Enter your new password below
              </p>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div className="pass-wrap">
                <input 
                  className="input" 
                  type={showP?"text":"password"} 
                  placeholder="Min 6 characters" 
                  value={form.newPassword} 
                  onChange={e => f("newPassword",e.target.value)} 
                  style={{ paddingRight:"2.5rem" }} 
                  autoComplete="new-password"
                />
                <button type="button" className="pass-toggle" onClick={() => setShowP(s => !s)}>
                  <i className={showP?"fas fa-eye-slash":"fas fa-eye"} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input 
                className="input" 
                type={showP?"text":"password"} 
                placeholder="Repeat password" 
                value={form.confirmNew} 
                onChange={e => f("confirmNew",e.target.value)} 
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Resetting..." : <><i className="fas fa-check-circle" /> Reset Password</>}
            </button>
          </form>
        ) : (
          <form onSubmit={submitSignup}>
            <div className="form-group">
              <label>Full Name</label>
              <input className="input" placeholder="Rahul Sharma" value={form.name} onChange={e => f("name",e.target.value)} autoComplete="name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => f("email",e.target.value)} autoComplete="email" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="pass-wrap">
                <input className="input" type={showP?"text":"password"} placeholder="Min 6 characters" value={form.password} onChange={e => f("password",e.target.value)} style={{ paddingRight:"2.5rem" }} />
                <button type="button" className="pass-toggle" onClick={() => setShowP(s => !s)}>
                  <i className={showP?"fas fa-eye-slash":"fas fa-eye"} />
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input className="input" type={showP?"text":"password"} placeholder="Repeat password" value={form.confirm} onChange={e => f("confirm",e.target.value)} />
            </div>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ 
                display: "flex", 
                alignItems: "flex-start", 
                cursor: "pointer", 
                fontSize: "0.875rem",
                color: "#71717a",
                lineHeight: "1.5"
              }}>
                <input 
                  type="checkbox" 
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  style={{ 
                    marginRight: "0.5rem", 
                    marginTop: "0.25rem",
                    cursor: "pointer",
                    width: "16px",
                    height: "16px",
                    accentColor: "#6366f1"
                  }}
                />
                <span>
                  I accept the{" "}
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      toast("Terms and Conditions: By using FIN TRACKER, you agree to manage your finances responsibly. FIN TRACKER provides guidance only and is not liable for financial decisions.", {
                        duration: 6000,
                        icon: "📋"
                      });
                    }}
                    style={{ 
                      color: "#6366f1", 
                      textDecoration: "underline",
                      fontWeight: "500"
                    }}
                  >
                    Terms and Conditions
                  </a>
                  {" "}and{" "}
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      toast("Privacy Policy: We protect your data with encryption. We never share your personal or financial information with third parties.", {
                        duration: 6000,
                        icon: "🔒"
                      });
                    }}
                    style={{ 
                      color: "#6366f1", 
                      textDecoration: "underline",
                      fontWeight: "500"
                    }}
                  >
                    Privacy Policy
                  </a>
                </span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading || !acceptedTerms} style={{ marginTop: "0.25rem" }}>
              {loading ? "Sending code..." : <><i className="fas fa-user-plus" /> Create Account</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
