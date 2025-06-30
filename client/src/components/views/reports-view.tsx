import { useState } from "react";
import { Download, FileText, Calendar, TrendingUp, TrendingDown, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export default function ReportsView() {
  const [dateRange, setDateRange] = useState("7d");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [geofenceFilter, setGeofenceFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");

  // Fetch report data
  const { data: events } = useQuery({
    queryKey: ["/api/events", { limit: 100 }],
  });

  const { data: devices } = useQuery({
    queryKey: ["/api/devices"],
  });

  const { data: geofences } = useQuery({
    queryKey: ["/api/geofences"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  // Filter events based on current filters
  const filteredEvents = events?.filter((event: any) => {
    const matchesDevice = deviceFilter === "all" || event.deviceId.toString() === deviceFilter;
    const matchesGeofence = geofenceFilter === "all" || event.geofenceId.toString() === geofenceFilter;
    const matchesEventType = eventFilter === "all" || event.eventType === eventFilter;
    return matchesDevice && matchesGeofence && matchesEventType;
  }) || [];

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "entry": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "exit": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    // Mock export functionality
    const filename = `geofence_report_${new Date().toISOString().split('T')[0]}.${format}`;
    console.log(`Exporting ${filename}`);
    // In a real app, this would trigger the actual export
  };

  // Calculate summary stats for filtered data
  const summaryStats = {
    totalEvents: filteredEvents.length,
    avgDuration: filteredEvents
      .filter((e: any) => e.duration)
      .reduce((acc: number, e: any) => acc + (e.duration || 0), 0) / 
      Math.max(filteredEvents.filter((e: any) => e.duration).length, 1),
    mostActiveZone: geofences?.find((g: any) => 
      g.id === filteredEvents
        .reduce((acc: any, e: any) => {
          acc[e.geofenceId] = (acc[e.geofenceId] || 0) + 1;
          return acc;
        }, {})
        .entries()
        .sort(([,a]: any, [,b]: any) => b - a)[0]?.[0]
    )?.name || "No data"
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-border px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground">Generate detailed reports and insights</p>
          </div>
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            Create Report
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Report Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Device</label>
                <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Devices</SelectItem>
                    {devices?.map((device: any) => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Geofence</label>
                <Select value={geofenceFilter} onValueChange={setGeofenceFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Geofences</SelectItem>
                    {geofences?.map((geofence: any) => (
                      <SelectItem key={geofence.id} value={geofence.id.toString()}>
                        {geofence.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Event Type</label>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="entry">Entry</SelectItem>
                    <SelectItem value="exit">Exit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                  <p className="text-3xl font-bold text-foreground">{summaryStats.totalEvents}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-green-600 text-sm font-medium flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  15%
                </span>
                <span className="text-muted-foreground text-sm ml-2">vs previous period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Duration</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatDuration(Math.round(summaryStats.avgDuration || 0))}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-red-600 text-sm font-medium flex items-center">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  8%
                </span>
                <span className="text-muted-foreground text-sm ml-2">vs previous period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Most Active Zone</p>
                  <p className="text-lg font-bold text-foreground">{summaryStats.mostActiveZone}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-orange-600 text-sm font-medium">
                  {filteredEvents.length} events
                </span>
                <span className="text-muted-foreground text-sm ml-2">this period</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Events Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Event Details</CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Timestamp</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Device</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Event</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Geofence</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Duration</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event: any) => {
                    const device = devices?.find((d: any) => d.id === event.deviceId);
                    const geofence = geofences?.find((g: any) => g.id === event.geofenceId);
                    
                    return (
                      <tr key={event.id} className="border-b border-border">
                        <td className="py-4 px-4 text-sm text-foreground">
                          {formatTimestamp(event.timestamp)}
                        </td>
                        <td className="py-4 px-4 text-sm text-foreground">
                          {device?.name || `Device ${event.deviceId}`}
                        </td>
                        <td className="py-4 px-4">
                          <Badge className={getEventTypeColor(event.eventType)}>
                            {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-sm text-foreground">
                          {geofence?.name || "Unknown"}
                        </td>
                        <td className="py-4 px-4 text-sm text-foreground">
                          {formatDuration(event.duration)}
                        </td>
                        <td className="py-4 px-4 text-sm text-foreground">
                          {parseFloat(event.latitude).toFixed(4)}, {parseFloat(event.longitude).toFixed(4)}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {filteredEvents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No events found for the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredEvents.length > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  Showing {filteredEvents.length} of {events?.length || 0} results
                </span>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" disabled>Previous</Button>
                  <Button size="sm">1</Button>
                  <Button variant="outline" size="sm" disabled>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
