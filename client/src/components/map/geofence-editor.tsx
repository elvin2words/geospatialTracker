import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X, MapPin } from "lucide-react";

interface GeofenceEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (geofence: any) => void;
  editingGeofence?: any;
  drawnCoordinates?: any;
}

export default function GeofenceEditor({
  isOpen,
  onClose,
  onSave,
  editingGeofence,
  drawnCoordinates
}: GeofenceEditorProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    description: "",
    coordinates: null as any,
    expiresAt: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when editing geofence changes
  useEffect(() => {
    if (editingGeofence) {
      setFormData({
        name: editingGeofence.name || "",
        type: editingGeofence.type || "",
        description: editingGeofence.description || "",
        coordinates: editingGeofence.coordinates || null,
        expiresAt: editingGeofence.expiresAt ? 
          new Date(editingGeofence.expiresAt).toISOString().split('T')[0] : "",
      });
    } else {
      setFormData({
        name: "",
        type: "",
        description: "",
        coordinates: null,
        expiresAt: "",
      });
    }
    setErrors({});
  }, [editingGeofence]);

  // Update coordinates when drawn
  useEffect(() => {
    if (drawnCoordinates) {
      setFormData(prev => ({ ...prev, coordinates: drawnCoordinates }));
    }
  }, [drawnCoordinates]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.type) {
      newErrors.type = "Type is required";
    }

    if (!formData.coordinates) {
      newErrors.coordinates = "Please draw the geofence area on the map";
    }

    if (formData.expiresAt) {
      const expiryDate = new Date(formData.expiresAt);
      const today = new Date();
      if (expiryDate <= today) {
        newErrors.expiresAt = "Expiry date must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const geofenceData = {
      ...formData,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
    };

    onSave(geofenceData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const getCoordinatesDisplay = () => {
    if (!formData.coordinates) return "No area drawn";

    if (formData.coordinates.type === "Polygon") {
      const coords = formData.coordinates.coordinates[0];
      return `Polygon with ${coords.length - 1} points`;
    } else if (formData.coordinates.type === "Point") {
      return `Circle with radius ${Math.round(formData.coordinates.radius || 0)}m`;
    }

    return "Unknown shape";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {editingGeofence ? "Edit Geofence" : "Create New Geofence"}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter geofence name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type">Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => handleInputChange("type", value)}
              >
                <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select geofence type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transmission_line">Transmission Line</SelectItem>
                  <SelectItem value="substation">Substation</SelectItem>
                  <SelectItem value="construction_zone">Construction Zone</SelectItem>
                  <SelectItem value="restricted_area">Restricted Area</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-500 mt-1">{errors.type}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="expiresAt">Expiry Date (Optional)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => handleInputChange("expiresAt", e.target.value)}
                className={errors.expiresAt ? "border-red-500" : ""}
              />
              {errors.expiresAt && (
                <p className="text-sm text-red-500 mt-1">{errors.expiresAt}</p>
              )}
            </div>

            <div>
              <Label>Geofence Area</Label>
              <div className={`p-3 border rounded-lg ${errors.coordinates ? "border-red-500" : "border-border"}`}>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {getCoordinatesDisplay()}
                  </span>
                </div>
                {!formData.coordinates && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Use the drawing tools on the map to create the geofence area
                  </p>
                )}
              </div>
              {errors.coordinates && (
                <p className="text-sm text-red-500 mt-1">{errors.coordinates}</p>
              )}
            </div>

            <div className="flex space-x-2 pt-4">
              <Button type="submit" className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {editingGeofence ? "Update" : "Create"} Geofence
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
