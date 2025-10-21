import { type NextRequest, NextResponse } from "next/server"

// Mock user database - in production, use a real database
const users: Record<string, { password: string; name: string; role: string }> = {}

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()

    if (!email || !password || !name || !role) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 })
    }

    if (users[email]) {
      return NextResponse.json({ message: "Email already registered" }, { status: 409 })
    }

    // Store user (in production, hash password and use a real database)
    users[email] = { password, name, role }

    // Create a simple JWT token
    const token = Buffer.from(
      JSON.stringify({
        email,
        name,
        role,
        iat: Date.now(),
      }),
    ).toString("base64")

    const response = NextResponse.json({
      id: email,
      email,
      name,
      role,
    })

    // Set token in httpOnly cookie
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
