export default function GoogleOAuthSetup() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#f9fafb", marginBottom: "0.5rem" }}>
            🔐 Google OAuth Setup
          </h1>
          <p style={{ color: "rgba(249,250,251,0.6)" }}>
            Follow these steps to enable Google Sign-In for FAB Finance
          </p>
        </div>

        <div className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#3b82f6", marginBottom: "1rem" }}>
            📋 Step 1: Create Google Cloud Project
          </h2>
          <ol style={{ paddingLeft: "1.5rem", color: "var(--text2)", lineHeight: 1.8 }}>
            <li>Go to <a href="https://console.cloud.google.com/" target="_blank" style={{ color: "#3b82f6" }}>Google Cloud Console</a></li>
            <li>Click "Select a project" → "New Project"</li>
            <li>Name it "FAB Finance" and click Create</li>
          </ol>
        </div>

        <div className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#8b5cf6", marginBottom: "1rem" }}>
            🔑 Step 2: Create OAuth Credentials
          </h2>
          <ol style={{ paddingLeft: "1.5rem", color: "var(--text2)", lineHeight: 1.8 }}>
            <li>Go to <strong>APIs & Services</strong> → <strong>Credentials</strong></li>
            <li>Click <strong>Create Credentials</strong> → <strong>OAuth client ID</strong></li>
            <li>Configure consent screen if prompted:
              <ul style={{ paddingLeft: "1.5rem", marginTop: "0.5rem" }}>
                <li>User Type: External</li>
                <li>App name: FAB Finance</li>
                <li>Add your email</li>
              </ul>
            </li>
            <li>Create OAuth client ID:
              <ul style={{ paddingLeft: "1.5rem", marginTop: "0.5rem" }}>
                <li>Application type: <strong>Web application</strong></li>
                <li>Authorized JavaScript origins: <code style={{ background: "rgba(59,130,246,0.10)", padding: "0.2rem 0.5rem", borderRadius: "4px", color: "#3b82f6" }}>http://localhost:3000</code></li>
                <li>Authorized redirect URIs: <code style={{ background: "rgba(59,130,246,0.10)", padding: "0.2rem 0.5rem", borderRadius: "4px", color: "#3b82f6" }}>http://localhost:3000/api/auth/google/callback</code></li>
              </ul>
            </li>
            <li><strong>Copy Client ID and Client Secret!</strong></li>
          </ol>
        </div>

        <div className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#10b981", marginBottom: "1rem" }}>
            ⚙️ Step 3: Configure Backend
          </h2>
          <p style={{ color: "var(--text2)", marginBottom: "1rem" }}>
            Add these to <code style={{ background: "rgba(16,185,129,0.10)", padding: "0.2rem 0.5rem", borderRadius: "4px", color: "#10b981" }}>c:\FAB\backend\.env</code>:
          </p>
          <pre style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(16,185,129,0.20)",
            borderRadius: "12px",
            padding: "1.2rem",
            color: "#10b981",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            overflowX: "auto",
          }}>
{`GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback`}
          </pre>
        </div>

        <div className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f59e0b", marginBottom: "1rem" }}>
            🎨 Step 4: Configure Frontend
          </h2>
          <p style={{ color: "var(--text2)", marginBottom: "1rem" }}>
            Create/edit <code style={{ background: "rgba(245,158,11,0.10)", padding: "0.2rem 0.5rem", borderRadius: "4px", color: "#f59e0b" }}>c:\FAB\frontend\.env.local</code>:
          </p>
          <pre style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(245,158,11,0.20)",
            borderRadius: "12px",
            padding: "1.2rem",
            color: "#f59e0b",
            fontFamily: "monospace",
            fontSize: "0.85rem",
          }}>
{`NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`}
          </pre>
        </div>

        <div className="card" style={{ padding: "2rem", background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 100%)", border: "1px solid rgba(59,130,246,0.20)" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#3b82f6", marginBottom: "1rem" }}>
            ✅ Step 5: Restart Services
          </h2>
          <p style={{ color: "var(--text2)", marginBottom: "1rem" }}>
            After configuration:
          </p>
          <ol style={{ paddingLeft: "1.5rem", color: "var(--text2)", lineHeight: 1.8 }}>
            <li>Restart backend server (Ctrl+C and run again)</li>
            <li>Restart frontend (Ctrl+C and <code>npm run dev</code>)</li>
            <li>Go to login page and try "Sign in with Google"</li>
          </ol>
        </div>

        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <a href="/login" className="btn-primary" style={{ display: "inline-flex", width: "auto" }}>
            <i className="fas fa-arrow-left" /> Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
