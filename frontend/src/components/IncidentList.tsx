import { AlertCircle, MapPin, Calendar, User } from "lucide-react"

interface Incident {
  id: string
  incident_type: string
  severity: string
  status: string
  description: string
  location_address: string
  created_at: string
  reporter_name?: string
}

interface IncidentListProps {
  incidents: Incident[]
  isAuthority?: boolean
  isMedia?: boolean
}

const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: "⏳" },
  verified: { bg: "bg-blue-100", text: "text-blue-800", icon: "✓" },
  assigned: { bg: "bg-purple-100", text: "text-purple-800", icon: "👤" },
  in_progress: { bg: "bg-orange-100", text: "text-orange-800", icon: "🔄" },
  resolved: { bg: "bg-green-100", text: "text-green-800", icon: "✓✓" },
  rejected: { bg: "bg-red-100", text: "text-red-800", icon: "✗" },
}

const severityColors: Record<string, { color: string; label: string }> = {
  low: { color: "text-green-600", label: "Low" },
  medium: { color: "text-yellow-600", label: "Medium" },
  high: { color: "text-orange-600", label: "High" },
  critical: { color: "text-red-600", label: "Critical" },
}

const incidentTypeEmojis: Record<string, string> = {
  fire: "🔥",
  medical: "🚑",
  crime: "🚨",
  accident: "🚗",
  disaster: "⛈️",
  other: "📋",
}

export default function IncidentList({ incidents, isAuthority, isMedia }: IncidentListProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border border-border">
        <AlertCircle size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg">No incidents found</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {incidents.map((incident) => {
        const statusInfo = statusColors[incident.status] || statusColors.pending
        const severityInfo = severityColors[incident.severity] || severityColors.medium
        const emoji = incidentTypeEmojis[incident.incident_type] || "📋"

        return (
          <div
            key={incident.id}
            className="bg-card rounded-lg border border-border shadow hover:shadow-lg transition p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="text-3xl">{emoji}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground capitalize">
                    {incident.incident_type.replace("_", " ")}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <MapPin size={16} />
                    {incident.location_address || "Location not specified"}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap justify-end">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                  {statusInfo.icon} {incident.status.replace("_", " ")}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium bg-background border border-border ${severityInfo.color}`}
                >
                  {severityInfo.label}
                </span>
              </div>
            </div>

            <p className="text-foreground mb-4 leading-relaxed">{incident.description}</p>

            <div className="flex justify-between items-center text-sm text-muted-foreground pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                {new Date(incident.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              {incident.reporter_name && (
                <div className="flex items-center gap-2">
                  <User size={16} />
                  {incident.reporter_name}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
