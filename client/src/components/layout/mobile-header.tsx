import { Menu, User, Wifi, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="md:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-border p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onMenuClick}
          className="p-2"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">GeoTracker Pro</h1>
      </div>
      
      <div className="flex items-center space-x-2">
        <Badge 
          variant={isOnline ? "default" : "destructive"}
          className={cn(
            "text-xs",
            !isOnline && "animate-pulse"
          )}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3 mr-1" />
              Online
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 mr-1" />
              Offline
            </>
          )}
        </Badge>
        
        <Button variant="ghost" size="sm" className="p-2">
          <User className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
