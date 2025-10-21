"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import axios from "axios"
import toast from "react-hot-toast"
import Sidebar from "../../components/Sidebar"
import { Eye, Share2, Download, AlertCircle } from "lucide-react"

export default function MediaDashboard() {
  const { user, logout } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState("all")
  const [stats, setStats] = useState({
    total: 0,
    byType: {},
  })

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"

  useEffect(() => {
    fetchAccessibleIncidents()
  }, [filter])

  const fetchAccessibleIncidents = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/incidents/`, {
        params: { status: "verified" },
      })
      const data = response.data.results || response.data
      setIncidents(data)

      // Calculate stats
      const byType = {}
      data.forEach((incident) => {
        byType[incident.incident_type] = (byType[incident.incident_type] || 0) + 1
      })
      setStats({
        total: data.length,
        byType,
      })
    } catch (error) {
      toast.error("Failed to fetch incidents")
    } finally {
      setLoading(false)
    }
  }

  const handleShare = (incident) => {
    const text = `Incident: ${incident.incident_type}\nLocation: ${incident.location_address}\nDescription: ${incident.description}`
    if (navigator.share) {
      navigator.share({
        title: "Civic Incident Report",
        text: text,
      })
    } else {
      navigator.clipboard.writeText(text)
      toast.success("Incident details copied to clipboard!")
    }
  }

  const handleDownload = (incident) => {
    const content = `
CIVIC INCIDENT REPORT
=====================
Type: ${incident.incident_type}
Severity: ${incident.severity}
Status: ${incident.status}
Location: ${incident.location_address}
Date: ${new Date(incident.created_at).toLocaleDateString()}

Description:
${incident.description}
    `
    const element = document.createElement("a")
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content))
    element.setAttribute("download", `incident-${incident.id}.txt`)
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success("Incident report downloaded!")
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userType="media" onLogout={logout} />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground">Media Dashboard</h1>
            <p className="text-muted-foreground mt-2">Access and report on verified civic incidents</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Verified</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.total}</p>
                </div>
                <Eye className="text-blue-600" size={32} />
              </div>
            </div>

            {Object.entries(stats.byType)
              .slice(0, 3)
              .map(([type, count]) => (
                <div key={type} className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium capitalize">{type.replace("_", " ")}</p>
                    <p className="text-3xl font-bold text-primary mt-2">{count}</p>
                  </div>
                </div>
              ))}
          </div>

          {loading ? (
            <div className="text-center py-12 bg-card rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading verified incidents...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {incidents.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-lg border border-border">
                  <AlertCircle size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No verified incidents available</p>
                </div>
              ) : (
                incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="bg-card rounded-lg border border-border shadow hover:shadow-lg transition p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-foreground capitalize">
                          {incident.incident_type.replace("_", " ")}
                        </h3>
                        <p className="text-muted-foreground text-sm mt-1">{incident.location_address}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {incident.severity}
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Verified
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(incident.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <p className="text-foreground mb-4 leading-relaxed">{incident.description}</p>

                    <div className="flex gap-2 pt-4 border-t border-border">
                      <button
                        onClick={() => handleShare(incident)}
                        className="flex items-center gap-2 flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                      >
                        <Share2 size={16} />
                        Share
                      </button>
                      <button
                        onClick={() => handleDownload(incident)}
                        className="flex items-center gap-2 flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                      >
                        <Download size={16} />
                        Download
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
