# GenAI Studio Preview Tool

Preview AI Studio prototypes locally with zero modifications. Mocks the GenAI SDK, supports local LLMs (Ollama/LFM), and enables mobile testing via QR codes.

## Features

- **Zero-Config Preview**: Just run and your AI Studio app works
- **Mobile Testing**: **QR Code** in sidebar for instant phone access
- **3-Panel Sidebar**:
  - ✨ **Active Previews**: Live previews with QR codes
  - 📁 **Projects**: Favorites + all projects
  - ⚙️ **Configuration**: Per-project settings (Port, AI Mode, Model)
- **GenAI SDK Mock**: Full enum support, streaming, tool calls, embeddings
- **Local AI Support**: Route to Ollama, LFM, or any OpenAI-compatible endpoint
- **API Shims**: Google Maps → OpenStreetMap/Leaflet, Geolocation mock

## Quick Start

```bash
# From your AI Studio project
npx genai-studio-preview

# Or with the VS Code extension
# Ctrl+Shift+P → "GenAI Studio: Launch Preview"
```

## Configuration

Create `.genairc.json` in your project:

```json
{
  "ai": {
    "mode": "local",
    "endpoint": "http://localhost:11434/v1",
    "models": {
      "text": "qwen2.5:1.5b"
    }
  },
  "location": {
    "mode": "mock",
    "mockCoords": { "latitude": 29.9511, "longitude": -90.0715 }
  }
}
```

## Docker (with AI Backend)

The Docker setup includes an Ollama AI backend that automatically downloads models.

```bash
# CPU-only
docker-compose --profile cpu up

# With GPU (NVIDIA)
docker-compose --profile gpu up
```

**Services**:
- `preview-launcher`: Runs the preview server (ports 4000-4010)
- `ai-backend` / `ai-backend-gpu`: Ollama with `qwen2.5:1.5b` and `nomic-embed-text`

## IDE Extension

Install from VSIX or OpenVSX:

```bash
code --install-extension genai-studio-preview-1.1.0.vsix
```

## API Shims

The tool automatically shims these APIs for offline preview:

| Original API                | Shimmed To     | Notes                         |
| --------------------------- | -------------- | ----------------------------- |
| `@google/genai`             | Mock/Local LLM | Full SDK compatibility        |
| `@googlemaps/js-api-loader` | Leaflet + OSM  | Map, Marker, LatLng supported |
| `navigator.geolocation`     | Configurable   | Passthrough, mock, or prompt  |

## License

Polyform Noncommercial 1.0.0
