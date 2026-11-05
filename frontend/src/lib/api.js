// Callers append /api/...; accept either an origin or a URL ending in /api.
export function normalizeApiBaseUrl(value) {
  const base = (value || '').trim() || 'http://localhost:5000';
  return base.replace(/\/+$/, '').replace(/(?:\/api)+$/, '');
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env?.VITE_API_URL);
