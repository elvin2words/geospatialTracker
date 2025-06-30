import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            console.log(`Reconnecting... (attempt ${reconnectAttempts.current})`);
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }
  };

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case "location_update":
        // Invalidate location-related queries
        queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
        break;

      case "geofence_event":
        // Show toast notification for geofence events
        const { data } = message;
        toast({
          title: "Geofence Event",
          description: `Device ${data.eventType === "entry" ? "entered" : "exited"} ${data.geofence?.name}`,
        });
        
        // Invalidate events queries
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        break;

      case "geofence_created":
      case "geofence_updated":
      case "geofence_deleted":
        // Invalidate geofences queries
        queryClient.invalidateQueries({ queryKey: ["/api/geofences"] });
        
        if (message.type === "geofence_created") {
          toast({
            title: "Geofence Created",
            description: `New geofence "${message.data.name}" has been created`,
          });
        }
        break;

      case "device_created":
        // Invalidate devices queries
        queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
        toast({
          title: "Device Added",
          description: `New device "${message.data.name}" has been added`,
        });
        break;

      case "battery_update":
        // Invalidate devices queries for battery level updates
        queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
        
        // Show low battery warning
        if (message.data.batteryLevel <= 20) {
          toast({
            title: "Low Battery Warning",
            description: `Device battery is at ${message.data.batteryLevel}%`,
            variant: "destructive",
          });
        }
        break;

      case "offline_sync":
        // Show sync completion notification
        toast({
          title: "Data Synchronized",
          description: `${message.data.count} offline records synchronized`,
        });
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        break;

      default:
        console.log("Unknown WebSocket message type:", message.type);
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected. Message not sent:", message);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnecting");
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  // Initialize connection
  useEffect(() => {
    connect();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isConnected) {
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      disconnect();
    };
  }, []);

  // Ping to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: "ping", data: {} });
      }
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected]);

  return {
    isConnected,
    sendMessage,
    connect,
    disconnect,
  };
}
