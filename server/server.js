import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import urlRoutes from './routes/urlRoutes.js';
import playlistRoutes from './routes/playlistRoutes.js';
import { redirectUrl } from './controllers/urlController.js';
import { errorHandler } from './middleware/errorHandler.js';
import { isRedisConfigured } from './services/redisService.js';
import { getBaseUrl, getClientUrl } from './utils/urlHelper.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// Production-safe CORS configuration
const rawFrontend = process.env.FRONTEND_URL?.trim();
const explicitOrigins = rawFrontend
  ? rawFrontend.split(',').map((o) => o.trim().replace(/\/+$/, ''))
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // If explicit origin configured and matches
    if (explicitOrigins.includes(origin) || explicitOrigins.includes('*')) {
      return callback(null, true);
    }

    // In development, allow standard local dev servers
    if (!isProd) {
      if (/localhost|127\.0\.0\.1/i.test(origin)) {
        return callback(null, true);
      }
    }

    // In production, allow Vercel previews or primary deployment domain
    if (isProd) {
      if (origin.endsWith('.vercel.app') || explicitOrigins.length === 0) {
        return callback(null, true);
      }
    }

    callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/urls', urlRoutes);
app.use('/api/playlists', playlistRoutes);

// Health check endpoint with diagnostic information
app.get('/api/health', (req, res) => {
  const hasSupabaseUrl = !!process.env.SUPABASE_URL;
  const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const redisReady = isRedisConfigured();
  const currentBaseUrl = getBaseUrl(req);
  const currentClientUrl = getClientUrl(req);

  if (!hasSupabaseUrl || !hasSupabaseKey) {
    return res.status(200).json({
      success: true,
      status: 'NEEDS CONFIGURATION',
      message: 'Micro-URL API is running, but missing Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
      environment: process.env.NODE_ENV || 'development',
      redis: redisReady ? 'ACTIVE' : 'FALLBACK_MODE',
      baseUrl: currentBaseUrl,
      frontendUrl: currentClientUrl
    });
  }

  res.status(200).json({
    success: true,
    status: 'READY',
    message: 'Micro-URL API is fully operational',
    environment: process.env.NODE_ENV || 'development',
    redis: redisReady ? 'ACTIVE' : 'FALLBACK_MODE',
    baseUrl: currentBaseUrl,
    frontendUrl: currentClientUrl
  });
});

// Redirect endpoint for short URLs (must precede global error handler)
app.get('/:shortCode', redirectUrl);

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} [env: ${process.env.NODE_ENV || 'development'}]`);
});

export default app;
