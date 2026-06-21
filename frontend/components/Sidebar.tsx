"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const BUDGET_ITEMS = [
  { href: "/budget/setup",        icon: "fas fa-rocket",         label: "Setup Wizard" },
  { href: "/budget/overview",     icon: "fas fa-chart-pie",      label: "Overview" },
  { href: "/budget/plan",         icon: "fas fa-sliders-h",      label: "Budget Plan" },
  { href: "/budget/transactions", icon: "fas fa-exchange-alt",   label: "Transactions" },
  { href: "/budget/optimizer",    icon: "fas fa-magic",          label: "Optimizer" },
  { href: "/budget/leaks",        icon: "fas fa-tint",           label: "Leak Detector" },
  { href: "/finance/whatif",      icon: "fas fa-calculator",     label: "What If" },
];

const FINANCE_ITEMS = [
  { href: "/finance/insights",    icon: "fas fa-lightbulb",        label: "AI Insights" },
  { href: "/finance/asset",       icon: "fas fa-gem",              label: "Assets Management" },
  { href: "/finance/debt",        icon: "fas fa-hand-holding-usd", label: "Debt Advisor" },
  { href: "/finance/savings",     icon: "fas fa-chart-line",       label: "Saving Plan" },
  { href: "/finance/investment",  icon: "fas fa-chart-area",       label: "Investment Advisor" },
  { href: "/finance/emergency",   icon: "fas fa-first-aid",        label: "Emergency Advisor" },
];

function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const path = usePathname();
  const active = path === href || path.startsWith(href + "/");

  return (
    <Link href={href} className={`sidebar-link${active ? " active" : ""}`}>
      <i className={icon} />
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem("fab_user");
      if (u) setUser(JSON.parse(u));
    } catch {}
  }, []);

  const logout = () => {
    localStorage.removeItem("fab_token");
    localStorage.removeItem("fab_user");
    router.push("/login");
  };

  const coachActive = path.startsWith("/coach");

  return (
    <aside className="sidebar">
      <Link href="/budget/overview" className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <i className="fas fa-coins" />
        </div>
        <div>
          <div className="sidebar-logo-text">AI<span>FAB</span></div>
          <div className="sidebar-logo-sub">Financial Advisor & Budget</div>
        </div>
      </Link>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-label">Budget</div>
          {BUDGET_ITEMS.map(item => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Finance</div>
          {FINANCE_ITEMS.map(item => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Savings</div>
          <NavLink href="/piggybank" icon="fas fa-piggy-bank" label="Piggy Bank" />
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Bank</div>
          <NavLink href="/bank/accounts" icon="fas fa-university" label="Bank Account" />
        </div>

        <Link href="/coach" className={`sidebar-coach${coachActive ? " active" : ""}`}>
          <i className="fas fa-robot" />
          AI FAB Coach
        </Link>
      </nav>

      <div className="sidebar-footer">
        <NavLink href="/settings" icon="fas fa-cog" label="Settings" />
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user.name?.charAt(0).toUpperCase()}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-email">{user.email}</div>
            </div>
            <button className="sidebar-logout" onClick={logout} title="Sign out">
              <i className="fas fa-sign-out-alt" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
