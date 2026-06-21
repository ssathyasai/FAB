export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINRShort(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });
}

export function monthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export const EXPENSE_CATEGORIES = [
  "Food", "Transport", "Housing", "Utilities",
  "Shopping", "Entertainment", "Healthcare", "Education", "Others",
];

export const CATEGORY_ICONS: Record<string, string> = {
  Food: "🍽️", Transport: "🚗", Housing: "🏠", Utilities: "⚡",
  Shopping: "🛍️", Entertainment: "🎬", Healthcare: "💊",
  Education: "📚", Others: "📦", Savings: "💰",
};

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#ef4444", Transport: "#f59e0b", Housing: "#3b82f6",
  Utilities: "#10b981", Shopping: "#ec4899", Entertainment: "#8b5cf6",
  Healthcare: "#06b6d4", Education: "#f97316", Others: "#6b7280",
  Savings: "#10b981",
};
