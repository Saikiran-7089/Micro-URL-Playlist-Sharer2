# Testing Report

| Test Case | Input | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| Health Check | `GET /api/health` | 200 OK, JSON status & Redis state | 200 OK | PASS |
| Create Short URL | `{ "originalUrl": "https://google.com" }` | 201 Created, returns shortCode & shortUrl | 201 Created | PASS |
| Invalid URL Creation | `{ "originalUrl": "not-a-url" }` | 400 Bad Request | 400 Bad Request | PASS |
| Redirect | `GET /:shortCode` | 302 Found, redirects to original | 302 Found | PASS |
| Missing Short Code | `GET /invalidCode` | 404 Not Found | 404 Not Found | PASS |
| Click Tracking | Visit short URL | Clicks increment by 1 | Increments accurately | PASS |
| Statistics | `GET /api/urls/:shortCode/stats` | Returns click metrics | Accurately returns data | PASS |
| Create Playlist | Array of 2 URLs | 201 Created, returns playlistCode | 201 Created | PASS |
| Retrieve Playlist | `GET /api/playlists/:playlistCode` | Returns 2 URLs in original order | Correct ordered URLs | PASS |
| **Criterion 1: Redis Genuine Use** | `GET /:shortCode` redirect | Atomic `INCR url:clicks:<shortCode>` & cache lookup | Redis key incremented & queried | PASS |
| **Criterion 2: No Double-Counting** | Sequential redirects & stats calls | Monotonic count mirrored between Redis & PostgreSQL | Exact absolute count, 0 double counts | PASS |
| **Criterion 3: Playlist Redis Stats** | `GET /api/playlists/:playlistCode/stats` | Aggregates live Redis counters | Reads live Redis values via batch mget | PASS |
| **Criterion 4: Redis Outage Resilience** | Simulate Redis disconnection / timeout | 302 Redirect completes, DB fallback updated | Redirect never blocked or broken | PASS |
| **Criterion 5: Production Localhost Guard** | `NODE_ENV=production` with localhost env | Resolves host dynamically from request / Render | 0 accidental localhost URLs leaked | PASS |
| Automated Test Suite | `npm test` (`tests/verify-requirements.js`) | 9/9 verification tests pass | 9/9 Passed | PASS |
| Frontend Build | `npm run build` | Zero compile errors, dist generated | Zero errors (Vite) | PASS |
