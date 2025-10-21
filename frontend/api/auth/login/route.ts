import { type NextRequest, NextResponse } from "next/server"

// Mock user database - in production, use a real database
const users: Record<string, { password: string; name: string; role: string }> = {
  "citizen@example.com": {
    password: "password123",
    name: "John Citizen",
    role: "citizen",
  },
  "authority@example.com": {
    password: "password123",
    name: "Jane Authority",
    role: "authority",
  },
  "media@example.com": {
    password: "password123",
    name: "Bob Media",
    role: "media",
  },
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    const user = users[email]
    if (!user || user.password !== password) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    // Create a simple JWT token (in production, use a proper JWT library)
    const token = Buffer.from(
      JSON.stringify({
        email,
        name: user.name,
        role: user.role,
        iat: Date.now(),
      }),
    ).toString("base64")

    const response = NextResponse.json({
      id: email,
      email,
      name: user.name,
      role: user.role,
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
