import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
export const api = axios.create({ baseURL: BASE });

// Add authentication token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fab_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth ────────────────────────────────────────────────────────
export const register   = (data: object) => api.post("/api/auth/register", data);
export const verifyOTP  = (data: object) => api.post("/api/auth/verify-otp", data);
export const resendOTP  = (data: object) => api.post("/api/auth/resend-otp", data);
export const googleAuth = (code: string) => api.post("/api/auth/google", { code });
export const login      = (data: object) => api.post("/api/auth/login", data);
export const getMe      = ()             => api.get("/api/auth/me");

// ─── Bank ────────────────────────────────────────────────────────
export const getBankAccounts   = ()            => api.get("/api/bank/accounts");
export const getBankSummary    = ()            => api.get("/api/bank/summary");
export const createBankAccount = (d: object)   => api.post("/api/bank/accounts", d);
export const updateBankAccount = (id: string, d: object) => api.put(`/api/bank/accounts/${id}`, d);
export const deleteBankAccount = (id: string)  => api.delete(`/api/bank/accounts/${id}`);
export const updateBalance     = (id: string, d: object) => api.post(`/api/bank/accounts/${id}/update-balance`, d);
export const bankTransfer      = (d: object)   => api.post("/api/bank/transfer", d);
export const getDashboardSummary = () => api.get("/api/dashboard/summary");
export const getLeakDetector = () => api.get("/api/dashboard/leak-detector");

// ─── Balance ────────────────────────────────────────────────────
export const getBalance = () => api.get("/api/balance");

// ─── Transactions ────────────────────────────────────────────────
export const getTransactions = (params?: object) => api.get("/api/transactions/", { params });
export const getPendingTransactions = () => api.get("/api/transactions/pending");
export const categorizeTransaction = (id: string, data: object) =>
  api.put(`/api/transactions/${id}/categorize`, data);
export const deleteTransaction = (id: string) => api.delete(`/api/transactions/${id}`);

// ─── Budget ──────────────────────────────────────────────────────
export const getCurrentBudget = () => api.get("/api/budget/current");
export const getBudgetDefaults = () => api.get("/api/budget/defaults");
export const setupBudget = (data: object) => api.post("/api/budget/setup", data);
export const updateBudgetCategory = (month: string, name: string, data: object) =>
  api.put(`/api/budget/category/${month}/${name}`, data);
export const rolloverBudget = () => api.post("/api/budget/rollover");
export const getBudgetHistory = (months?: number) =>
  api.get("/api/budget/history", { params: { months } });

// ─── Alerts ──────────────────────────────────────────────────────
export const getAlerts = (params?: object) => api.get("/api/alerts/", { params });
export const dismissAlert = (id: string) => api.put(`/api/alerts/${id}/dismiss`);
export const runAlertChecks = () => api.post("/api/alerts/check");

// ─── Advisor ─────────────────────────────────────────────────────
export const getAIInsights = () => api.get("/api/advisor/insights");
export const getWhatIf = (params: object) => api.get("/api/advisor/what-if", { params });
export const postAssetAdvisor = (data: object) => api.post("/api/advisor/asset", data);
export const postSavingsAdvisor = (data: object) => api.post("/api/advisor/savings", data);
export const postDebtAdvisor = (data: object) => api.post("/api/advisor/debt", data);
export const postInvestmentAdvisor = (data: object) => api.post("/api/advisor/investment", data);
export const postEmergencyAdvisor = (data: object) => api.post("/api/advisor/emergency", data);

// ─── Settings ────────────────────────────────────────────────────
export const getSettings = () => api.get("/api/settings/");
export const updateSettings = (data: object) => api.put("/api/settings/", data);

// ─── Assets ──────────────────────────────────────────────────────
export const getAssets = () => api.get("/api/assets/");
export const createAsset = (data: object) => api.post("/api/assets/", data);
export const updateAsset = (id: string, data: object) => api.put(`/api/assets/${id}`, data);
export const deleteAsset = (id: string) => api.delete(`/api/assets/${id}`);
export const getAssetDashboard = () => api.get("/api/assets/dashboard");
export const updateAssetValues = () => api.post("/api/assets/update-values");
export const getTrackableAssets = () => api.get("/api/assets/trackable");

// ─── Piggy Bank ──────────────────────────────────────────────────
export const getPiggyBanks = () => api.get("/api/piggybank/");
export const createPiggyBank = (data: object) => api.post("/api/piggybank/", data);
export const deletePiggyBank = (id: string) => api.delete(`/api/piggybank/${id}`);
export const addPiggyBankTransaction = (id: string, data: object) => api.post(`/api/piggybank/${id}/transaction`, data);
export const getPiggyBankTransactions = (id: string) => api.get(`/api/piggybank/${id}/transactions`);
