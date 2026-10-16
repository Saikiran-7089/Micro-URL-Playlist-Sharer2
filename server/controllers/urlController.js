import { createShortUrl, getUrlByShortCode, incrementClickCount } from '../services/urlService.js';
import {
  incrementClickCountFast,
  getClickCountFast,
  cacheUrlData,
  getCachedUrlData
} from '../services/redisService.js';
import { getBaseUrl } from '../utils/urlHelper.js';

// Regex for basic URL validation
const isValidUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const shortenUrl = async (req, res, next) => {
  try {
    const { originalUrl } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ success: false, message: 'originalUrl is required' });
    }

    if (!isValidUrl(originalUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL. Only HTTP and HTTPS are supported.'
      });
    }

    const urlData = await createShortUrl(originalUrl);
    const baseUrl = getBaseUrl(req);

    // Cache destination URL in Redis for fast future lookups
    cacheUrlData(urlData.short_code, urlData).catch(() => {});

    res.status(201).json({
      success: true,
      data: {
        id: urlData.id,
        originalUrl: urlData.original_url,
        shortCode: urlData.short_code,
        shortUrl: `${baseUrl}/${urlData.short_code}`,
        clicks: urlData.clicks || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export const redirectUrl = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    if (!shortCode) {
      return res.status(400).json({ success: false, message: 'shortCode is required' });
    }

    // 1. Resolve URL metadata: Check Redis cache first, falling back to PostgreSQL
    let urlData = null;
    try {
      urlData = await getCachedUrlData(shortCode);
    } catch (cacheErr) {
      console.warn(`[Redis Cache Warning] Failed to read cached URL for ${shortCode}:`, cacheErr.message);
    }

    if (!urlData) {
      urlData = await getUrlByShortCode(shortCode);
      if (urlData) {
        // Populate Redis cache asynchronously for subsequent fast redirects
        cacheUrlData(shortCode, urlData).catch(() => {});
      }
    }

    if (!urlData) {
      return res.status(404).json({ success: false, message: 'URL not found' });
    }

    // 2. Fast atomic click increment in Redis with automatic DB baseline initialization
    // 3. Asynchronously mirror the updated absolute count to PostgreSQL
    // 4. Guaranteed resilience: Redis failure NEVER breaks or delays the redirect
    try {
      const newClicks = await incrementClickCountFast(shortCode, urlData.clicks);
      // Persist absolute updated count to PostgreSQL asynchronously (fire-and-forget)
      incrementClickCount(urlData.id, newClicks).catch((dbErr) => {
        console.error('Error updating DB click count:', dbErr);
      });
    } catch (redisErr) {
      console.error('Fast click increment fallback triggered:', redisErr.message);
      // Graceful fallback: increment persistent database directly
      incrementClickCount(urlData.id, (urlData.clicks || 0) + 1).catch((dbErr) => {
        console.error('Error updating DB fallback click count:', dbErr);
      });
    }

    // 5. Issue HTTP 302 Redirect to the original URL
    res.redirect(302, urlData.original_url);
  } catch (error) {
    next(error);
  }
};

export const getUrlStats = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    if (!shortCode) {
      return res.status(400).json({ success: false, message: 'shortCode is required' });
    }

    const urlData = await getUrlByShortCode(shortCode);

    if (!urlData) {
      return res.status(404).json({ success: false, message: 'URL not found' });
    }

    // Fetch fast click count from Redis (or fallback to DB count, initializing Redis if missing)
    // Ensures NO double-counting between Redis and PostgreSQL
    const clicks = await getClickCountFast(shortCode, urlData.clicks);
    const baseUrl = getBaseUrl(req);

    res.status(200).json({
      success: true,
      data: {
        shortCode: urlData.short_code,
        originalUrl: urlData.original_url,
        shortUrl: `${baseUrl}/${urlData.short_code}`,
        clicks: clicks,
        createdAt: urlData.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  shortenUrl,
  redirectUrl,
  getUrlStats
};
