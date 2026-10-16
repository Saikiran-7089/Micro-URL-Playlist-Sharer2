import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const rawRedisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let redisClient = null;
let clientType = 'none'; // 'upstash' | 'ioredis' | 'none'

const isLocalhostAddress = (urlStr) => {
  if (!urlStr) return false;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/i.test(urlStr);
};

// Guard: Production configuration must not accidentally use localhost for Redis
if (isProduction && rawRedisUrl && isLocalhostAddress(rawRedisUrl)) {
  console.warn('[Redis Config Warning] REDIS_URL points to localhost in production mode! Falling back to PostgreSQL to prevent connection hangs.');
} else if (rawRedisUrl) {
  try {
    if (rawRedisUrl.startsWith('https://') || rawRedisUrl.startsWith('http://')) {
      // Upstash REST Redis
      if (!redisToken) {
        console.warn('[Redis] Warning: Upstash REST URL provided without REDIS_TOKEN. Falling back to database.');
      } else {
        redisClient = new UpstashRedis({
          url: rawRedisUrl,
          token: redisToken,
        });
        clientType = 'upstash';
        console.log('[Redis] Upstash REST Redis client initialized successfully.');
      }
    } else if (rawRedisUrl.startsWith('redis://') || rawRedisUrl.startsWith('rediss://')) {
      // Standard TCP Redis via ioredis
      const ioClient = new IORedis(rawRedisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        commandTimeout: 1500,
        enableOfflineQueue: false,
        retryStrategy: () => null, // Do not spam reconnects on failure
      });

      ioClient.on('error', (err) => {
        console.error('[Redis ioredis error]:', err.message);
      });

      ioClient.on('connect', () => {
        console.log('[Redis] Standard Redis connected successfully.');
      });

      redisClient = ioClient;
      clientType = 'ioredis';
    } else {
      console.warn(`[Redis] Unrecognized REDIS_URL protocol: "${rawRedisUrl}". Falling back to database.`);
    }
  } catch (initErr) {
    console.error('[Redis] Failed to initialize Redis client:', initErr.message);
    redisClient = null;
    clientType = 'none';
  }
} else {
  console.warn('[Redis] Notice: REDIS_URL not configured. Running in database fallback mode.');
}

/**
 * Timeout wrapper ensuring no Redis operation hangs longer than ms.
 * Prevents Redis stalls from blocking HTTP responses or redirects.
 */
const withTimeout = (promise, ms = 1500) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Redis operation timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ]);
};

/**
 * Deterministic Redis key for click counter of a short code.
 * @param {string} shortCode
 * @returns {string}
 */
export const getClickKey = (shortCode) => `url:clicks:${shortCode}`;

/**
 * Deterministic Redis key for cached URL metadata.
 * @param {string} shortCode
 * @returns {string}
 */
export const getUrlCacheKey = (shortCode) => `url:cache:${shortCode}`;

/**
 * Check if Redis client is configured and available.
 * @returns {boolean}
 */
export const isRedisConfigured = () => redisClient !== null;

/**
 * Get the underlying Redis client instance (for testing or advanced queries).
 * @returns {object|null}
 */
export const getRedisClient = () => redisClient;

/**
 * Fast click increment via Redis with automatic database baseline initialization
 * and stale counter reconciliation.
 *
 * Guarantees:
 * 1. Redis failure NEVER breaks caller (returns fallback count).
 * 2. No race condition overwrite (uses SETNX for baseline).
 * 3. No double-counting (operates on absolute monotonic counter).
 * 4. Stale Redis key reconciliation if DB accumulated more clicks during downtime.
 *
 * @param {string} shortCode
 * @param {number} currentDbClicks
 * @returns {Promise<number>} Updated absolute click count
 */
export const incrementClickCountFast = async (shortCode, currentDbClicks = 0) => {
  const dbBaseline = Math.max(0, Number(currentDbClicks) || 0);
  const fallbackCount = dbBaseline + 1;

  if (!redisClient) {
    return fallbackCount;
  }

  try {
    const key = getClickKey(shortCode);

    // If database already has clicks, ensure Redis counter is initialized to at least the DB baseline.
    // SETNX sets the value only if the key does not already exist (prevents race condition overwrite).
    if (dbBaseline > 0) {
      await withTimeout(redisClient.setnx(key, dbBaseline), 1000).catch(() => {});
    }

    // Atomically increment counter
    const newCountRaw = await withTimeout(redisClient.incr(key), 1200);
    const newCount = Number(newCountRaw);

    // If Redis had a stale counter from previous downtime lower than current DB baseline,
    // fast-forward Redis counter to maintain monotonicity and prevent DB from going backwards.
    if (newCount <= dbBaseline) {
      const reconciledCount = dbBaseline + 1;
      await withTimeout(redisClient.set(key, reconciledCount), 1000).catch(() => {});
      return reconciledCount;
    }

    return newCount;
  } catch (error) {
    console.error(`[Redis] Error incrementing clicks for ${shortCode}:`, error.message);
    return fallbackCount;
  }
};

/**
 * Get click count from Redis fast counter.
 * If not present in Redis, atomically initializes it with the persistent PostgreSQL count.
 * If Redis counter is stale (less than PostgreSQL count), reconciles to the PostgreSQL count.
 *
 * Guarantees NO double-counting between Redis and PostgreSQL.
 *
 * @param {string} shortCode
 * @param {number} fallbackDbClicks
 * @returns {Promise<number>}
 */
export const getClickCountFast = async (shortCode, fallbackDbClicks = 0) => {
  const fallback = Math.max(0, Number(fallbackDbClicks) || 0);
  if (!redisClient) {
    return fallback;
  }

  try {
    const key = getClickKey(shortCode);
    const val = await withTimeout(redisClient.get(key), 1200);

    if (val === null || val === undefined) {
      // Key missing in Redis: seed Redis with PostgreSQL baseline using SETNX
      await withTimeout(redisClient.setnx(key, fallback), 1000).catch(() => {});
      return fallback;
    }

    const redisCount = Number(val);
    // If Redis count is unexpectedly lower than DB baseline, reconcile
    if (redisCount < fallback) {
      await withTimeout(redisClient.set(key, fallback), 1000).catch(() => {});
      return fallback;
    }

    return redisCount;
  } catch (error) {
    console.error(`[Redis] Error retrieving clicks for ${shortCode}:`, error.message);
    return fallback;
  }
};

/**
 * Fast batch getter for playlist statistics across multiple short codes.
 * Reads Redis counters in parallel or batch, falling back to database counts on error.
 *
 * @param {Array<{ shortCode: string, fallbackDbClicks: number }>} items
 * @returns {Promise<number[]>}
 */
export const getMultipleClickCountsFast = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  if (!redisClient) {
    return items.map((item) => Math.max(0, Number(item.fallbackDbClicks) || 0));
  }

  try {
    // Attempt batch retrieval using mget if supported
    const keys = items.map((i) => getClickKey(i.shortCode));
    let rawResults = null;

    if (typeof redisClient.mget === 'function') {
      try {
        rawResults = await withTimeout(
          clientType === 'ioredis' ? redisClient.mget(keys) : redisClient.mget(...keys),
          1500
        );
      } catch {
        rawResults = null;
      }
    }

    if (Array.isArray(rawResults)) {
      return items.map((item, idx) => {
        const val = rawResults[idx];
        const dbClicks = Math.max(0, Number(item.fallbackDbClicks) || 0);
        if (val === null || val === undefined) {
          redisClient.setnx(keys[idx], dbClicks).catch(() => {});
          return dbClicks;
        }
        const parsed = Number(val);
        return parsed < dbClicks ? dbClicks : parsed;
      });
    }

    // Fallback to parallel gets
    return await Promise.all(
      items.map((item) => getClickCountFast(item.shortCode, item.fallbackDbClicks))
    );
  } catch (error) {
    console.error('[Redis] Error retrieving batch clicks:', error.message);
    return items.map((item) => Math.max(0, Number(item.fallbackDbClicks) || 0));
  }
};

/**
 * Cache URL destination metadata in Redis for ultra-fast redirection.
 *
 * @param {string} shortCode
 * @param {object} urlData
 * @param {number} [ttlSeconds=86400] Default 24 hours
 */
export const cacheUrlData = async (shortCode, urlData, ttlSeconds = 86400) => {
  if (!redisClient || !urlData) return;
  try {
    const key = getUrlCacheKey(shortCode);
    const payload = JSON.stringify({
      id: urlData.id,
      original_url: urlData.original_url,
      short_code: urlData.short_code,
      clicks: urlData.clicks || 0,
      created_at: urlData.created_at,
    });

    if (clientType === 'ioredis') {
      await withTimeout(redisClient.set(key, payload, 'EX', ttlSeconds), 1000);
    } else {
      await withTimeout(redisClient.set(key, payload, { ex: ttlSeconds }), 1000);
    }
  } catch (err) {
    // Cache failures must never break the application
    console.warn(`[Redis Cache] Could not cache URL ${shortCode}:`, err.message);
  }
};

/**
 * Retrieve cached URL destination metadata from Redis.
 *
 * @param {string} shortCode
 * @returns {Promise<object|null>}
 */
export const getCachedUrlData = async (shortCode) => {
  if (!redisClient) return null;
  try {
    const key = getUrlCacheKey(shortCode);
    const cached = await withTimeout(redisClient.get(key), 800);
    if (!cached) return null;
    return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch {
    return null;
  }
};

export default {
  isRedisConfigured,
  getClickKey,
  getUrlCacheKey,
  getRedisClient,
  incrementClickCountFast,
  getClickCountFast,
  getMultipleClickCountsFast,
  cacheUrlData,
  getCachedUrlData,
};
