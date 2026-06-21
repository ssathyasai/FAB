"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

function GoogleSuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const userStr = searchParams.get("user");

    if (!token || !userStr) {
      setErrorMsg("Authentication failed — no token received.");
      setStatus("error");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      localStorage.setItem("fab_token", token);
      localStorage.setItem("fab_user", JSON.stringify(user));
      toast.success(`Welcome${user.name ? `, ${user.name}` : ""}! 🎉`);
      router.replace("/budget/overview");
    } catch {
      setErrorMsg("Failed to process login. Please try again.");
      setStatus("error");
    }
  }, [router, searchParams]);

  if (status === "error") {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "2rem",
      }}>
        <div style={{
          maxWidth: "400px",
          width: "100%",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "2.5rem 2rem",
          boxShadow: "var(--shadow-lg)",
          textAlign: "center",
        }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            background: "var(--red-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
            fontSize: "1.4rem",
            color: "var(--red)",
          }}>
            <i className="fas fa-exclamation-triangle" />
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text1)", marginBottom: "0.5rem" }}>
            Sign-in failed
          </h2>
          <p style={{ color: "var(--text3)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            {errorMsg}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="btn btn-primary btn-full"
          >
            <i className="fas fa-arrow-left" /> Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "56px",
          height: "56px",
          border: "3px solid var(--border)",
          borderTopColor: "var(--accent)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 1rem",
        }} />
        <p style={{ color: "var(--text3)", fontSize: "0.9rem" }}>Signing you in with Google…</p>
      </div>
    </div>
  );
}

export default function GoogleSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ width: "48px", height: "48px", border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    }>
      <GoogleSuccessInner />
    </Suspense>
  );
}
