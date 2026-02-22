## 2026-01-25 - XSS in Config Injection
**Vulnerability:** Unsanitized user configuration injected into HTML via `JSON.stringify` allowed XSS.
**Learning:** `JSON.stringify` output is not safe for embedding in HTML `<script>` blocks because it doesn't escape `</script>`.
**Prevention:** Use a safe serializer or manually escape `<` as `\u003c` when injecting JSON into HTML.

## 2026-10-27 - API Key Exposure in Browser Injection
**Vulnerability:** Injecting full configuration objects into `window.__GENAI_PREVIEW_CONFIG__` exposed sensitive API keys from `.genairc.json` to client-side scripts.
**Learning:** Browser-injected configuration must be strictly filtered to include only public fields (e.g., location, mode) and exclude secrets like `apiKey`.
**Prevention:** Created a `publicConfig` object stripping `apiKey` before serialization and injection in `core/engine.ts`.
