# Changelog

All notable changes to GenAI Studio Preview Tool will be documented in this file.

## [1.2.0] - 2026-01-25

### Core Engine Integration
- **Server Entry Refactor**: Extension now uses proper Vite API with plugin injection instead of raw `npx vite`.
- **GenAI Mocking**: `@google/genai` is now correctly aliased to `core/mocks/genai.ts` in all contexts.

### API Shims
- **OpenStreetMap/Leaflet**: New shim intercepts `@googlemaps/js-api-loader` and provides Leaflet-backed Map, Marker, LatLng.
- **Geolocation**: Enhanced with passthrough/mock/prompt modes.

### Quality
- **Project Validation**: "Add Project" now validates for `package.json`.
- **Unit Tests**: Added tests for GenAI mock (content, streaming, tools) and config system (file loading, env overrides).
- **CI Workflow**: GitHub Actions for build, test, and Docker push.

### Documentation
- **README**: Updated with API shims table and Docker services documentation.

## [1.1.0] - 2025-01-25

### UI Overhaul (4-Panel Sidebar)
- **Active Previews**: New top panel showing running projects with live **QR Codes** for instant mobile testing. Includes Stop button.
- **Favorites**: Starred projects list for quick access. Toggle via context menu or command.
- **Recent Projects**: Auto-tracked history of recently used projects.
- **Configuration**: Dedicated webview panel for per-project settings (Port, AI Mode, Endpoint, Model).
- **New Icon**: Updated sidebar icon to `$(lightbulb-sparkle)` ✨.

### Mobile Support
- **QR Code Generation**: Automatically generates LAN-accessible QR codes for testing on mobile devices.
- **Network Passthrough**: Exposes local server to network IP.

### Licensing
- **Polyform Noncommercial 1.0.0**: Changed license to allow free personal/open-source use, but require commercial license for business use.

## [1.0.0] - 2025-01-25

### Core Features
- **Project Discovery**: Auto-detects AI Studio projects in workspace.
- **GenAI Mock**: Full SDK mock with streaming, tools, and embeddings.
- **Local AI Support**: Route to Ollama/LFM via OpenAI-compatible API.
- **Docker Integration**: CPU/GPU profiles for local model serving.
