"use client";
import Sidebar from "@/components/Sidebar";
import ProductTour from "@/components/ProductTour";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("fab_token");
    if (!token) { router.replace("/login"); return; }
    setReady(true);
  }, [router]);

  if (!ready) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 1rem" }} />
        <div style={{ color: "var(--text3)", fontSize: "0.85rem" }}>Loading...</div>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main" data-tour="main-content">{children}</main>
      <ProductTour />
    </div>
  );
}
