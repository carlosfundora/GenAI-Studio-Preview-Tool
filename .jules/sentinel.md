## 2026-01-25 - XSS in Config Injection
**Vulnerability:** Unsanitized user configuration injected into HTML via `JSON.stringify` allowed XSS.
**Learning:** `JSON.stringify` output is not safe for embedding in HTML `<script>` blocks because it doesn't escape `</script>`.
**Prevention:** Use a safe serializer or manually escape `<` as `\u003c` when injecting JSON into HTML.
