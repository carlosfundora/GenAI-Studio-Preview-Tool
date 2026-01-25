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
### 1. Configure the Extension
Go to **Settings** (`Ctrl+,`) and search for `GenAI`. Configure your local AI backend:
- **AI > Endpoint**: The URL of your local inference server (e.g., `http://localhost:11434/v1` for Ollama).
- **AI > Mode**: Set to `local` if you want to use the inference server by default.

### 2. Launch a Preview
```bash
# From your AI Studio project
npx genai-studio-preview

# Or with the VS Code extension
# Ctrl+Shift+P → "GenAI Studio: Add Project"
```

## Configuring Local AI Backend

To use a local LLM (like Llama 3 or Qwen 2.5) instead of the mock backend:

1.  **Install Ollama**: [https://ollama.com](https://ollama.com)
2.  **Pull a Model**:
    ```bash
    ollama pull qwen2.5:1.5b
    ```
3.  **Configure Extension**:
    - Set `Genai Preview > AI: Endpoint` to `http://localhost:11434/v1`
    - Set `Genai Preview > AI: Model` to `qwen2.5:1.5b`
4.  **Verify**:
    - Launch a project.
    - Change "AI Mode" to **Local** in the configuration panel.
    - Generate text in your app. It should now stream from Ollama.

## Configuration

Create `.genairc.json` in your project for per-project overrides:

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
