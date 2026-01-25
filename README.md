# GenAI Studio Preview

Preview AI Studio prototypes locally with zero modifications. Mocks the GenAI SDK, supports local LLMs (Ollama/LFM), and enables mobile testing via QR codes.

## Features

- **Zero-Config Preview**: Just run and your AI Studio app works
- **Mobile Testing**: **QR Code** in sidebar for instant phone access
- **4-Panel Sidebar**:
  - ✨ **Active**: Live previews with QR codes
  - ⭐ **Favorites**: Pinned projects
  - 🕒 **Recents**: History
  - ⚙️ **Config**: Per-project settings (Port, AI Mode, Model)
- **GenAI SDK Mock**: Full enum support, streaming, tool calls, embeddings
- **Local AI Support**: Route to Ollama, LFM, or any OpenAI-compatible endpoint

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
      "text": "LFM2.5-1.2B-Instruct"
    }
  }
}
```

## Docker

```bash
# CPU-only
docker-compose --profile cpu up

# With GPU (NVIDIA)
docker-compose --profile gpu up
```

## IDE Extension

Install from VSIX or OpenVSX:

```bash
code --install-extension genai-studio-preview-1.0.0.vsix
```

## License

MIT
