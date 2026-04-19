// Centralized helper for building public, shareable URLs.
// Uses the production custom domain when available so links shared from the
// preview/staging environment still point to the live site.

const PRODUCTION_DOMAIN = "https://erpgymv1.lovable.app";

const PREVIEW_HOST_PATTERNS = [
  "lovable.app",
  "lovableproject.com",
  "localhost",
  "127.0.0.1",
];

export function getPublicBaseUrl(): string {
  if (typeof window === "undefined") return PRODUCTION_DOMAIN;
  const host = window.location.hostname;
  const isPreview = PREVIEW_HOST_PATTERNS.some((p) => host.includes(p));
  return isPreview ? PRODUCTION_DOMAIN : window.location.origin;
}
