"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * This page redirects to the new Emergency Advisor
 * Location: /advisor (Emergency Advisor tab)
 * 
 * The new advisor automatically fetches user's financial data
 * and only asks emergency-specific questions.
 */
export default function FinanceEmergencyRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the new advisor page
    router.push("/advisor");
  }, [router]);
  
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "60vh",
      gap: "1rem"
    }}>
      <div className="spinner" style={{ width: "40px", height: "40px" }}></div>
      <p style={{ color: "var(--text3)", fontSize: "0.9rem" }}>
        Redirecting to Emergency Advisor...
      </p>
    </div>
  );
}
