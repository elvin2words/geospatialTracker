import { useState, useRef } from "react";
import { Plus, Search, Edit, Trash2, MapPin, Upload, Target, Navigation, FileText, Zap, ZapOff, Maximize2, Minimize2, ChevronLeft, ChevronRight, Compass, Eye, EyeOff, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import InteractiveMap from "@/components/map/interactive-map";
import GeofenceEditor from "@/components/map/geofence-editor";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";

export default function GeofencesView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [newGeofence, setNewGeofence] = useState({
    name: "",
    type: "",
    description: "",
    coordinates: null as any
  });
  
  // New state for enhanced features
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const [mapZoom, setMapZoom] = useState(13);
  const [coordinateInput, setCoordinateInput] = useState({ lat: "", lng: "" });
  const [locationSearch, setLocationSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [importedData, setImportedData] = useState<any[]>([]);
  const [autoGeofencing, setAutoGeofencing] = useState(false);
  const [geofenceRadius, setGeofenceRadius] = useState(100);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState({ coordinates: false, search: false, tools: false });
  const [selectedGeofence, setSelectedGeofence] = useState<any>(null);
  const [editingGeofence, setEditingGeofence] = useState<any>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { location, getCurrentPosition } = useGeolocation();

  // Fetch geofences
  const { data: geofences, isLoading } = useQuery({
    queryKey: ["/api/geofences"],
  });

  // Create geofence mutation
  const createGeofenceMutation = useMutation({
    mutationFn: (geofence: any) => apiRequest(`/api/geofences`, "POST", geofence),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/geofences"] });
      setIsCreating(false);
      setEditingGeofence(null);
      setNewGeofence({ name: "", type: "", description: "", coordinates: null });
      toast({ title: editingGeofence ? "Geofence updated successfully" : "Geofence created successfully" });
    },
    onError: () => {
      toast({ title: editingGeofence ? "Failed to update geofence" : "Failed to create geofence", variant: "destructive" });
    }
  });

  // Update geofence mutation
  const updateGeofenceMutation = useMutation({
    mutationFn: ({ id, geofence }: { id: number, geofence: any }) => apiRequest(`/api/geofences/${id}`, "PATCH", geofence),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/geofences"] });
      setIsCreating(false);
      setEditingGeofence(null);
      setNewGeofence({ name: "", type: "", description: "", coordinates: null });
      toast({ title: "Geofence updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update geofence", variant: "destructive" });
    }
  });

  // Delete geofence mutation
  const deleteGeofenceMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/geofences/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/geofences"] });
      toast({ title: "Geofence deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete geofence", variant: "destructive" });
    }
  });

  const filteredGeofences = (geofences || []).filter((geofence: any) => {
    const matchesSearch = geofence.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || geofence.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Combine geofences with imported data for display
  const allGeofences = [...filteredGeofences, ...importedData];

  const getTypeColor = (type: string) => {
    switch (type) {
      case "transmission_line": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "substation": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "restricted_area": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "maintenance_zone": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "safety_zone": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const handleCreateGeofence = () => {
    if (!newGeofence.name || !newGeofence.type) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (!newGeofence.coordinates) {
      toast({ title: "Please draw a geofence on the map", variant: "destructive" });
      return;
    }

    if (editingGeofence) {
      updateGeofenceMutation.mutate({
        id: editingGeofence.id,
        geofence: {
          ...newGeofence,
          createdBy: 1
        }
      });
    } else {
      createGeofenceMutation.mutate({
        ...newGeofence,
        createdBy: 1
      });
    }
  };

  const handleGeofenceDrawn = (coordinates: any) => {
    setNewGeofence(prev => ({ ...prev, coordinates }));
  };

  // New feature functions
  const handleGoToCoordinates = () => {
    const lat = parseFloat(coordinateInput.lat);
    const lng = parseFloat(coordinateInput.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      toast({ title: "Invalid coordinates", description: "Please enter valid latitude and longitude values", variant: "destructive" });
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({ title: "Invalid coordinates", description: "Latitude must be between -90 and 90, longitude between -180 and 180", variant: "destructive" });
      return;
    }
    
    setMapCenter([lat, lng]);
    setMapZoom(15);
    toast({ title: "Location found", description: `Moved to coordinates: ${lat}, ${lng}` });
  };

  const handleFindMyLocation = async () => {
    try {
      const position = await getCurrentPosition();
      setMapCenter([position.latitude, position.longitude]);
      setMapZoom(15);
      toast({ title: "Location found", description: "Moved to your current location" });
    } catch (error) {
      toast({ title: "Location error", description: "Unable to get your current location. Please check location permissions.", variant: "destructive" });
    }
  };

  const handleLocationSearch = async () => {
    if (!locationSearch.trim()) {
      toast({ title: "Search empty", description: "Please enter a location to search", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    try {
      // Using Nominatim (OpenStreetMap) geocoding service
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        setMapCenter([lat, lng]);
        setMapZoom(13);
        toast({ title: "Location found", description: `Found: ${result.display_name}` });
      } else {
        toast({ title: "Location not found", description: "No results found for your search", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Search error", description: "Failed to search for location. Please try again.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let data: any[] = [];

        if (file.name.endsWith('.json')) {
          data = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          data = parseCSV(content);
        } else if (file.name.endsWith('.geojson')) {
          const geoData = JSON.parse(content);
          data = parseGeoJSON(geoData);
        } else {
          toast({ title: "Unsupported format", description: "Please upload a JSON, CSV, or GeoJSON file", variant: "destructive" });
          return;
        }

        setImportedData(data);
        toast({ title: "Data imported", description: `Successfully imported ${data.length} locations` });
        setIsImportDialogOpen(false);

        // Auto-create geofences if enabled
        if (autoGeofencing) {
          createAutoGeofences(data);
        }
      } catch (error) {
        toast({ title: "Import error", description: "Failed to parse file. Please check the format.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (content: string): any[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('title'));
    const latIndex = headers.findIndex(h => h.includes('lat') || h.includes('y'));
    const lngIndex = headers.findIndex(h => h.includes('lng') || h.includes('lon') || h.includes('x'));
    const typeIndex = headers.findIndex(h => h.includes('type') || h.includes('category'));

    if (latIndex === -1 || lngIndex === -1) {
      throw new Error('CSV must contain latitude and longitude columns');
    }

    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const lat = parseFloat(values[latIndex]);
      const lng = parseFloat(values[lngIndex]);

      if (isNaN(lat) || isNaN(lng)) return null;

      return {
        id: `imported_${index}`,
        name: nameIndex >= 0 ? values[nameIndex] : `Imported Location ${index + 1}`,
        type: typeIndex >= 0 ? values[typeIndex] : 'imported',
        coordinates: {
          type: 'Point',
          coordinates: [lng, lat],
          radius: geofenceRadius
        },
        isImported: true
      };
    }).filter(Boolean);
  };

  const parseGeoJSON = (geoData: any): any[] => {
    if (!geoData.features) return [];

    return geoData.features.map((feature: any, index: number) => {
      const properties = feature.properties || {};
      const geometry = feature.geometry;

      if (!geometry || !geometry.coordinates) return null;

      return {
        id: `imported_${index}`,
        name: properties.name || properties.title || `Imported Location ${index + 1}`,
        type: properties.type || properties.category || 'imported',
        coordinates: geometry,
        isImported: true
      };
    }).filter(Boolean);
  };

  const createAutoGeofences = async (data: any[]) => {
    const promises = data.map(item => 
      createGeofenceMutation.mutateAsync({
        name: item.name,
        type: item.type === 'imported' ? 'restricted_area' : item.type,
        description: `Auto-generated from imported data`,
        coordinates: item.coordinates,
        createdBy: 1
      })
    );

    try {
      await Promise.all(promises);
      toast({ title: "Auto-geofencing complete", description: `Created ${data.length} geofences` });
    } catch (error) {
      toast({ title: "Auto-geofencing error", description: "Some geofences could not be created", variant: "destructive" });
    }
  };

  // New helper functions
  const handleGeofenceClick = (geofence: any) => {
    setSelectedGeofence(geofence);
    if (geofence.coordinates) {
      if (geofence.coordinates.type === 'Point') {
        setMapCenter([geofence.coordinates.coordinates[1], geofence.coordinates.coordinates[0]]);
        setMapZoom(16);
      } else if (geofence.coordinates.coordinates) {
        // For polygons, find center
        const coords = geofence.coordinates.coordinates[0];
        const lat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
        const lng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
        setMapCenter([lat, lng]);
        setMapZoom(15);
      }
    }
  };

  const handleEditGeofence = (geofence: any) => {
    setEditingGeofence(geofence);
    setNewGeofence({
      name: geofence.name,
      type: geofence.type,
      description: geofence.description || "",
      coordinates: geofence.coordinates
    });
    setIsCreating(true);
  };

  const getEquipmentTypes = () => {
    const types = [
      { key: "all", label: "All", color: "bg-gray-500", count: allGeofences.length },
      { key: "substation", label: "Substations", color: "bg-blue-500", count: allGeofences.filter(g => g.type === 'substation').length },
      { key: "transmission_line", label: "Transmission Lines", color: "bg-orange-500", count: allGeofences.filter(g => g.type === 'transmission_line').length },
      { key: "restricted_area", label: "Restricted Areas", color: "bg-red-500", count: allGeofences.filter(g => g.type === 'restricted_area').length },
      { key: "maintenance_zone", label: "Maintenance", color: "bg-yellow-500", count: allGeofences.filter(g => g.type === 'maintenance_zone').length },
      { key: "safety_zone", label: "Safety Zones", color: "bg-green-500", count: allGeofences.filter(g => g.type === 'safety_zone').length }
    ];
    return types;
  };

  const toggleControl = (controlName: keyof typeof controlsExpanded) => {
    setControlsExpanded(prev => ({
      ...prev,
      [controlName]: !prev[controlName]
    }));
  };

  return (
    <div className={`flex-1 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : ''}`}>
      {/* Header */}
      <div className="border-b border-border bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Geofence Management</h1>
            <p className="text-muted-foreground">Create and manage geofenced areas</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm"
              variant="outline"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button 
              onClick={() => setIsCreating(!isCreating)}
              variant={isCreating ? "outline" : "default"}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isCreating ? "Cancel" : "Create Geofence"}
            </Button>
          </div>
        </div>

        {/* Equipment Type Pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {getEquipmentTypes().map(type => (
            <Button
              key={type.key}
              size="sm"
              variant={selectedTypeFilter === type.key ? "default" : "outline"}
              onClick={() => setSelectedTypeFilter(type.key)}
              className="relative"
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${type.color}`} />
              {type.label}
              {type.count > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {type.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Map for Geofence Creation */}
        <div className="flex-1 relative">
          <InteractiveMap
            center={mapCenter}
            zoom={mapZoom}
            geofences={selectedTypeFilter === 'all' ? allGeofences : allGeofences.filter(g => g.type === selectedTypeFilter)}
            showDrawingTools={isCreating}
            onGeofenceDrawn={handleGeofenceDrawn}
            currentLocation={location}
            showCurrentLocation={true}
          />

          {/* Collapsible Map Controls */}
          <div className="absolute top-4 left-4 z-20 space-y-2">
            {/* Coordinates Control */}
            <Card className={`transition-all duration-300 ${controlsExpanded.coordinates ? 'p-3 min-w-64' : 'p-2'}`}>
              <div className="flex items-center justify-between">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => toggleControl('coordinates')}
                  className="w-full justify-start"
                >
                  <Target className="w-4 h-4 mr-2" />
                  {controlsExpanded.coordinates ? "Coordinates" : ""}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => toggleControl('coordinates')}
                >
                  {controlsExpanded.coordinates ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
              {controlsExpanded.coordinates && (
                <div className="space-y-2 mt-2">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Latitude"
                      value={coordinateInput.lat}
                      onChange={(e) => setCoordinateInput(prev => ({ ...prev, lat: e.target.value }))}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Longitude"
                      value={coordinateInput.lng}
                      onChange={(e) => setCoordinateInput(prev => ({ ...prev, lng: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                  <Button size="sm" onClick={handleGoToCoordinates} className="w-full">
                    Go to Location
                  </Button>
                </div>
              )}
            </Card>

            {/* Search Control */}
            <Card className={`transition-all duration-300 ${controlsExpanded.search ? 'p-3 min-w-64' : 'p-2'}`}>
              <div className="flex items-center justify-between">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => toggleControl('search')}
                  className="w-full justify-start"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {controlsExpanded.search ? "Search" : ""}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => toggleControl('search')}
                >
                  {controlsExpanded.search ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
              {controlsExpanded.search && (
                <div className="space-y-2 mt-2">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter location name..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleLocationSearch()}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={handleLocationSearch} disabled={isSearching}>
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Navigation Tools */}
            <Card className={`transition-all duration-300 ${controlsExpanded.tools ? 'p-3 min-w-64' : 'p-2'}`}>
              <div className="flex items-center justify-between">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => toggleControl('tools')}
                  className="w-full justify-start"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  {controlsExpanded.tools ? "Tools" : ""}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => toggleControl('tools')}
                >
                  {controlsExpanded.tools ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
              {controlsExpanded.tools && (
                <div className="space-y-2 mt-2">
                  <Button size="sm" onClick={handleFindMyLocation} className="w-full" variant="outline">
                    <Navigation className="w-4 h-4 mr-2" />
                    Find My Location
                  </Button>
                  <Button size="sm" onClick={() => setMapZoom(13)} className="w-full" variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Reset View
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Compass */}
          <div className="absolute top-4 right-4 z-20">
            <Card className="p-3">
              <div className="flex items-center justify-center">
                <Compass className="w-6 h-6 text-muted-foreground" />
              </div>
            </Card>
          </div>

          {/* Sidebar Toggle */}
          {!isFullscreen && (
            <div className="absolute top-1/2 right-0 z-20 transform -translate-y-1/2">
              <Button 
                size="sm"
                variant="outline"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="rounded-l-lg rounded-r-none bg-white dark:bg-gray-800"
              >
                {sidebarCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          )}

          {isCreating && (
            <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 max-w-sm">
              <p className="text-sm text-muted-foreground mb-2">
                Use the drawing tools on the map to create your geofence area
              </p>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <MapPin className="w-4 h-4 mr-2" />
                  Point
                </Button>
                <Button size="sm" variant="outline">
                  Circle
                </Button>
                <Button size="sm" variant="outline">
                  Polygon
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Geofence List Panel */}
        <div className={`${sidebarCollapsed ? 'w-0' : 'w-full lg:w-96'} transition-all duration-300 bg-white dark:bg-gray-800 border-l border-border overflow-hidden`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {isCreating ? "Create New Geofence" : "Geofence Tools"}
              </h3>
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import GIS Data</DialogTitle>
                    <DialogDescription>
                      Upload CSV, JSON, or GeoJSON files with location data. Supported formats include substations, transmission lines, and other infrastructure data.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>File Format Support</Label>
                      <div className="text-sm text-muted-foreground mt-1">
                        <p><strong>CSV:</strong> Must include lat/latitude and lng/longitude columns</p>
                        <p><strong>JSON:</strong> Array of objects with coordinates</p>
                        <p><strong>GeoJSON:</strong> Standard GeoJSON format</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Auto-Geofencing</Label>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={autoGeofencing} 
                          onCheckedChange={setAutoGeofencing}
                        />
                        <span className="text-sm">Automatically create geofences for imported locations</span>
                      </div>
                      {autoGeofencing && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Label className="text-sm">Radius (meters):</Label>
                          <Input
                            type="number"
                            value={geofenceRadius}
                            onChange={(e) => setGeofenceRadius(parseInt(e.target.value) || 100)}
                            className="w-20"
                            min="10"
                            max="10000"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.json,.geojson"
                        onChange={handleFileImport}
                        className="hidden"
                      />
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {isCreating ? (
              /* Create New Geofence Form */
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newGeofence.name}
                    onChange={(e) => setNewGeofence(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter geofence name"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={newGeofence.type}
                    onValueChange={(value) => setNewGeofence(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="substation">Substation</SelectItem>
                      <SelectItem value="transmission_line">Transmission Line</SelectItem>
                      <SelectItem value="restricted_area">Restricted Area</SelectItem>
                      <SelectItem value="maintenance_zone">Maintenance Zone</SelectItem>
                      <SelectItem value="safety_zone">Safety Zone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newGeofence.description}
                    onChange={(e) => setNewGeofence(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button onClick={handleCreateGeofence} disabled={!newGeofence.name || !newGeofence.type}>
                    {editingGeofence ? <Edit className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {editingGeofence ? "Update Geofence" : "Create Geofence"}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsCreating(false);
                    setEditingGeofence(null);
                    setNewGeofence({ name: "", type: "", description: "", coordinates: null });
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* Geofence Management Tabs */
              <Tabs defaultValue="geofences" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="geofences">Geofences</TabsTrigger>
                  <TabsTrigger value="imported">Imported ({importedData.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="geofences" className="space-y-4">
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Search geofences..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="substation">Substation</SelectItem>
                        <SelectItem value="transmission_line">Transmission Line</SelectItem>
                        <SelectItem value="restricted_area">Restricted Area</SelectItem>
                        <SelectItem value="maintenance_zone">Maintenance Zone</SelectItem>
                        <SelectItem value="safety_zone">Safety Zone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {isLoading ? (
                      <div className="text-center text-muted-foreground py-4">Loading...</div>
                    ) : filteredGeofences.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">
                        No geofences found
                      </div>
                    ) : (
                      filteredGeofences.map((geofence: any) => (
                        <Card 
                          key={geofence.id} 
                          className={`p-4 cursor-pointer transition-all hover:shadow-md ${selectedGeofence?.id === geofence.id ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => handleGeofenceClick(geofence)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className={`w-3 h-3 rounded-full ${getEquipmentTypes().find(t => t.key === geofence.type)?.color || 'bg-gray-500'}`} />
                                <h4 className="font-medium text-foreground">{geofence.name}</h4>
                                <Badge className={getTypeColor(geofence.type)}>
                                  {geofence.type.replace('_', ' ')}
                                </Badge>
                              </div>
                              {geofence.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {geofence.description}
                                </p>
                              )}
                              <div className="flex items-center text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3 mr-1" />
                                {geofence.coordinates?.type === "Point" 
                                  ? `${geofence.coordinates.coordinates[1]?.toFixed(4)}, ${geofence.coordinates.coordinates[0]?.toFixed(4)}`
                                  : "Complex shape"
                                }
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditGeofence(geofence);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteGeofenceMutation.mutate(geofence.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="imported" className="space-y-4">
                  {importedData.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No imported data</p>
                      <p className="text-sm">Use the Import button to upload GIS data</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {importedData.length} imported locations
                        </p>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={autoGeofencing} 
                            onCheckedChange={setAutoGeofencing}
                          />
                          <span className="text-sm">Auto-geofence</span>
                          {autoGeofencing ? <Zap className="w-4 h-4 text-blue-500" /> : <ZapOff className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                      
                      {autoGeofencing && (
                        <Button
                          size="sm"
                          onClick={() => createAutoGeofences(importedData)}
                          className="w-full"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Create Geofences for All
                        </Button>
                      )}

                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {importedData.map((item: any, index: number) => (
                          <Card key={item.id || index} className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-sm">{item.name}</h5>
                                <p className="text-xs text-muted-foreground">
                                  {item.type} • {item.coordinates?.coordinates?.[1]?.toFixed(4)}, {item.coordinates?.coordinates?.[0]?.toFixed(4)}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                Imported
                              </Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>

      {/* GeofenceEditor Modal */}
      <GeofenceEditor
        isOpen={false}
        onClose={() => {}}
        onSave={() => {}}
      />
    </div>
  );
}