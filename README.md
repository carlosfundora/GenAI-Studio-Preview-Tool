# GenAI Studio Preview

**GenAI Studio Preview** is a local UI development tool and IDE extension that allows developers to locally preview the UI environments of applications designed using AI Studio, **without modifying either the app or the local machine.**

## 🚀 Key Features

- **Zero-Modification Architecture**: Preview any project without changing its code, configuration, or dependencies. Everything is injected in-memory via Vite's programmable API.
- **Zero Machine Pollution**: Run cleanly on your machine or utilize the built-in Docker support for absolute environment isolation.
- **Built-in GenAI Mocks**: Includes a local mock implementation of the `@google/genai` library, allowing you to test UI interactions without API costs or internet connectivity.
- **Smart Launching**: Automatically scans for Vite-based projects and launches them on dynamically assigned ports.
- **IDE Ready**: Architected to serve as the foundation for multi-platform IDE extensions.

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v24 recommended, v18+ required)
- [pnpm](https://pnpm.io/) (preferred) or npm

### Local Installation
1. Clone the repository into your projects directory.
2. Install dependencies:
   ```bash
   pnpm install
   ```

### Running the Preview
Execute the launcher from your terminal:
```bash
pnpm run preview
```
Follow the interactive prompts to select which versions or prototypes you want to launch.

### Docker Usage
For a consistent environment across Windows and Ubuntu:
```bash
docker compose up --build
```
The preview servers will be accessible on ports `4000-4010`.

## 🧠 How it Works
GenAI Studio Preview intercepts the build process using a custom Vite plugin. It programmatically:
1. Aliases AI-specific libraries to local mocks.
2. Strips brittle integrity checks and hardcoded CDN importmaps.
3. Automatically resolves and injects necessary entry points.

## 🗺️ Roadmap
- [ ] VS Code Extension wrapper
- [ ] Support for additional AI framework mocks
- [ ] Automatic repository discovery across multiple paths

---

*Transforming AI Studio prototypes into stable, local development environments.*
