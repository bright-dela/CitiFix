import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { v4 as uuidv4 } from "uuid"

// Mock database - in production, use a real database
const users: Record<string, { id: string; email: string; name: string; password: string; role: string }> = {}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()

    if (!email || !password || !name || !role) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = Object.values(users).find((u) => u.email === email)
    if (existingUser) {
      return NextResponse.json({ message: "Email already registered" }, { status: 409 })
    }

    const userId = uuidv4()
    const newUser = { id: userId, email, name, password, role }
    users[userId] = newUser

    const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: "7d" })

    const response = NextResponse.json({
      id: userId,
      email,
      name,
      role,
    })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
