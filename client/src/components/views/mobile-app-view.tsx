import { useState, useEffect } from "react";
import { MapPin, Layers, Plus, Minus, Crosshair, Navigation, Target, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InteractiveMap from "@/components/map/interactive-map";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function MobileAppView() {
  const [mapZoom, setMapZoom] = useState(13);
  const [showCurrentLocation, setShowCurrentLocation] = useState(true);
  const [selectedGeofence, setSelectedGeofence] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const { location, accuracy, isTracking, startTracking, stopTracking } = useGeolocation();

  // Fetch recent events
  const { data: recentEvents } = useQuery({
    queryKey: ["/api/events", { limit: 10 }],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch active geofences
  const { data: geofences } = useQuery({
    queryKey: ["/api/geofences"],
  });

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "transmission_line": return "bg-orange-500";
      case "substation": return "bg-blue-500";
      case "restricted_area": return "bg-red-500";
      case "maintenance_zone": return "bg-yellow-500";
      case "safety_zone": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const handleGeofenceClick = (geofence: any) => {
    setSelectedGeofence(geofence);
    if (geofence.coordinates) {
      if (geofence.coordinates.type === 'Point') {
        setMapCenter([geofence.coordinates.coordinates[1], geofence.coordinates.coordinates[0]]);
        setMapZoom(16);
      } else if (geofence.coordinates.coordinates) {
        const coords = geofence.coordinates.coordinates[0];
        const lat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
        const lng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
        setMapCenter([lat, lng]);
        setMapZoom(15);
      }
    }
  };

  useEffect(() => {
    if (location) {
      setMapCenter([location.latitude, location.longitude]);
    }
  }, [location]);

  useEffect(() => {
    if (!isTracking) {
      startTracking();
    }
  }, [isTracking, startTracking]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Desktop Header */}
      <div className="hidden md:block bg-white dark:bg-gray-800 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mobile Application</h1>
            <p className="text-muted-foreground">Real-time location tracking and offline synchronization</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-sm">
              <MapPin className="w-4 h-4 mr-1" />
              {isTracking ? "Tracking Active" : "Tracking Inactive"}
            </Badge>
            <Badge variant={navigator.onLine ? "default" : "destructive"} className="text-sm">
              {navigator.onLine ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Map Container */}
        <div className="flex-1 relative">
          <InteractiveMap
            center={mapCenter}
            zoom={mapZoom}
            currentLocation={location}
            geofences={(geofences || []) as any[]}
            showCurrentLocation={showCurrentLocation}
          />

          {/* Map Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
            <Button
              size="sm"
              variant="outline"
              className="w-10 h-10 p-0 bg-white dark:bg-gray-800 shadow-md"
              onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))}
            >
              <Plus className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className="w-10 h-10 p-0 bg-white dark:bg-gray-800 shadow-md"
              onClick={() => setMapZoom(prev => Math.max(prev - 1, 1))}
            >
              <Minus className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className="w-10 h-10 p-0 bg-white dark:bg-gray-800 shadow-md"
              onClick={() => setShowCurrentLocation(prev => !prev)}
            >
              <Crosshair className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className="w-10 h-10 p-0 bg-white dark:bg-gray-800 shadow-md"
            >
              <Layers className="w-4 h-4" />
            </Button>
          </div>

          {/* Mobile Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-lg md:hidden">
            <div className="p-4">
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4"></div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Location Status</h3>
                <Badge variant={isTracking ? "default" : "secondary"}>
                  {isTracking ? "Tracking" : "Stopped"}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Location:</span>
                  <span className="font-medium text-sm">
                    {location ? formatCoordinates(location.latitude, location.longitude) : "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accuracy:</span>
                  <span className="font-medium">±{accuracy || 0}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Update:</span>
                  <span className="font-medium">
                    {location ? formatTimestamp(new Date().toISOString()) : "Never"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Side Panel */}
        <div className="hidden lg:block w-80 bg-white dark:bg-gray-800 border-l border-border">
          <div className="p-6">
            <Tabs defaultValue="location" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="location">Location</TabsTrigger>
                <TabsTrigger value="geofences">Geofences</TabsTrigger>
              </TabsList>
              
              <TabsContent value="location" className="space-y-4">
                {/* Current Position */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-foreground mb-2">Current Position</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Latitude:</span>
                        <span className="font-medium">
                          {location ? `${location.latitude.toFixed(6)}°` : "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Longitude:</span>
                        <span className="font-medium">
                          {location ? `${location.longitude.toFixed(6)}°` : "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span className="font-medium">±{accuracy || 0}m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tracking:</span>
                        <span className={cn(
                          "font-medium",
                          isTracking ? "text-green-600" : "text-red-600"
                        )}>
                          {isTracking ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      {isTracking ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={stopTracking}
                          className="flex-1"
                        >
                          Stop Tracking
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={startTracking}
                          className="flex-1"
                        >
                          Start Tracking
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Events */}
                <div>
                  <h4 className="font-medium text-foreground mb-3">Recent Events</h4>
                  <div className="space-y-3">
                    {Array.isArray(recentEvents) && recentEvents.slice(0, 5).map((event: any) => (
                      <div key={event.id} className="flex items-start space-x-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-2",
                          event.eventType === "entry" ? "bg-orange-500" : "bg-green-500"
                        )}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {event.eventType === "entry" ? "Entered" : "Exited"} {event.geofence?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {(!recentEvents || !Array.isArray(recentEvents) || recentEvents.length === 0) && (
                      <p className="text-sm text-muted-foreground">No recent events</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="geofences" className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-3">Active Geofences</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {Array.isArray(geofences) && geofences.map((geofence: any) => (
                      <Card 
                        key={geofence.id} 
                        className={`p-3 cursor-pointer transition-all hover:shadow-md ${selectedGeofence?.id === geofence.id ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => handleGeofenceClick(geofence)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${getTypeColor(geofence.type)}`} />
                              <h5 className="font-medium text-sm">{geofence.name}</h5>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {geofence.type.replace('_', ' ')}
                            </p>
                            {geofence.coordinates?.type === "Point" && (
                              <p className="text-xs text-muted-foreground">
                                {formatCoordinates(geofence.coordinates.coordinates[1], geofence.coordinates.coordinates[0])}
                              </p>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => handleGeofenceClick(geofence)}>
                            <Target className="w-3 h-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                    
                    {(!geofences || !Array.isArray(geofences) || geofences.length === 0) && (
                      <p className="text-sm text-muted-foreground">No geofences available</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
