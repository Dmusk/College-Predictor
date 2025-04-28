// Simple authentication utility for admin access
import { cookies } from "next/headers";
import { encrypt, decrypt } from "./crypto";

// In a production application, use a proper authentication system
// This is a simplified version for demonstration purposes

export interface AdminUser {
  username: string;
  role: "admin";
}

// Admin credentials should be stored securely in environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const AUTH_COOKIE_NAME = "admin_session";
const AUTH_SECRET_KEY =
  process.env.AUTH_SECRET_KEY || "your-secret-key-for-auth-encryption";

export async function authenticateAdmin(
  username: string,
  password: string
): Promise<AdminUser | null> {
  // In a real app, you would validate against a database or external auth service
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return {
      username,
      role: "admin",
    };
  }
  return null;
}

export function setAuthCookie(user: AdminUser) {
  const cookieStore = cookies();
  const userData = JSON.stringify(user);
  const encryptedData = encrypt(userData, AUTH_SECRET_KEY);

  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: encryptedData,
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 1 day
    sameSite: "strict",
  });
}

export function getAuthCookie(): AdminUser | null {
  const cookieStore = cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);

  if (!authCookie) return null;

  try {
    const decryptedData = decrypt(authCookie.value, AUTH_SECRET_KEY);
    return JSON.parse(decryptedData) as AdminUser;
  } catch (error) {
    return null;
  }
}

export function clearAuthCookie() {
  const cookieStore = cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export function requireAdmin() {
  const user = getAuthCookie();
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}
