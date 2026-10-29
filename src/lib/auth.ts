import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getDb } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-jwt-key-min-32-chars-long-for-openapi-hub-prod"
);

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export async function createSessionToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUserFromCookies(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export async function getCurrentUser(request?: NextRequest): Promise<TokenPayload | null> {
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      return await verifySessionToken(token);
    }
    const token = request.cookies.get("session_token")?.value;
    if (token) {
      return await verifySessionToken(token);
    }
  }
  return await getCurrentUserFromCookies();
}

export function logAuditEvent(
  userId: string | null,
  userEmail: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    const db = getDb();
    const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_email, action, resource_type, resource_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId || "anonymous",
      userEmail,
      action,
      resourceType,
      resourceId,
      JSON.stringify(metadata)
    );
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}
