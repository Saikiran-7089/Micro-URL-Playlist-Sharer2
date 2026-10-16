# Deployment Guide

This project is built for seamless deployment on modern PaaS providers.

## 1. Database (Supabase)
- Go to [Supabase](https://supabase.com) and create a new project.
- Open the **SQL Editor** and paste the contents of `database/schema.sql`.
- Execute the schema to provision the tables.
- Go to **Project Settings > API** to locate your Project URL and `service_role` key.

## 2. Analytics Layer (Upstash Redis)
- Create a free database at [Upstash](https://upstash.com).
- Under the database details, locate the REST API credentials:
  - `UPSTASH_REDIS_REST_URL` (or Redis REST URL)
  - `UPSTASH_REDIS_REST_TOKEN` (or Redis REST Token)

## 3. Backend (Render)
- Go to [Render](https://render.com) and select the existing **Web Service**.
- Render automatically uses the `render.yaml` configuration in the `server` directory.
- Alternatively, manually configure:
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`
- Under **Environment Variables**, ensure the following variables are configured:
  - `SUPABASE_URL`: (Your Supabase Project URL)
  - `SUPABASE_SERVICE_ROLE_KEY`: (Your `service_role` secret key)
  - `FRONTEND_URL`: (The URL where your frontend is hosted, e.g., `https://micro-url-playlist-sharer.vercel.app`)
  - `BASE_URL`: (Your backend URL, e.g., `https://micro-url-playlist-sharer.onrender.com`)
  - `REDIS_URL`: (Your Upstash Redis REST URL)
  - `REDIS_TOKEN`: (Your Upstash Redis REST Token)

## 4. Frontend (Vercel)
- Import the project into [Vercel](https://vercel.com) or use the existing deployment.
- Set the **Root Directory** to `client`.
- In the **Environment Variables** section, add:
  - `VITE_API_BASE_URL`: (Your Render backend URL, e.g., `https://micro-url-playlist-sharer.onrender.com`)
- Deploy the application. Vercel automatically detects Vite and builds the project using `npm run build`.

## Security Note
Never commit your `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_TOKEN`, or sensitive API keys. They must strictly reside in the backend's environment variables and never be exposed to the client bundle.

