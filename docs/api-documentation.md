# API Documentation

## 1. Health Check
- **GET /api/health**
- **Purpose**: Verifies that the API is running and Supabase is configured.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "status": "READY",
    "message": "Micro-URL API is running and Supabase credentials are provided"
  }
  ```

## 2. Create Short URL
- **POST /api/urls**
- **Body**: `{ "originalUrl": "https://www.example.com" }`
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "originalUrl": "https://www.example.com",
      "shortCode": "AbCdEf",
      "shortUrl": "http://localhost:5000/AbCdEf",
      "clicks": 0
    }
  }
  ```

## 3. Get URL Statistics
- **GET /api/urls/:shortCode/stats**
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "shortCode": "AbCdEf",
      "originalUrl": "https://www.example.com",
      "clicks": 1,
      "createdAt": "2026-10-08T00:00:00Z"
    }
  }
  ```

## 4. Redirect
- **GET /:shortCode**
- **Response**: `302 Found` (Redirects to original URL).

## 5. Create Playlist
- **POST /api/playlists**
- **Body**: 
  ```json
  {
    "name": "My Links",
    "urls": ["https://example.com"]
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "name": "My Links",
      "playlistCode": "P-xYz12",
      "playlistUrl": "http://localhost:5173/playlist/P-xYz12",
      "totalLinks": 1
    }
  }
  ```

## 6. Get Playlist
- **GET /api/playlists/:playlistCode**
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "name": "My Links",
      "playlistCode": "P-xYz12",
      "createdAt": "2026-10-08T00:00:00Z",
      "links": [
        {
          "originalUrl": "https://example.com",
          "shortCode": "AbCdEf",
          "clicks": 0,
          "position": 0,
          "shortUrl": "http://localhost:5000/AbCdEf"
        }
      ]
    }
  }
  ```

## 7. Get Playlist Statistics
- **GET /api/playlists/:playlistCode/stats**
- **Purpose**: Retrieves aggregated click metrics and per-URL breakdown using fast Redis counters.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "playlistCode": "PL5mPkqz",
      "name": "Study Links",
      "totalClicks": 15,
      "urlCount": 3,
      "urls": [
        {
          "shortCode": "abc123",
          "originalUrl": "https://youtube.com",
          "clicks": 8
        },
        {
          "shortCode": "xyz789",
          "originalUrl": "https://github.com",
          "clicks": 5
        },
        {
          "shortCode": "def456",
          "originalUrl": "https://google.com",
          "clicks": 2
        }
      ]
    }
  }
  ```
- **Status codes**: 200 OK, 400 Bad Request, 404 Not Found

