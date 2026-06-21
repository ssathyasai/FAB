import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/google/callback
 *
 * Receives the Google OAuth2 authorization code, forwards it to
 * the FAB Finance backend, and redirects to the success page with
 * the JWT token and user info in query params.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // If user denied Google access
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google sign-in was cancelled")}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=No+authorization+code+received+from+Google", request.url)
    );
  }

  try {
    // Exchange code with our backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
    console.log(`[Google OAuth] Calling backend at: ${backendUrl}/api/auth/google`);
    
    const res = await fetch(`${backendUrl}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    console.log(`[Google OAuth] Backend response status: ${res.status}`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data?.detail || `Google authentication failed (${res.status})`;
      console.error(`[Google OAuth] Error:`, msg, data);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(msg)}`, request.url)
      );
    }

    const data = await res.json();
    console.log(`[Google OAuth] Success! User:`, data.user?.email);
    const token = data.token;
    const user = data.user;

    if (!token) {
      return NextResponse.redirect(
        new URL("/login?error=No+token+received+from+server", request.url)
      );
    }

    // Redirect to success page with token and user info as query params
    const successParams = new URLSearchParams({
      token,
      user: JSON.stringify(user),
    });

    return NextResponse.redirect(
      new URL(`/auth/google/success?${successParams.toString()}`, request.url)
    );
  } catch (err) {
    console.error("[Google OAuth callback] Error:", err);
    return NextResponse.redirect(
      new URL("/login?error=An+unexpected+error+occurred", request.url)
    );
  }
}
