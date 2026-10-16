# Architecture

## Overview
The Micro-URL Playlist Sharer follows a resilient, high-performance architecture:
1. **Frontend (Presentation Layer)**: Built with React and Vite, deployed on Vercel. Handles UI rendering, user interaction, link creation, and analytics dashboards.
2. **Backend (Application Layer)**: Built with Node.js and Express.js, deployed on Render. Handles business logic, API endpoints, short-code generation, and redirect logic.
3. **Database (Data Layer)**: Supabase (PostgreSQL). Persistent source-of-truth database storing URLs, playlists, relationships, and durable click counts.
4. **Analytics & Acceleration (Cache / Fast Counter Layer)**: Redis (dual-supported via `@upstash/redis` for serverless Upstash REST and `ioredis` for standard TCP Redis). Provides ultra-fast redirect lookup and sub-millisecond atomic click tracking.

### Data Source-of-Truth & Consistency Strategy
- **PostgreSQL**: Serves as the primary durable data store. All URLs, playlist structures, and baseline click counts are preserved here.
- **Redis**: Serves as the high-speed analytics acceleration layer. Redirects execute atomic `INCR` commands (`url:clicks:<shortCode>`) and read/populate the URL cache (`url:cache:<shortCode>`).
- **No Double-Counting**: Redis and PostgreSQL never double-count. Redis maintains the exact, monotonic click counter initialized via `SETNX` from the PostgreSQL baseline. Redis click counts are asynchronously mirrored back to PostgreSQL as absolute values (`UPDATE urls SET clicks = newClicks`), never as additive deltas.
- **Graceful Resilience**: If Redis is temporarily unavailable, times out, or is unconfigured, the system automatically falls back to PostgreSQL without interrupting URL redirection or failing user requests. Redis failure never breaks redirects.
- **Production URL Resolution**: Backend and client automatically prevent accidental localhost leakage in production environments through dynamic host detection (`RENDER_EXTERNAL_URL`, `x-forwarded-proto`, `x-forwarded-host`, and `origin` headers).

## Request Flows
1. **Shorten URL**: User submits a URL → Frontend calls `POST /api/urls` → Backend validates, generates a unique code via `nanoid`, inserts into Supabase PostgreSQL, caches destination in Redis (`url:cache:<shortCode>`) → Backend returns the production short code and URL → Frontend displays it.
2. **Redirect & Fast Count (`GET /:shortCode`)**: User visits `/:shortCode` → Backend checks Redis cache for destination URL (falling back to PostgreSQL) → Atomically increments Redis click counter (`INCR url:clicks:<shortCode>`) → Asynchronously updates PostgreSQL for persistence → Issues an HTTP 302 Redirect to the original URL.
3. **Create Playlist**: User submits multiple URLs → Backend generates short codes for each URL, creates a playlist record in Supabase, maps them in `playlist_urls` with positional indexes, caches URLs in Redis → Returns playlist code and share URL.
4. **URL & Playlist Analytics**:
   - `GET /api/urls/:shortCode/stats`: Fetches fast click count from Redis (initializing from DB if key missing) and returns short code metadata.
   - `GET /api/playlists/:playlistCode/stats`: Aggregates real-time Redis click counts across all URLs in the playlist (via batch `mget`), calculating total playlist clicks, URL count, and per-URL click metrics directly from live Redis counters.
