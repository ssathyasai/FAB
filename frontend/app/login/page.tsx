"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login"|"signup"|"verify"|"login-verify">("login");
  const [form, setForm] = useState({ name:"", email:"", password:"", confirm:"", otp:"" });
  const [loading, setL] = useState(false);
  const [showP, setShowP] = useState(false);
  const f = (k: string, v: string) => setForm(x => ({ ...x, [k]: v }));

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Enter your name");
    if (form.password !== form.confirm) return toast.error("Passwords don't match");
    if (form.password.length < 6) return toast.error("Password min 6 characters");
    
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
        toast.success("Password verified! Check your email for OTP");
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
      toast.success("New code sent to your email!");
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
        <h1 className="login-title">FAB Finance</h1>
        <p className="login-subtitle">AI-powered personal finance tracker</p>
        
        <div className="sanskrit-quote">
          <p>"Dhanam mulam idam jagath"</p>
        </div>

        {mode !== "verify" && mode !== "login-verify" && (
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
            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: "0.25rem" }}>
              {loading ? "Verifying..." : <><i className="fas fa-sign-in-alt" /> Continue</>}
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
            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: "0.25rem" }}>
              {loading ? "Sending code..." : <><i className="fas fa-user-plus" /> Create Account</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
