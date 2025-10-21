"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import axios from "axios"
import toast from "react-hot-toast"
import Sidebar from "../../components/Sidebar"
import { CheckCircle, AlertCircle, TrendingUp } from "lucide-react"

export default function AuthorityDashboard() {
  const { user, logout } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState("assigned")
  const [stats, setStats] = useState({
    assigned: 0,
    verified: 0,
    inProgress: 0,
    resolved: 0,
  })
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"

  useEffect(() => {
    fetchIncidents()
    fetchStats()
  }, [filter])

  const fetchIncidents = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/incidents/`, {
        params: { status: filter },
      })
      setIncidents(response.data.results || response.data)
    } catch (error) {
      toast.error("Failed to fetch incidents")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/incidents/`)
      const allIncidents = response.data.results || response.data
      setStats({
        assigned: allIncidents.filter((i) => i.status === "assigned").length,
        verified: allIncidents.filter((i) => i.status === "verified").length,
        inProgress: allIncidents.filter((i) => i.status === "in_progress").length,
        resolved: allIncidents.filter((i) => i.status === "resolved").length,
      })
    } catch (error) {
      console.error("Failed to fetch stats")
    }
  }

  const handleVerifyIncident = async (incidentId) => {
    setActionLoading(true)
    try {
      await axios.patch(`${API_BASE_URL}/incidents/${incidentId}/`, {
        status: "verified",
      })
      toast.success("Incident verified successfully!")
      fetchIncidents()
      fetchStats()
      setSelectedIncident(null)
    } catch (error) {
      toast.error("Failed to verify incident")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectIncident = async (incidentId) => {
    setActionLoading(true)
    try {
      await axios.patch(`${API_BASE_URL}/incidents/${incidentId}/`, {
        status: "rejected",
      })
      toast.success("Incident rejected")
      fetchIncidents()
      fetchStats()
      setSelectedIncident(null)
    } catch (error) {
      toast.error("Failed to reject incident")
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkInProgress = async (incidentId) => {
    setActionLoading(true)
    try {
      await axios.patch(`${API_BASE_URL}/incidents/${incidentId}/`, {
        status: "in_progress",
      })
      toast.success("Incident marked as in progress")
      fetchIncidents()
      fetchStats()
      setSelectedIncident(null)
    } catch (error) {
      toast.error("Failed to update incident")
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkResolved = async (incidentId) => {
    setActionLoading(true)
    try {
      await axios.patch(`${API_BASE_URL}/incidents/${incidentId}/`, {
        status: "resolved",
      })
      toast.success("Incident marked as resolved")
      fetchIncidents()
      fetchStats()
      setSelectedIncident(null)
    } catch (error) {
      toast.error("Failed to resolve incident")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userType="authority" onLogout={logout} />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground">Authority Dashboard</h1>
            <p className="text-muted-foreground mt-2">Verify and manage civic incidents</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Assigned</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{stats.assigned}</p>
                </div>
                <AlertCircle className="text-purple-600" size={32} />
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Verified</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.verified}</p>
                </div>
                <CheckCircle className="text-blue-600" size={32} />
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">{stats.inProgress}</p>
                </div>
                <TrendingUp className="text-orange-600" size={32} />
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Resolved</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.resolved}</p>
                </div>
                <CheckCircle className="text-green-600" size={32} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-8">
            {["assigned", "verified", "in_progress", "resolved"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {status.replace("_", " ").charAt(0).toUpperCase() + status.replace("_", " ").slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 bg-card rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading incidents...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {incidents.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-lg border border-border">
                  <AlertCircle size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No incidents in this category</p>
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
                      </div>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                        {incident.status.replace("_", " ")}
                      </span>
                    </div>

                    <p className="text-foreground mb-4">{incident.description}</p>

                    <div className="flex gap-2 pt-4 border-t border-border">
                      {filter === "assigned" && (
                        <>
                          <button
                            onClick={() => handleVerifyIncident(incident.id)}
                            disabled={actionLoading}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                          >
                            ✓ Verify
                          </button>
                          <button
                            onClick={() => handleRejectIncident(incident.id)}
                            disabled={actionLoading}
                            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                          >
                            ✗ Reject
                          </button>
                        </>
                      )}
                      {filter === "verified" && (
                        <button
                          onClick={() => handleMarkInProgress(incident.id)}
                          disabled={actionLoading}
                          className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                        >
                          🔄 Start Work
                        </button>
                      )}
                      {filter === "in_progress" && (
                        <button
                          onClick={() => handleMarkResolved(incident.id)}
                          disabled={actionLoading}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                        >
                          ✓ Mark Resolved
                        </button>
                      )}
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
