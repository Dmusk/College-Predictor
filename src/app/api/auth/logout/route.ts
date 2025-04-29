import { NextResponse } from "next/server";
import { clearAuthCookie } from "../../../../utils/auth";

export async function POST() {
  try {
    // Clear the authentication cookie and get headers
    const cookieHeaders = clearAuthCookie();

    // Create response with the cookie headers
    const response = NextResponse.json({ success: true });

    // Apply the cookie headers to the response
    cookieHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
