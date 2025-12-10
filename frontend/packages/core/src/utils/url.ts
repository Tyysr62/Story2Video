/**
 * normalizeMediaUrl upgrades insecure media URLs to https to avoid mixed-content issues.
 * - "http://" -> "https://"
 * - leaves https/blob/data/file/tauri schemes untouched
 * - trims whitespace and returns original string when no change is needed
 */
export function normalizeMediaUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();

  // Preserve non-http schemes
  if (/^(https:|blob:|data:|file:|tauri:\/\/|chrome-extension:\/\/)/i.test(trimmed)) {
    return trimmed;
  }

  // Upgrade http to https
  if (/^http:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http:\/\//i, "https://");
  }

  // Protocol-relative URLs
  if (/^\/\//.test(trimmed)) {
    return `https:${trimmed}`;
  }

  return trimmed;
}
