## 2026-02-01 - Entry Point Caching Trade-off
**Learning:** Caching filesystem checks in Vite plugins improves performance but can introduce DX regressions. Specifically, memoizing the entry point detection in `GenAIPreviewPlugin` prevents the dev server from picking up newly created entry point files without a restart.
**Action:** When implementing caching in dev tools, weigh the frequency of the operation (e.g., page reload) against the likelihood of the invalidated state (e.g., creating a main entry file mid-session). For entry points, the trade-off favors performance.
