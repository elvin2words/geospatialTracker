import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface InteractiveMapProps {
  center: [number, number];
  zoom: number;
  currentLocation?: { latitude: number; longitude: number } | null;
  geofences?: any[];
  showCurrentLocation?: boolean;
  showDrawingTools?: boolean;
  onGeofenceDrawn?: (coordinates: any) => void;
}

export default function InteractiveMap({
  center,
  zoom,
  currentLocation,
  geofences = [],
  showCurrentLocation = true,
  showDrawingTools = false,
  onGeofenceDrawn
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);
  const geofenceLayersRef = useRef<L.LayerGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(center, zoom);
    
    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Initialize feature groups
    const geofenceLayer = L.layerGroup().addTo(map);
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    mapInstanceRef.current = map;
    geofenceLayersRef.current = geofenceLayer;
    drawnItemsRef.current = drawnItems;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map center and zoom
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Update current location marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (currentLocationMarkerRef.current) {
      mapInstanceRef.current.removeLayer(currentLocationMarkerRef.current);
      currentLocationMarkerRef.current = null;
    }

    if (currentLocation && showCurrentLocation) {
      const icon = L.divIcon({
        className: "current-location-marker",
        html: `
          <div class="relative">
            <div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg"></div>
            <div class="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-30"></div>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      currentLocationMarkerRef.current = L.marker(
        [currentLocation.latitude, currentLocation.longitude],
        { icon }
      )
        .addTo(mapInstanceRef.current)
        .bindPopup("Current Location");
    }
  }, [currentLocation, showCurrentLocation]);

  // Update geofences
  useEffect(() => {
    if (!mapInstanceRef.current || !geofenceLayersRef.current) return;

    geofenceLayersRef.current.clearLayers();

    geofences.forEach((geofence) => {
      if (!geofence.coordinates) return;

      const coordinates = geofence.coordinates;
      let layer: L.Layer | null = null;

      if (coordinates.type === "Polygon") {
        const latLngs = coordinates.coordinates[0].map((coord: [number, number]) => [
          coord[1], // lat
          coord[0], // lng
        ]);
        
        layer = L.polygon(latLngs, {
          color: getGeofenceColor(geofence.type),
          fillColor: getGeofenceColor(geofence.type),
          fillOpacity: 0.3,
          weight: 3,
          opacity: 0.8,
        });
      } else if (coordinates.type === "Point" && coordinates.radius) {
        layer = L.circle([coordinates.coordinates[1], coordinates.coordinates[0]], {
          radius: coordinates.radius,
          color: getGeofenceColor(geofence.type),
          fillColor: getGeofenceColor(geofence.type),
          fillOpacity: 0.3,
          weight: 3,
          opacity: 0.8,
        });
      } else if (coordinates.type === "Point") {
        // For points without radius, create a marker with a 100m default radius
        layer = L.circle([coordinates.coordinates[1], coordinates.coordinates[0]], {
          radius: 100,
          color: getGeofenceColor(geofence.type),
          fillColor: getGeofenceColor(geofence.type),
          fillOpacity: 0.3,
          weight: 3,
          opacity: 0.8,
        });
      }

      if (layer) {
        layer.bindPopup(`
          <div class="p-2">
            <h3 class="font-semibold">${geofence.name}</h3>
            <p class="text-sm text-gray-600">${formatGeofenceType(geofence.type)}</p>
            ${geofence.description ? `<p class="text-xs mt-1">${geofence.description}</p>` : ""}
          </div>
        `);
        geofenceLayersRef.current!.addLayer(layer);
      }
    });
  }, [geofences]);

  // Drawing tools
  useEffect(() => {
    if (!mapInstanceRef.current || !drawnItemsRef.current) return;

    // Remove existing draw control
    if (drawControlRef.current) {
      mapInstanceRef.current.removeControl(drawControlRef.current);
      drawControlRef.current = null;
    }

    if (showDrawingTools) {
      const drawControl = new L.Control.Draw({
        position: "topleft",
        draw: {
          polygon: {
            allowIntersection: false,
            drawError: {
              color: "#e1e100",
              message: "<strong>Oh snap!</strong> you can't draw that!",
            },
            shapeOptions: {
              color: "#FF5722",
              fillOpacity: 0.2,
              weight: 2,
              dashArray: "5, 5",
            },
          },
          circle: {
            shapeOptions: {
              color: "#FF5722",
              fillOpacity: 0.2,
              weight: 2,
              dashArray: "5, 5",
            },
          },
          rectangle: {
            shapeOptions: {
              color: "#FF5722",
              fillOpacity: 0.2,
              weight: 2,
              dashArray: "5, 5",
            },
          },
          polyline: false,
          marker: false,
          circlemarker: false,
        },
        edit: {
          featureGroup: drawnItemsRef.current,
          remove: true,
        },
      });

      mapInstanceRef.current.addControl(drawControl);
      drawControlRef.current = drawControl;

      // Handle drawing events
      const handleDrawCreated = (e: any) => {
        const layer = e.layer;
        drawnItemsRef.current!.addLayer(layer);

        let coordinates: any = null;

        if (layer instanceof L.Polygon) {
          const latLngs = layer.getLatLngs()[0] as L.LatLng[];
          coordinates = {
            type: "Polygon",
            coordinates: [
              latLngs.map((latLng) => [latLng.lng, latLng.lat]),
            ],
          };
        } else if (layer instanceof L.Circle) {
          const center = layer.getLatLng();
          const radius = layer.getRadius();
          coordinates = {
            type: "Point",
            coordinates: [center.lng, center.lat],
            radius: radius,
          };
        } else if (layer instanceof L.Rectangle) {
          const bounds = layer.getBounds();
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          coordinates = {
            type: "Polygon",
            coordinates: [
              [
                [sw.lng, sw.lat],
                [ne.lng, sw.lat],
                [ne.lng, ne.lat],
                [sw.lng, ne.lat],
                [sw.lng, sw.lat],
              ],
            ],
          };
        }

        if (coordinates && onGeofenceDrawn) {
          onGeofenceDrawn(coordinates);
        }
      };

      mapInstanceRef.current.on(L.Draw.Event.CREATED, handleDrawCreated);

      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.off(L.Draw.Event.CREATED, handleDrawCreated);
        }
      };
    }
  }, [showDrawingTools, onGeofenceDrawn]);

  const getGeofenceColor = (type: string) => {
    switch (type) {
      case "transmission_line":
        return "#FF6B35";
      case "substation": 
        return "#2196F3";
      case "restricted_area":
        return "#F44336";
      case "maintenance_zone":
        return "#FF9800";
      case "safety_zone":
        return "#4CAF50";
      default:
        return "#9E9E9E";
    }
  };

  const formatGeofenceType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" />
      <style dangerouslySetInnerHTML={{
        __html: `
          .current-location-marker {
            background: transparent;
            border: none;
          }
          .leaflet-draw-toolbar a {
            background-color: white;
            border-color: #ddd;
          }
          .leaflet-draw-toolbar a:hover {
            background-color: #f5f5f5;
          }
        `
      }} />
    </div>
  );
}
