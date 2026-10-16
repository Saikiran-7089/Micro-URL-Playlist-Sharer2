import axios from 'axios';

// Resolve backend API URL safely across environments
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
let baseUrl = rawBaseUrl;

if (!baseUrl) {
  if (import.meta.env.PROD) {
    console.warn('[Configuration Notice] VITE_API_BASE_URL is not configured in production build. Using relative /api routing.');
    baseUrl = '';
  } else {
    baseUrl = 'http://localhost:5000';
  }
} else if (import.meta.env.PROD && /localhost|127\.0\.0\.1/i.test(baseUrl)) {
  console.warn('[Configuration Warning] VITE_API_BASE_URL points to localhost in a production build! Remote visitors will not be able to connect.');
}

const API_URL = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/api` : '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const shortenUrl = async (originalUrl) => {
  const response = await api.post('/urls', { originalUrl });
  return response.data;
};

export const getUrlStats = async (shortCode) => {
  const response = await api.get(`/urls/${shortCode}/stats`);
  return response.data;
};

export const createPlaylist = async (name, urls) => {
  const response = await api.post('/playlists', { name, urls });
  return response.data;
};

export const getPlaylist = async (playlistCode) => {
  const response = await api.get(`/playlists/${playlistCode}`);
  return response.data;
};

export const getPlaylistStats = async (playlistCode) => {
  const response = await api.get(`/playlists/${playlistCode}/stats`);
  return response.data;
};

export default api;
