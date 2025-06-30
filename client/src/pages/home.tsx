import { useState } from "react";
import Sidebar from "@/components/layout/sidebar"; 
import MobileHeader from "@/components/layout/mobile-header";
import MobileAppView from "@/components/views/mobile-app-view";
import DashboardView from "@/components/views/dashboard-view";
import AdminPortalView from "@/components/views/admin-portal-view";
import GeofencesView from "@/components/views/geofences-view";
import ReportsView from "@/components/views/reports-view";
import { useWebSocket } from "@/hooks/use-websocket";

export type ViewType = "mobile" | "dashboard" | "admin" | "geofences" | "reports";

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>("mobile");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Initialize WebSocket connection for real-time updates
  useWebSocket();

  const renderCurrentView = () => {
    switch (currentView) {
      case "mobile":
        return <MobileAppView />;
      case "dashboard":
        return <DashboardView />;
      case "admin":
        return <AdminPortalView />;
      case "geofences":
        return <GeofencesView />;
      case "reports":
        return <ReportsView />;
      default:
        return <MobileAppView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900">
      <MobileHeader 
        onMenuClick={() => setIsMobileSidebarOpen(true)} 
      />
      
      <Sidebar 
        currentView={currentView}
        onViewChange={setCurrentView}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        {renderCurrentView()}
      </main>
    </div>
  );
}
