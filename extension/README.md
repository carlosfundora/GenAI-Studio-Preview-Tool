# GenAI Studio Preview Tool

<div align="center">
  <img src="assets/extension-icon.svg" width="128" alt="GenAI Studio Preview Tool Icon" />
  <h1>GenAI Studio Preview Tool</h1>
  <p><strong>Preview AI Studio prototypes locally. Mock GenAI SDK, local LLMs, and mobile testing.</strong></p>

  [![Version](https://img.shields.io/visual-studio-marketplace/v/carlosfundora.genai-studio-preview?style=flat-square&color=007acc)](https://marketplace.visualstudio.com/items?itemName=carlosfundora.genai-studio-preview)
  [![Installs](https://img.shields.io/visual-studio-marketplace/i/carlosfundora.genai-studio-preview?style=flat-square&color=green)](https://marketplace.visualstudio.com/items?itemName=carlosfundora.genai-studio-preview)
  [![License](https://img.shields.io/github/license/carlosfundora/genai-studio-preview?style=flat-square&color=blue)](LICENSE)
</div>

---

**GenAI Studio Preview Tool** is the ultimate companion for AI Studio prototyping. It allows you to run your prototypes locally without changing a single line of code. It mocks the Google GenAI SDK, redirects AI calls to local offline models (Ollama/LFM), and provides a seamless mobile testing experience via QR codes.

## Features

- **⚡ Zero-Config Preview**: Just run `npx genai-studio-preview` and your app works.
- **📱 Mobile Testing**: Instant **QR Code** in the sidebar to test on your phone.
- **🤖 Local AI Loading**: Route everything to **Ollama**, **LFM**, or **OpenAI**-compatible endpoints.
- **🧠 GenAI SDK Mock**: Complete simulation of the `@google/genai` SDK (streaming, tool calls, embeddings).
- **🗺️ API Shims**: Automatic polyfills for Google Maps (Leaflet/OSM) and Geolocation.
- **🛠️ 3-Panel Sidebar**:
  - **Active Previews**: Manage running servers.
  - **Projects**: Quick access to your favorite prototypes.
  - **Configuration**: Fine-tune ports and AI models per project.

## Installation

Launch VS Code Quick Open (`Ctrl+P`), paste the following command, and press enter:

```bash
ext install carlosfundora.genai-studio-preview
```

## Quick Start

### 1. Launch a Preview
You can launch a preview directly from your project folder:

```bash
# Terminal
npx genai-studio-preview
```

or via the **Command Palette** (`Ctrl+Shift+P`):
> `GenAI Studio: Add Project`

### 2. Configure Local AI (Optional)
To use a local LLM like Llama 3 or Qwen 2.5:

1.  **Install Ollama**: [https://ollama.com](https://ollama.com)
2.  **Pull a Model**: `ollama pull qwen2.5:1.5b`
3.  **Configure**:
    -   Click the **Gear Icon** ⚙️ in the GenAI sidebar.
    -   Set **AI Mode** to `local`.
    -   Set **Model** to `qwen2.5:1.5b`.

## Resources

- [**Repository**](https://github.com/carlosfundora/genai-studio-preview)
- [**Issue Tracker**](https://github.com/carlosfundora/genai-studio-preview/issues)
- [**Changelog**](CHANGELOG.md)
- [**License**](LICENSE)

## Configuration Reference

You can also drop a `.genairc.json` in your project root:

```json
{
  "ai": {
    "mode": "local",
    "endpoint": "http://localhost:11434/v1",
    "models": { "text": "qwen2.5:1.5b" }
  },
  "location": {
    "mode": "mock",
    "mockCoords": { "latitude": 40.7128, "longitude": -74.0060 }
  }
}
```

## Docker Support

Run with full AI backend stack:

```bash
# CPU
docker-compose --profile cpu up

# GPU (NVIDIA)
docker-compose --profile gpu up
```

---
**Enjoying the tool?** Don't forget to [rate it ⭐⭐⭐⭐⭐](https://marketplace.visualstudio.com/items?itemName=carlosfundora.genai-studio-preview) on the Marketplace!
