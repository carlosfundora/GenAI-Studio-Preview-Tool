/**
 * Geolocation Shim for GenAI Studio Preview
 *
 * Provides three modes:
 * - passthrough: Use real browser GPS
 * - mock: Return configured coordinates
 * - prompt: Ask user before using location
 *
 * This file is injected into preview pages and runs in the browser.
 */

// Configuration is injected by the build process
declare const __GENAI_PREVIEW_CONFIG__: {
  location: {
    mode: "passthrough" | "mock" | "prompt";
    mockCoords?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
  };
};

(function initGeolocationShim() {
  // Check if we have injected config
  const config =
    typeof __GENAI_PREVIEW_CONFIG__ !== "undefined"
      ? __GENAI_PREVIEW_CONFIG__
      : { location: { mode: "passthrough" as const } };

  if (!navigator.geolocation) {
    console.warn("[GenAI Preview] Geolocation not available in this browser");
    return;
  }

  const originalGetCurrentPosition =
    navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  const originalWatchPosition = navigator.geolocation.watchPosition.bind(
    navigator.geolocation,
  );

  function getMockPosition(): GeolocationPosition {
    const coords = config.location.mockCoords || {
      latitude: 0,
      longitude: 0,
      accuracy: 100,
    };
    return {
      coords: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || 100,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition;
  }

  if (config.location.mode === "passthrough") {
    console.log(
      "[GenAI Preview] Geolocation: Passthrough mode (using real GPS)",
    );
    return;
  }

  if (config.location.mode === "mock") {
    console.log(
      "[GenAI Preview] Geolocation: Mock mode",
      config.location.mockCoords,
    );

    navigator.geolocation.getCurrentPosition = (
      success: PositionCallback,
      error?: PositionErrorCallback | null,
      options?: PositionOptions,
    ) => {
      setTimeout(() => success(getMockPosition()), 100);
    };

    navigator.geolocation.watchPosition = (
      success: PositionCallback,
      error?: PositionErrorCallback | null,
      options?: PositionOptions,
    ): number => {
      const id = window.setInterval(() => success(getMockPosition()), 1000);
      return id;
    };

    return;
  }

  if (config.location.mode === "prompt") {
    console.log("[GenAI Preview] Geolocation: Prompt mode");
    // In prompt mode, we let the browser's native permission prompt handle it
    // This is the default behavior, so no changes needed
  }
})();

export { };
