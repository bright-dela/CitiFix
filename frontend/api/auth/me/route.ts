import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    // Decode the token (in production, verify JWT signature)
    const decoded = JSON.parse(Buffer.from(token, "base64").toString())

    return NextResponse.json({
      id: decoded.email,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    })
  } catch (error) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 })
  }
}
