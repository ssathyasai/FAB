"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login, register, verifyOTP, resendOTP } from "@/lib/api";
import toast from "react-hot-toast";

type Step = "auth" | "otp";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<Step>("auth");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [showP, setShowP] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const f = (k: string, v: string) => setForm(x => ({ ...x, [k]: v }));

  // Show error from Google OAuth redirect (if any)
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      toast.error(decodeURIComponent(error));
    }
  }, [searchParams]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Step 1: Login / Signup submit ──────────────────────────────
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup") {
      if (!form.name.trim()) return toast.error("Enter your name");
      if (form.password !== form.confirm) return toast.error("Passwords don't match");
      if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await login({ email: form.email, password: form.password });
        localStorage.setItem("fab_token", res.data.token);
        localStorage.setItem("fab_user", JSON.stringify(res.data.user));
        toast.success(`Welcome back, ${res.data.user.name}!`);
        router.push("/budget/overview");
      } else {
        // Signup → send OTP
        await register({ name: form.name, email: form.email, password: form.password });
        toast.success("Verification code sent to your email!");
        setStep("otp");
        setCountdown(60);
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: OTP verify ─────────────────────────────────────────
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) return toast.error("Enter the 6-digit code");
    setLoading(true);
    try {
      const res = await verifyOTP({ email: form.email, otp: code });
      localStorage.setItem("fab_token", res.data.token);
      localStorage.setItem("fab_user", JSON.stringify(res.data.user));
      toast.success(`Welcome to FAB Finance, ${res.data.user.name}! 🎉`);
      router.push("/budget/overview");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Invalid OTP");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    try {
      await resendOTP({ email: form.email });
      toast.success("New code sent!");
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to resend OTP");
    }
  };

  // ── OTP input handling ─────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  // ── Google Sign-In ─────────────────────────────────────────────
  const handleGoogleSignIn = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error("Google Sign-In not configured. See /google-oauth-setup for instructions.");
      return;
    }
    const redirectUri = `${window.location.origin}/api/auth/google/callback`;
    const scope = "email profile";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope,
      access_type: "offline",
      prompt: "consent",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  // ── OTP Screen ─────────────────────────────────────────────────
  if (step === "otp") {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            <i className="fas fa-envelope-open-text" />
          </div>
          <h1 className="login-title">Check your email</h1>
          <p className="login-subtitle">
            We sent a 6-digit code to<br />
            <strong style={{ color: "var(--text1)" }}>{form.email}</strong>
          </p>

          <form onSubmit={handleOtpSubmit} style={{ marginTop: "1.75rem" }}>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "1.5rem" }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  style={{
                    width: "46px",
                    height: "54px",
                    textAlign: "center",
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    border: `2px solid ${digit ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "10px",
                    background: digit ? "var(--accent-dim)" : "var(--surface)",
                    color: "var(--text1)",
                    outline: "none",
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || otp.join("").length !== 6}
              style={{ marginBottom: "1rem" }}
            >
              {loading ? (
                <><span className="spinner-sm" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />&nbsp;Verifying...</>
              ) : (
                <><i className="fas fa-check-circle" /> Verify Email</>
              )}
            </button>

            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text3)", marginBottom: "0.5rem" }}>
                Didn't receive the code?
              </p>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={countdown > 0}
                style={{
                  background: "none",
                  border: "none",
                  color: countdown > 0 ? "var(--text4)" : "var(--accent)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: countdown > 0 ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
              </button>
            </div>

            <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => { setStep("auth"); setOtp(["", "", "", "", "", ""]); }}
                style={{ background: "none", border: "none", color: "var(--text3)", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit" }}
              >
                <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} />
                Back to signup
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Auth Screen (Login / Signup) ───────────────────────────────
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <i className="fas fa-coins" />
        </div>
        <h1 className="login-title">FAB Finance</h1>
        <p className="login-subtitle">AI-powered personal finance tracker</p>

        <div className="sanskrit-quote">
          <p color="red">&quot;Dhanam mulam idam jagath&quot;</p>
        </div>

        <div className="login-tabs">
          <button type="button" className={`login-tab-btn ${mode === "login" ? "on" : "off"}`} onClick={() => setMode("login")}>Sign In</button>
          <button type="button" className={`login-tab-btn ${mode === "signup" ? "on" : "off"}`} onClick={() => setMode("signup")}>Create Account</button>
        </div>

        <button type="button" className="google-btn" onClick={handleGoogleSignIn}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </button>

        <div className="login-divider">or continue with email</div>

        <form onSubmit={handleAuthSubmit}>
          {mode === "signup" && (
            <div className="form-group">
              <label>Full Name</label>
              <input id="signup-name" className="input" placeholder="Rahul Sharma" value={form.name} onChange={e => f("name", e.target.value)} autoComplete="name" />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input id="auth-email" className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => f("email", e.target.value)} autoComplete="email" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="pass-wrap">
              <input
                id="auth-password"
                className="input"
                type={showP ? "text" : "password"}
                placeholder={mode === "signup" ? "Min 6 characters" : "Your password"}
                value={form.password}
                onChange={e => f("password", e.target.value)}
                style={{ paddingRight: "2.5rem" }}
              />
              <button type="button" className="pass-toggle" onClick={() => setShowP(s => !s)}>
                <i className={showP ? "fas fa-eye-slash" : "fas fa-eye"} />
              </button>
            </div>
          </div>
          {mode === "signup" && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                id="signup-confirm"
                className="input"
                type={showP ? "text" : "password"}
                placeholder="Repeat password"
                value={form.confirm}
                onChange={e => f("confirm", e.target.value)}
              />
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: "0.25rem" }}>
            {loading ? (
              <><span className="spinner-sm" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />&nbsp;{mode === "login" ? "Signing in..." : "Sending code..."}</>
            ) : (
              <><i className={mode === "login" ? "fas fa-sign-in-alt" : "fas fa-paper-plane"} /> {mode === "login" ? "Sign In" : "Send Verification Code"}</>
            )}
          </button>
        </form>

        {mode === "signup" && (
          <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text4)", marginTop: "1rem", lineHeight: 1.6 }}>
            A 6-digit verification code will be sent to your email.
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="login-page">
        <div className="login-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
          <div className="spinner" />
        </div>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
