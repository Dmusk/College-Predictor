import { NextResponse } from "next/server";
import { clearAuthCookie } from "../../../../utils/auth";

export async function POST() {
  try {
    // Clear the authentication cookie
    clearAuthCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
