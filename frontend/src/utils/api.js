/**
 * api.js — Central API base URL utility
 *
 * In local dev:  VITE_BACKEND_URL is not set → API_BASE = '' → relative /api paths
 *                work via the Vite proxy (vite.config.js → localhost:5000)
 *
 * In production: VITE_BACKEND_URL = 'https://aero-health-backend.onrender.com'
 *                → full absolute URLs are used, bypassing the (non-existent) proxy
 */
export const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

/**
 * Constructs a full API URL for any path.
 * @param {string} path - e.g. '/api/auth/login'
 * @returns {string}
 */
export const apiUrl = (path) => `${API_BASE}${path}`;

/**
 * Custom fetch wrapper that automatically attaches the JWT Bearer token
 * from localStorage and sets the credentials option.
 */
export const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('token');

  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const mergedOptions = {
    credentials: 'include',
    ...options,
    headers
  };

  return fetch(url, mergedOptions);
};
