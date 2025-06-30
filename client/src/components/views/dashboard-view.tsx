import { Activity, MapPin, Route, WifiOff, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export default function DashboardView() {
  // Fetch dashboard statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  // Fetch recent events
  const { data: recentEvents } = useQuery({
    queryKey: ["/api/events", { limit: 5 }],
    refetchInterval: 10000,
  });

  // Fetch devices
  const { data: devices } = useQuery({
    queryKey: ["/api/devices"],
    refetchInterval: 30000,
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getDeviceStatus = (device: any) => {
    if (!device.lastSeen) return "offline";
    const lastSeen = new Date(device.lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    return diffMinutes <= 5 ? "online" : "offline";
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return "text-green-600";
    if (level > 20) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-border px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Monitor fleet activity and geofence events</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <Select defaultValue="24h">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button>Export Report</Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Devices</p>
                  <p className="text-2xl font-bold text-foreground">
                    {devices?.filter((d: any) => getDeviceStatus(d) === "online").length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-green-600 text-sm font-medium">12%</span>
                <span className="text-muted-foreground text-sm ml-2">vs last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Geofence Events</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.totalEvents || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="w-4 h-4 text-orange-600 mr-1" />
                <span className="text-orange-600 text-sm font-medium">8%</span>
                <span className="text-muted-foreground text-sm ml-2">vs last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.avgDuration ? formatDuration(Math.round(stats.avgDuration)) : "0m"}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Route className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingDown className="w-4 h-4 text-blue-600 mr-1" />
                <span className="text-blue-600 text-sm font-medium">5%</span>
                <span className="text-muted-foreground text-sm ml-2">vs last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Offline Events</p>
                  <p className="text-2xl font-bold text-foreground">
                    {devices?.filter((d: any) => getDeviceStatus(d) === "offline").length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                  <WifiOff className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                <span className="text-red-600 text-sm font-medium">23%</span>
                <span className="text-muted-foreground text-sm ml-2">vs last week</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Chart Placeholder */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Activity Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Interactive chart showing device activity over time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEvents?.map((event: any) => (
                  <div key={event.id} className="flex items-start space-x-3">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${
                      event.eventType === "entry" ? "bg-orange-500" : "bg-green-500"
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {event.device?.name} {event.eventType === "entry" ? "entered" : "exited"} {event.geofence?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(event.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                
                {(!recentEvents || recentEvents.length === 0) && (
                  <p className="text-sm text-muted-foreground">No recent events</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device Status Table */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Device Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Device</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Battery</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Seen</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices?.map((device: any) => {
                    const status = getDeviceStatus(device);
                    return (
                      <tr key={device.id} className="border-b border-border">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                              <Activity className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{device.name}</div>
                              <div className="text-sm text-muted-foreground">ID: {device.deviceId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant={status === "online" ? "default" : "secondary"}>
                            {status === "online" ? "Online" : "Offline"}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-muted rounded-full">
                              <div 
                                className={`h-2 rounded-full ${getBatteryColor(device.batteryLevel || 0).replace('text', 'bg')}`}
                                style={{ width: `${device.batteryLevel || 0}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm ${getBatteryColor(device.batteryLevel || 0)}`}>
                              {device.batteryLevel || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          {device.lastSeen ? formatTimestamp(device.lastSeen) : "Never"}
                        </td>
                        <td className="py-4 px-4">
                          <Button variant="ghost" size="sm">View</Button>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {(!devices || devices.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No devices found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
