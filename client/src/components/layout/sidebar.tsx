import { MapPin, BarChart3, Settings, Zap, FileText, Wifi, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";
import type { ViewType } from "@/pages/home";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ currentView, onViewChange, isMobileOpen, onMobileClose }: SidebarProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineDataCount, setOfflineDataCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check offline data count
    const checkOfflineData = () => {
      const offlineData = localStorage.getItem('offline_locations');
      if (offlineData) {
        try {
          const data = JSON.parse(offlineData);
          setOfflineDataCount(Array.isArray(data) ? data.length : 0);
        } catch (e) {
          setOfflineDataCount(0);
        }
      } else {
        setOfflineDataCount(0);
      }
    };

    checkOfflineData();
    const interval = setInterval(checkOfflineData, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const navigation = [
    { id: "mobile", label: "Mobile App", icon: MapPin },
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "admin", label: "Admin Portal", icon: Settings },
    { id: "geofences", label: "Geofences", icon: Zap },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  const handleViewChange = (view: ViewType) => {
    onViewChange(view);
    onMobileClose();
  };

  return (
    <aside className={cn(
      "sidebar-transition fixed md:relative z-30 bg-white dark:bg-gray-800 w-64 h-full md:h-screen shadow-lg",
      "transform md:translate-x-0",
      isMobileOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="hidden md:block">
            <h2 className="text-xl font-bold text-foreground">GeoTracker Pro</h2>
            <p className="text-sm text-muted-foreground">Fleet Management</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleViewChange(item.id as ViewType)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-muted rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm font-medium text-foreground">System Status</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isOnline ? "Online" : "Offline"}
          </p>
          {offlineDataCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Offline data: {offlineDataCount} records
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
