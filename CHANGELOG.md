# Changelog

All notable changes to GenAI Studio Preview will be documented in this file.

## [1.0.0] - 2025-01-25

### Added

#### Core Engine
- **Configuration System**: `.genairc.json` with user/project/env override support
- **Expanded GenAI Mock**: Streaming, tool calls, embeddings, all SDK enums
- **Local AI Routing**: Route to Ollama/LFM/llama.cpp via OpenAI-compatible API
- **Heartbeat Auto-Shutdown**: Auto-stop server when browser closes (60s grace period)
- **Geolocation Shim**: Passthrough/mock/prompt modes for GPS testing
- **Mobile Viewport Injection**: Auto-inject viewport meta tag for responsive behavior

#### Mobile Preview
- **QR Code Terminal Display**: Scan-to-connect QR code for instant mobile access
- **Network URL Exposure**: Automatically shows network URLs for LAN testing

#### Docker Support
- **CPU/GPU Profiles**: `docker-compose --profile cpu` or `--profile gpu`
- **Ollama AI Backend**: Auto-downloads LFM-compatible models (qwen2.5:1.5b)
- **Volume Persistence**: Model cache persists between container runs

#### IDE Extension (VS Code / OpenVSX)
- **Sidebar Tree View**: Discovers AI Studio projects in workspace
- **Commands**: Launch Preview, Stop All Previews, Select Project
- **Status Bar**: Shows running preview count with ⚡ icon
- **Settings**: AI mode (mock/local), endpoint URL, model name configuration

### LFM Model Recommendations
Based on [LiquidAI HuggingFace Collection](https://huggingface.co/LiquidAI):
- **Text**: LFM2.5-1.2B-Instruct, LFM2.5-1.2B-Thinking
- **Vision**: LFM2.5-VL-1.6B
- **Audio**: LFM2-Audio-1.5B
- **Embeddings**: LFM2-ColBERT

### Graceful Degradation
- OpenStreetMap shim for Google Maps (planned)
- LiveAPI warning for unsupported real-time features
- Mock embeddings with deterministic vectors

## [0.1.0] - 2025-01-24

### Initial Release
- Basic Vite preview launcher
- Simple GenAI mock with text generation
- Version scanning for `.versions/legacy` and `.versions/feature`
- External project support (RECENTLY-DECEASED)
