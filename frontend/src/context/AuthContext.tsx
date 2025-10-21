"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import axios from "axios"

interface User {
  id: string
  phone_number: string
  email: string
  full_name: string
  user_type: "citizen" | "authority" | "media" | "admin"
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (phoneNumber: string, password: string) => Promise<void>
  register: (data: any, role: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"

  // Initialize from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("access_token")
    const storedUser = localStorage.getItem("user")

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`
    }
    setLoading(false)
  }, [])

  const login = async (phoneNumber: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login/`, {
        phone_number: phoneNumber,
        password,
      })

      const { access, refresh, user: userData } = response.data

      setToken(access)
      setUser(userData)
      localStorage.setItem("access_token", access)
      localStorage.setItem("refresh_token", refresh)
      localStorage.setItem("user", JSON.stringify(userData))
      axios.defaults.headers.common["Authorization"] = `Bearer ${access}`
    } catch (error) {
      throw error
    }
  }

  const register = async (data: any, role: string) => {
    try {
      const endpoint =
        role === "citizen" ? "register/citizen/" : role === "authority" ? "register/authority/" : "register/media/"

      await axios.post(`${API_BASE_URL}/${endpoint}`, data)
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
    delete axios.defaults.headers.common["Authorization"]
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
