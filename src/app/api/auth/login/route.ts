import { NextResponse } from "next/server";
import { authenticateAdmin, setAuthCookie } from "../../../../utils/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = await authenticateAdmin(username, password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Set auth cookie and get headers
    const cookieHeaders = setAuthCookie(user);

    // Create response with the cookie headers
    const response = NextResponse.json({
      success: true,
      user: { username: user.username, role: user.role },
    });

    // Apply the cookie headers to the response
    cookieHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
