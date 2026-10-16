import {
  createPlaylist,
  getPlaylistByCode,
  getPlaylistStatsByCode
} from '../services/playlistService.js';
import { getBaseUrl, getClientUrl } from '../utils/urlHelper.js';

const isValidUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const createNewPlaylist = async (req, res, next) => {
  try {
    const { name, urls } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Valid playlist name is required' });
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ success: false, message: 'Playlist must contain at least one URL' });
    }

    for (const url of urls) {
      if (!isValidUrl(url)) {
        return res.status(400).json({ success: false, message: `Invalid URL found: ${url}` });
      }
    }

    const { playlist, totalLinks } = await createPlaylist(name.trim(), urls);
    const clientUrl = getClientUrl(req);

    res.status(201).json({
      success: true,
      data: {
        name: playlist.name,
        playlistCode: playlist.playlist_code,
        playlistUrl: `${clientUrl}/playlist/${playlist.playlist_code}`,
        totalLinks
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPlaylist = async (req, res, next) => {
  try {
    const { playlistCode } = req.params;

    if (!playlistCode) {
      return res.status(400).json({ success: false, message: 'playlistCode is required' });
    }

    const playlistData = await getPlaylistByCode(playlistCode);

    if (!playlistData) {
      return res.status(404).json({ success: false, message: 'Playlist not found' });
    }

    const baseUrl = getBaseUrl(req);

    const formattedLinks = playlistData.links.map((link) => ({
      ...link,
      shortUrl: `${baseUrl}/${link.shortCode}`
    }));

    res.status(200).json({
      success: true,
      data: {
        name: playlistData.playlist.name,
        playlistCode: playlistData.playlist.playlist_code,
        createdAt: playlistData.playlist.created_at,
        links: formattedLinks
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPlaylistStats = async (req, res, next) => {
  try {
    const { playlistCode } = req.params;

    if (!playlistCode) {
      return res.status(400).json({ success: false, message: 'playlistCode is required' });
    }

    const statsData = await getPlaylistStatsByCode(playlistCode);

    if (!statsData) {
      return res.status(404).json({ success: false, message: 'Playlist not found' });
    }

    const baseUrl = getBaseUrl(req);
    const formattedUrls = (statsData.urls || []).map((u) => ({
      ...u,
      shortUrl: `${baseUrl}/${u.shortCode}`
    }));

    res.status(200).json({
      success: true,
      data: {
        ...statsData,
        urls: formattedUrls
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createNewPlaylist,
  getPlaylist,
  getPlaylistStats
};
