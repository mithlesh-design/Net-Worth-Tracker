import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { netWorthApiConfig } from "@/lib/netWorthApiConfig.mjs";

const ENDPOINTS = {
  "send-otp": { method: "POST", path: "/api/net-worth/send-otp", auth: false },
  "verify-otp": { method: "POST", path: "/api/net-worth/verify-otp", auth: false },
  "google-login": { method: "POST", path: "/api/net-worth/google-login", auth: false },
  submit: { method: "POST", path: "/api/net-worth/submit", auth: true },
  open: { method: "GET", path: "/api/net-worth/open", auth: true },
};

async function proxy(request, { params }) {
  const endpoint = ENDPOINTS[params.action];
  if (!endpoint || request.method !== endpoint.method) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let session = null;
  if (endpoint.auth) {
    session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.netWorthAuthenticated) {
      return NextResponse.json({ error: "Sign in to continue", code: "SESSION_EXPIRED" }, { status: 401 });
    }
  }

  const { baseUrl, apiKey } = netWorthApiConfig();
  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: "Net Worth API is not configured" }, { status: 503 });
  }

  const target = new URL(endpoint.path, `${baseUrl.replace(/\/$/, "")}/`);
  if (endpoint.method === "GET") {
    // Never allow a browser to use the API key to enumerate other API users.
    target.searchParams.set("user_id", String(session.user.id));
  }

  let body;
  if (endpoint.method === "POST") {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "A valid JSON body is required" }, { status: 400 });
    }
    if (params.action === "submit") {
      // The authenticated NextAuth identity is authoritative; ignore client
      // supplied identity fields so a caller cannot save as another user.
      body = {
        ...body,
        user_id: session.user.id,
        full_name: session.user.name || body.full_name,
        user: {
          ...(body.user && typeof body.user === "object" ? body.user : {}),
          email: session.user.email || body.user?.email,
          full_name: session.user.name || body.user?.full_name || body.full_name,
        },
      };
    }
  }

  try {
    const response = await fetch(target, {
      method: endpoint.method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; }
    catch { data = { message: text || response.statusText }; }
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Could not reach the Net Worth API" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
