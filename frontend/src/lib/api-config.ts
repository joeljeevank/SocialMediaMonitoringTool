/**
 * Centralized API configuration.
 * Uses NEXT_PUBLIC_API_URL environment variable if set (e.g. in Vercel production),
 * falling back to local backend at http://localhost:3001.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
