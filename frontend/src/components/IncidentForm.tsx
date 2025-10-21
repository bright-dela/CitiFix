"use client"

import type React from "react"

import { useState } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { MapPin, Loader } from "lucide-react"

interface IncidentFormProps {
  onSuccess: () => void
}

export default function IncidentForm({ onSuccess }: IncidentFormProps) {
  const [formData, setFormData] = useState({
    incident_type: "fire",
    severity: "medium",
    description: "",
    location_latitude: "",
    location_longitude: "",
    location_address: "",
  })
  const [loading, setLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"

  const incidentTypes = [
    { value: "fire", label: "🔥 Fire" },
    { value: "medical", label: "🚑 Medical Emergency" },
    { value: "crime", label: "🚨 Crime" },
    { value: "accident", label: "🚗 Accident" },
    { value: "disaster", label: "⛈️ Natural Disaster" },
    { value: "other", label: "📋 Other" },
  ]

  const severityLevels = [
    { value: "low", label: "Low", color: "bg-green-100 text-green-800" },
    { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
    { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
    { value: "critical", label: "Critical", color: "bg-red-100 text-red-800" },
  ]

  const getGeolocation = () => {
    setGeoLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            location_latitude: position.coords.latitude.toString(),
            location_longitude: position.coords.longitude.toString(),
          })
          toast.success("Location captured!")
          setGeoLoading(false)
        },
        () => {
          toast.error("Failed to get location")
          setGeoLoading(false)
        },
      )
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await axios.post(`${API_BASE_URL}/incidents/`, formData)
      toast.success("Incident reported successfully!")
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to report incident")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-lg p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">Incident Type</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {incidentTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, incident_type: type.value })}
                className={`p-3 rounded-lg border-2 transition font-medium text-sm ${
                  formData.incident_type === type.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">Severity Level</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {severityLevels.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setFormData({ ...formData, severity: level.value })}
                className={`p-3 rounded-lg border-2 transition font-medium text-sm ${
                  formData.severity === level.value
                    ? `border-current ${level.color}`
                    : "border-border bg-background text-foreground hover:border-border/50"
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-foreground mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the incident in detail..."
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground placeholder-muted-foreground"
            rows={4}
            required
          />
        </div>

        <div>
          <label htmlFor="location_address" className="block text-sm font-semibold text-foreground mb-2">
            Location
          </label>
          <div className="flex gap-2">
            <input
              id="location_address"
              type="text"
              name="location_address"
              value={formData.location_address}
              onChange={handleChange}
              placeholder="Enter address or location name"
              className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground placeholder-muted-foreground"
            />
            <button
              type="button"
              onClick={getGeolocation}
              disabled={geoLoading}
              className="bg-accent text-accent-foreground px-4 py-3 rounded-lg hover:bg-accent/90 disabled:opacity-50 transition flex items-center gap-2 font-medium"
            >
              {geoLoading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Getting...
                </>
              ) : (
                <>
                  <MapPin size={18} />
                  Get Location
                </>
              )}
            </button>
          </div>
          {formData.location_latitude && (
            <p className="text-sm text-muted-foreground mt-2">
              📍 Coordinates: {Number.parseFloat(formData.location_latitude).toFixed(4)},{" "}
              {Number.parseFloat(formData.location_longitude).toFixed(4)}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {loading ? "Submitting..." : "Submit Report"}
        </button>
      </form>
    </div>
  )
}
