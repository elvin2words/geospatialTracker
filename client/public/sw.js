const CACHE_NAME = 'geotracker-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/src/main.tsx',
  '/src/index.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
];

const API_CACHE_NAME = 'geotracker-api-v1';
const CACHEABLE_API_ROUTES = [
  '/api/geofences',
  '/api/devices',
  '/api/stats'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Error caching static assets:', error);
      })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim all clients immediately
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets and pages
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // For GET requests to cacheable routes, use stale-while-revalidate
  if (request.method === 'GET' && CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route))) {
    return staleWhileRevalidate(request, API_CACHE_NAME);
  }
  
  // For POST/PUT/DELETE requests, always go to network
  if (request.method !== 'GET') {
    try {
      const response = await fetch(request);
      
      // If successful, update related cache entries
      if (response.ok) {
        await invalidateRelatedCache(url.pathname);
      }
      
      return response;
    } catch (error) {
      console.error('Network request failed:', error);
      
      // For location posts, store offline (handled by the app)
      if (url.pathname === '/api/locations') {
        return new Response(
          JSON.stringify({ error: 'Offline - data will be synced when online' }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw error;
    }
  }
  
  // Default to network-first for other GET requests
  return networkFirst(request, API_CACHE_NAME);
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If not in cache, fetch from network
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Network request failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/') || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    // Silently fail on network errors during revalidation
    console.log('Background fetch failed for:', request.url);
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    // Trigger background update
    fetchPromise;
    return cachedResponse;
  }
  
  // If no cache, wait for network
  try {
    return await fetchPromise;
  } catch (error) {
    console.error('No cache and network failed for:', request.url);
    throw error;
  }
}

// Network-first strategy
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Invalidate related cache entries when data changes
async function invalidateRelatedCache(pathname) {
  const cache = await caches.open(API_CACHE_NAME);
  const keys = await cache.keys();
  
  // Define related routes that should be invalidated
  const invalidationMap = {
    '/api/geofences': ['/api/geofences'],
    '/api/devices': ['/api/devices', '/api/stats'],
    '/api/locations': ['/api/stats'],
    '/api/events': ['/api/events', '/api/stats']
  };
  
  const routesToInvalidate = invalidationMap[pathname] || [];
  
  for (const key of keys) {
    const url = new URL(key.url);
    if (routesToInvalidate.some(route => url.pathname.startsWith(route))) {
      console.log('Invalidating cache for:', key.url);
      await cache.delete(key);
    }
  }
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'offline-location-sync') {
    event.waitUntil(syncOfflineLocations());
  }
});

// Sync offline locations when connectivity returns
async function syncOfflineLocations() {
  try {
    // This would integrate with the app's offline storage
    console.log('Attempting to sync offline locations...');
    
    // Send message to all clients to trigger sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        action: 'SYNC_OFFLINE_DATA'
      });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Handle push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: 'New geofence event detected',
    icon: '/manifest-icon-192.png',
    badge: '/manifest-icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View Details'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;
      options.data = data;
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('GeoTracker Pro', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        // Focus existing window if available
        for (const client of clients) {
          if (client.url === self.registration.scope && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if no existing window
        if (self.clients.openWindow) {
          return self.clients.openWindow(event.notification.data?.url || '/');
        }
      })
    );
  }
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    
    case 'CACHE_INVALIDATE':
      invalidateRelatedCache(event.data.pathname);
      break;
    
    case 'REGISTER_BACKGROUND_SYNC':
      // Register for background sync when offline data is available
      if (self.registration.sync) {
        self.registration.sync.register('offline-location-sync');
      }
      break;
  }
});
