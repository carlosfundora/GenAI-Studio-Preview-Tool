## 2026-10-27 - Async Config Loading
**Optimization:** Converted synchronous configuration loading (`loadConfig`) to asynchronous (`loadConfigAsync`) using dynamic imports (`import()`) for Node.js modules.
**Impact:**
- Eliminates blocking synchronous I/O on the main thread during server startup and request handling.
- Enables browser compatibility for the shared `core/config.ts` module by avoiding static Node.js imports.
- **Trade-off:** Introduced ~1.5ms overhead per call (uncached) due to dynamic import and promise resolution, compared to ~0.04ms for cached synchronous read. However, this cost is paid only once (cold start) or when cache is invalid, while the non-blocking behavior benefits concurrent operations.
