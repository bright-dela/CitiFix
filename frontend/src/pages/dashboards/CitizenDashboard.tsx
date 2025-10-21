"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import axios from "axios"
import toast from "react-hot-toast"
import Sidebar from "../../components/Sidebar"
import IncidentForm from "../../components/IncidentForm"
import IncidentList from "../../components/IncidentList"
import { AlertCircle, TrendingUp, Clock, CheckCircle } from "lucide-react"

export default function CitizenDashboard() {
  const { user, logout } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    inProgress: 0,
  })

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"

  useEffect(() => {
    fetchIncidents()
  }, [])

  useEffect(() => {
    const newStats = {
      total: incidents.length,
      pending: incidents.filter((i) => i.status === "pending").length,
      resolved: incidents.filter((i) => i.status === "resolved").length,
      inProgress: incidents.filter((i) => i.status === "in_progress" || i.status === "assigned").length,
    }
    setStats(newStats)
  }, [incidents])

  const fetchIncidents = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/incidents/`)
      setIncidents(response.data.results || response.data)
    } catch (error) {
      toast.error("Failed to fetch incidents")
    } finally {
      setLoading(false)
    }
  }

  const handleIncidentCreated = () => {
    setShowForm(false)
    fetchIncidents()
    toast.success("Incident reported successfully!")
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userType="citizen" onLogout={logout} />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground">Welcome back, {user?.full_name}</h1>
            <p className="text-muted-foreground mt-2">Report and track civic incidents in your community</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Reports</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stats.total}</p>
                </div>
                <AlertCircle className="text-primary" size={32} />
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
                </div>
                <Clock className="text-yellow-600" size={32} />
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.inProgress}</p>
                </div>
                <TrendingUp className="text-blue-600" size={32} />
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

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-foreground">Report an Incident</h2>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition font-medium"
                >
                  New Report
                </button>
              )}
            </div>

            {showForm && (
              <div className="mb-8">
                <button
                  onClick={() => setShowForm(false)}
                  className="text-muted-foreground hover:text-foreground mb-4 text-sm"
                >
                  ← Cancel
                </button>
                <IncidentForm onSuccess={handleIncidentCreated} />
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Your Incidents</h2>
            {loading ? (
              <div className="text-center py-12 bg-card rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading incidents...</p>
              </div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <AlertCircle size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No incidents reported yet</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition"
                >
                  Report Your First Incident
                </button>
              </div>
            ) : (
              <IncidentList incidents={incidents} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
