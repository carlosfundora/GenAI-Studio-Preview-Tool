## 2024-10-24 - Manual HTML Construction Risks
**Learning:** This extension constructs Webview UI using template literals, bypassing linting tools that typically catch accessibility issues (like missing alt text or aria-labels).
**Action:** When reviewing Webview-based extensions, manually inspect HTML template strings for missing a11y attributes, as automated tools won't catch them.
