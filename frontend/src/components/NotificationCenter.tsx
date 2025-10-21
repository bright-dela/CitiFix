"use client"

import { useState, useEffect } from "react"
import { Bell, X, AlertCircle, CheckCircle, Info } from "lucide-react"

interface Notification {
  id: string
  type: "success" | "error" | "info" | "warning"
  title: string
  message: string
  timestamp: Date
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Listen for custom notification events
    const handleNotification = (event: CustomEvent) => {
      const newNotification: Notification = {
        id: Date.now().toString(),
        ...event.detail,
        timestamp: new Date(),
      }
      setNotifications((prev) => [newNotification, ...prev])

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id))
      }, 5000)
    }

    window.addEventListener("notification", handleNotification as EventListener)
    return () => window.removeEventListener("notification", handleNotification as EventListener)
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="text-green-600" size={20} />
      case "error":
        return <AlertCircle className="text-red-600" size={20} />
      case "warning":
        return <AlertCircle className="text-yellow-600" size={20} />
      default:
        return <Info className="text-blue-600" size={20} />
    }
  }

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200"
      case "error":
        return "bg-red-50 border-red-200"
      case "warning":
        return "bg-yellow-50 border-yellow-200"
      default:
        return "bg-blue-50 border-blue-200"
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-card border border-border rounded-full p-3 hover:shadow-lg transition"
      >
        <Bell size={20} className="text-foreground" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute top-16 right-0 w-96 bg-card border border-border rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div key={notification.id} className={`p-4 border-l-4 ${getBackgroundColor(notification.type)}`}>
                  <div className="flex items-start gap-3">
                    {getIcon(notification.type)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== notification.id))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
