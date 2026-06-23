"use client";
import EmergencyAdvisor from "@/components/advisor/EmergencyAdvisor";
import { PageHeader } from "@/components/ui";

export default function FinanceEmergencyPage() {
  return (
    <div className="fade-in" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <PageHeader
        icon="fas fa-first-aid"
        title="Emergency Recovery Advisor"
        color="#ef4444"
        sub="Get immediate action plan for financial emergencies"
      />
      
      <EmergencyAdvisor />
    </div>
  );
}
