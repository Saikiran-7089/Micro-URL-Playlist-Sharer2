/**
 * URL Helper utilities for safe domain and base URL resolution.
 * Prevents accidental 'localhost' leakage into production responses.
 */

const isLocalhostAddress = (urlStr) => {
  if (!urlStr) return false;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/i.test(urlStr);
};

/**
 * Resolves the backend base URL dynamically and safely.
 * Priority:
 * 1. BASE_URL environment variable (unless in production and pointing to localhost)
 * 2. RENDER_EXTERNAL_URL (automatically provided by Render for web services)
 * 3. Incoming HTTP request headers (x-forwarded-proto + x-forwarded-host or host)
 * 4. Localhost fallback (only in development)
 *
 * @param {import('express').Request} [req]
 * @returns {string} Fully qualified base URL (without trailing slash)
 */
export const getBaseUrl = (req) => {
  const isProd = process.env.NODE_ENV === 'production';
  const configuredBaseUrl = process.env.BASE_URL?.trim();

  // 1. If BASE_URL is set and valid (not an accidental localhost in production)
  if (configuredBaseUrl) {
    if (!isProd || !isLocalhostAddress(configuredBaseUrl)) {
      return configuredBaseUrl.replace(/\/+$/, '');
    }
    console.warn('[Config Warning] BASE_URL is set to localhost in production mode! Resolving dynamically from request.');
  }

  // 2. Render cloud platform automatic external URL
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.trim().replace(/\/+$/, '');
  }

  // 3. Derive from incoming request headers
  if (req) {
    const proto = req.headers?.['x-forwarded-proto'] || req.protocol || (isProd ? 'https' : 'http');
    const host = req.headers?.['x-forwarded-host'] || req.get?.('host');

    if (host) {
      if (!isProd || !isLocalhostAddress(host)) {
        return `${proto}://${host}`.replace(/\/+$/, '');
      }
    }
  }

  // 4. Fallback for development
  const port = process.env.PORT || 5000;
  if (isProd) {
    console.error('[Config Error] Production environment detected with no valid external domain or request host! Fallback to localhost avoided.');
  }
  return `http://localhost:${port}`;
};

/**
 * Resolves the frontend client URL dynamically and safely.
 * Priority:
 * 1. FRONTEND_URL environment variable (unless in production and pointing to localhost)
 * 2. Incoming Request Origin or Referer (from CORS requests)
 * 3. Localhost fallback (only in development)
 *
 * @param {import('express').Request} [req]
 * @returns {string} Fully qualified frontend URL (without trailing slash)
 */
export const getClientUrl = (req) => {
  const isProd = process.env.NODE_ENV === 'production';
  const configuredFrontend = process.env.FRONTEND_URL?.trim();

  // 1. If FRONTEND_URL is set (take the first if comma-separated)
  if (configuredFrontend) {
    const primary = configuredFrontend.split(',')[0].trim();
    if (!isProd || !isLocalhostAddress(primary)) {
      return primary.replace(/\/+$/, '');
    }
    console.warn('[Config Warning] FRONTEND_URL is set to localhost in production mode! Resolving dynamically from request origin.');
  }

  // 2. Derive from request origin or referer header
  if (req) {
    const origin = req.headers?.origin;
    if (origin && (!isProd || !isLocalhostAddress(origin))) {
      return origin.replace(/\/+$/, '');
    }

    const referer = req.headers?.referer;
    if (referer) {
      try {
        const refOrigin = new URL(referer).origin;
        if (!isProd || !isLocalhostAddress(refOrigin)) {
          return refOrigin.replace(/\/+$/, '');
        }
      } catch {
        // Invalid referer URL, ignore
      }
    }
  }

  // 3. Fallback for development
  if (isProd) {
    console.error('[Config Error] Production environment detected with no valid FRONTEND_URL or request origin!');
  }
  return 'http://localhost:5173';
};

export default {
  getBaseUrl,
  getClientUrl,
  isLocalhostAddress,
};
