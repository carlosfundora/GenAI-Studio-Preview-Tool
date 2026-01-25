/**
 * OpenStreetMap / Leaflet Shim for Google Maps API
 *
 * This shim intercepts Google Maps API calls and redirects them to
 * OpenStreetMap via Leaflet.js for local preview without API keys.
 *
 * Supports:
 * - @googlemaps/js-api-loader
 * - google.maps namespace
 */

// Note: This is a client-side shim that will be injected into the browser
// It requires Leaflet to be loaded first

// Minimal Leaflet types for internal use
interface LeafletMap {
  setView(center: [number, number], zoom: number): LeafletMap;
  setZoom(zoom: number): LeafletMap;
  getCenter(): { lat: number; lng: number };
  getZoom(): number;
  panTo(center: [number, number]): LeafletMap;
  addTo(map: LeafletMap): void;
}

interface LeafletMarker {
  addTo(map: LeafletMap): void;
  remove(): void;
  setLatLng(latlng: [number, number]): void;
  getLatLng(): { lat: number; lng: number };
}

declare global {
  interface Window {
    L: {
      map(element: HTMLElement): LeafletMap;
      marker(latlng: [number, number]): LeafletMarker;
      tileLayer(url: string, options?: any): { addTo(map: LeafletMap): void };
    };
    google: {
      maps: any;
    };
  }
}

/**
 * Leaflet-backed Map class that mimics google.maps.Map
 */
class LeafletMapWrapper {
  private map: LeafletMap;
  private container: HTMLElement;

  constructor(container: HTMLElement, options?: any) {
    this.container = container;

    const center = options?.center as { lat: number; lng: number } | undefined;
    const zoom = options?.zoom || 13;

    this.map = window.L.map(container).setView(
      [center?.lat || 0, center?.lng || 0],
      zoom,
    );

    // Add OpenStreetMap tile layer
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    console.warn(
      "[GenAI Preview] Google Maps shimmed with OpenStreetMap/Leaflet",
    );
  }

  setCenter(latLng: { lat: number; lng: number } | any): void {
    const lat = typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
    const lng = typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;
    this.map.setView([lat, lng], this.map.getZoom());
  }

  setZoom(zoom: number): void {
    this.map.setZoom(zoom);
  }

  getCenter(): { lat: () => number; lng: () => number } {
    const center = this.map.getCenter();
    return {
      lat: () => center.lat,
      lng: () => center.lng,
    };
  }

  getZoom(): number {
    return this.map.getZoom();
  }

  panTo(latLng: { lat: number; lng: number }): void {
    this.map.panTo([latLng.lat, latLng.lng]);
  }

  // Return underlying Leaflet map for advanced usage
  getLeafletMap(): LeafletMap {
    return this.map;
  }
}

/**
 * Leaflet-backed Marker class
 */
class LeafletMarkerWrapper {
  private marker: LeafletMarker;

  constructor(options?: {
    position?: { lat: number; lng: number };
    map?: LeafletMapWrapper;
  }) {
    const pos = options?.position || { lat: 0, lng: 0 };
    this.marker = window.L.marker([pos.lat, pos.lng]);

    if (options?.map) {
      this.marker.addTo(options.map.getLeafletMap());
    }
  }

  setPosition(latLng: { lat: number; lng: number }): void {
    this.marker.setLatLng([latLng.lat, latLng.lng]);
  }

  setMap(map: LeafletMapWrapper | null): void {
    if (map) {
      this.marker.addTo(map.getLeafletMap());
    } else {
      this.marker.remove();
    }
  }

  getPosition(): { lat: () => number; lng: () => number } {
    const pos = this.marker.getLatLng();
    return {
      lat: () => pos.lat,
      lng: () => pos.lng,
    };
  }
}

/**
 * LatLng class
 */
class LatLng {
  private _lat: number;
  private _lng: number;

  constructor(lat: number, lng: number) {
    this._lat = lat;
    this._lng = lng;
  }

  lat(): number {
    return this._lat;
  }

  lng(): number {
    return this._lng;
  }

  toJSON(): { lat: number; lng: number } {
    return { lat: this._lat, lng: this._lng };
  }
}

/**
 * Google Maps API Loader shim
 */
export class Loader {
  private options: { apiKey?: string; version?: string };

  constructor(options: { apiKey?: string; version?: string }) {
    this.options = options;
    console.warn(
      "[GenAI Preview] @googlemaps/js-api-loader shimmed - using OpenStreetMap",
    );
  }

  async load(): Promise<typeof GoogleMapsShim> {
    // Ensure Leaflet is loaded
    if (!window.L) {
      await this.loadLeaflet();
    }
    return GoogleMapsShim;
  }

  async loadLeaflet(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Load Leaflet CSS
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);

      // Load Leaflet JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}

/**
 * Main shim namespace matching google.maps
 */
export const GoogleMapsShim = {
  Map: LeafletMapWrapper,
  Marker: LeafletMarkerWrapper,
  LatLng: LatLng,

  // Stubs for commonly used features
  event: {
    addListener: (instance: any, event: string, handler: Function) => {
      console.warn(
        `[GenAI Preview] google.maps.event.addListener stubbed for: ${event}`,
      );
      return { remove: () => {} };
    },
    addListenerOnce: (instance: any, event: string, handler: Function) => {
      console.warn(`[GenAI Preview] google.maps.event.addListenerOnce stubbed`);
      return { remove: () => {} };
    },
    removeListener: () => {},
    clearInstanceListeners: () => {},
  },

  // Geometry utilities (stubs)
  geometry: {
    spherical: {
      computeDistanceBetween: (from: LatLng, to: LatLng): number => {
        // Haversine formula approximation
        const R = 6371000; // Earth's radius in meters
        const dLat = ((to.lat() - from.lat()) * Math.PI) / 180;
        const dLng = ((to.lng() - from.lng()) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((from.lat() * Math.PI) / 180) *
            Math.cos((to.lat() * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      },
    },
  },
};

// Auto-initialize if in browser context
if (typeof window !== "undefined") {
  (window as any).google = { maps: GoogleMapsShim };
}

export default GoogleMapsShim;
