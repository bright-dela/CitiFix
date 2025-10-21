"use client"

import { useEffect, useRef } from "react"

interface MapComponentProps {
  latitude: number
  longitude: number
  zoom?: number
  title?: string
}

export default function MapComponent({ latitude, longitude, zoom = 15, title }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    // Create a simple map using OpenStreetMap tiles
    const mapHTML = `
      <div style="width: 100%; height: 100%; position: relative;">
        <iframe
          width="100%"
          height="100%"
          frameborder="0"
          src="https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}"
          style="border: 0; border-radius: 8px;"
        ></iframe>
      </div>
    `

    mapContainer.current.innerHTML = mapHTML
  }, [latitude, longitude])

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="h-64 bg-muted" ref={mapContainer} />
      {title && (
        <div className="p-4 border-t border-border">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        </div>
      )}
    </div>
  )
}
