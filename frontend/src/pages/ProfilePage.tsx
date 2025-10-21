"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import axios from "axios"
import toast from "react-hot-toast"
import Sidebar from "../components/Sidebar"
import { MapPin, Phone, Mail, User, Save, Edit2, MapPinOff } from "lucide-react"

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    email: "",
  })
  const [location, setLocation] = useState<any>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState("")

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/profile/`)
      setProfile(response.data)
      setFormData({
        full_name: response.data.full_name || user?.full_name || "",
        phone_number: response.data.phone_number || user?.phone_number || "",
        email: response.data.email || user?.email || "",
      })
    } catch (error) {
      toast.error("Failed to fetch profile")
    } finally {
      setLoading(false)
    }
  }

  const handleGetLocation = () => {
    setLocationLoading(true)
    setLocationError("")

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser")
      setLocationLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLocation({
          latitude,
          longitude,
          accuracy: position.coords.accuracy,
        })
        setLocationLoading(false)
        toast.success("Location captured successfully!")
      },
      (error) => {
        setLocationError("Unable to get your location. Please enable location services.")
        setLocationLoading(false)
        console.error("Geolocation error:", error)
      },
    )
  }

  const handleSaveProfile = async () => {
    try {
      await axios.patch(`${API_BASE_URL}/profile/`, {
        ...formData,
        ...(location && { latitude: location.latitude, longitude: location.longitude }),
      })
      toast.success("Profile updated successfully!")
      setEditing(false)
      fetchProfile()
    } catch (error) {
      toast.error("Failed to update profile")
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userType={user?.user_type} onLogout={logout} />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-2">Manage your account information and location</p>
          </div>

          {loading ? (
            <div className="text-center py-12 bg-card rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading profile...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-card rounded-lg border border-border shadow p-6 mb-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-foreground">Account Information</h2>
                    <button
                      onClick={() => setEditing(!editing)}
                      className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition"
                    >
                      <Edit2 size={16} />
                      {editing ? "Cancel" : "Edit"}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <User size={16} />
                        Full Name
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          className="w-full mt-2 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <p className="text-lg text-foreground mt-2">{formData.full_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Phone size={16} />
                        Phone Number
                      </label>
                      {editing ? (
                        <input
                          type="tel"
                          name="phone_number"
                          value={formData.phone_number}
                          onChange={handleInputChange}
                          className="w-full mt-2 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <p className="text-lg text-foreground mt-2">{formData.phone_number}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Mail size={16} />
                        Email
                      </label>
                      {editing ? (
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full mt-2 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <p className="text-lg text-foreground mt-2">{formData.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Role</label>
                      <p className="text-lg text-foreground mt-2 capitalize">{user?.user_type}</p>
                    </div>

                    {editing && (
                      <button
                        onClick={handleSaveProfile}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition mt-6"
                      >
                        <Save size={16} />
                        Save Changes
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-card rounded-lg border border-border shadow p-6">
                  <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <MapPin size={24} />
                    Location
                  </h2>

                  {location ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-green-800 mb-2">Location Captured</p>
                        <div className="space-y-2 text-sm text-green-700">
                          <p>Latitude: {location.latitude.toFixed(6)}</p>
                          <p>Longitude: {location.longitude.toFixed(6)}</p>
                          <p>Accuracy: {location.accuracy.toFixed(0)}m</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setLocation(null)}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                      >
                        <MapPinOff size={16} />
                        Clear Location
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-muted-foreground text-sm">
                        Enable location services to help authorities respond faster to incidents in your area.
                      </p>
                      {locationError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-800">{locationError}</p>
                        </div>
                      )}
                      <button
                        onClick={handleGetLocation}
                        disabled={locationLoading}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        <MapPin size={16} />
                        {locationLoading ? "Getting Location..." : "Enable Location"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
