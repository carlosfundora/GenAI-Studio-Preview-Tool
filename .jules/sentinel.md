## 2026-01-25 - XSS in Config Injection
**Vulnerability:** Unsanitized user configuration injected into HTML via `JSON.stringify` allowed XSS.
**Learning:** `JSON.stringify` output is not safe for embedding in HTML `<script>` blocks because it doesn't escape `</script>`.
**Prevention:** Use a safe serializer or manually escape `<` as `\u003c` when injecting JSON into HTML.

## 2026-02-05 - XSS in EntryPoint Injection
**Vulnerability:** `entryPoint` from configuration was injected into `<script src="...">` without escaping quotes, allowing attribute breakout and XSS.
**Learning:** HTML attribute injection requires escaping quotes (`&quot;`), distinct from script content injection (`<` escaping).
**Prevention:** Sanitize all user input injected into HTML attributes using strict escaping.
