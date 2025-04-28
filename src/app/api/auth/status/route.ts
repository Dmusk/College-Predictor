import { NextResponse } from "next/server";
import { getAuthCookie } from "../../../../utils/auth";

export async function GET() {
  try {
    const user = getAuthCookie();

    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Auth status error:", error);
    return NextResponse.json(
      { authenticated: false, error: "Failed to check authentication status" },
      { status: 500 }
    );
  }
}
