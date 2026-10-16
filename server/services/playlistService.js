import supabase from '../config/supabase.js';
import { generateUniqueCode } from '../utils/generateCode.js';
import { getMultipleClickCountsFast, cacheUrlData } from './redisService.js';

export const createPlaylist = async (name, urls) => {
  // Generate playlist code
  const playlistCode = await generateUniqueCode('playlists', 'playlist_code', 6, 'PL');

  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .insert([{ name, playlist_code: playlistCode }])
    .select()
    .single();

  if (playlistError) {
    throw new Error('Database error while creating playlist');
  }

  // Create short URLs for all
  const urlRecords = [];
  for (const originalUrl of urls) {
    const shortCode = await generateUniqueCode('urls', 'short_code', 6);
    const { data: urlData, error: urlError } = await supabase
      .from('urls')
      .insert([{ original_url: originalUrl, short_code: shortCode }])
      .select()
      .single();

    if (urlError) {
      throw new Error('Database error while creating shortened URLs for playlist');
    }

    // Cache destination URL in Redis for instant redirect lookups
    cacheUrlData(urlData.short_code, urlData).catch(() => {});
    urlRecords.push(urlData);
  }

  // Create playlist_urls relations
  const relations = urlRecords.map((urlRecord, index) => ({
    playlist_id: playlist.id,
    url_id: urlRecord.id,
    position: index + 1
  }));

  const { error: relationError } = await supabase
    .from('playlist_urls')
    .insert(relations);

  if (relationError) {
    throw new Error('Database error while creating playlist relationships');
  }

  return {
    playlist,
    totalLinks: urls.length
  };
};

export const getPlaylistByCode = async (playlistCode) => {
  // Fetch playlist
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('*')
    .eq('playlist_code', playlistCode)
    .single();

  if (playlistError && playlistError.code === 'PGRST116') {
    return null;
  }

  if (playlistError) {
    throw new Error('Database error while fetching playlist');
  }

  // Fetch urls with positions
  const { data: relations, error: relationsError } = await supabase
    .from('playlist_urls')
    .select(`
      position,
      urls (
        original_url,
        short_code,
        clicks
      )
    `)
    .eq('playlist_id', playlist.id)
    .order('position', { ascending: true });

  if (relationsError) {
    throw new Error('Database error while fetching playlist URLs');
  }

  // Filter out any orphaned or missing URL relations
  const validRelations = (relations || []).filter((r) => r && r.urls);

  // Batch fetch real-time click counts from Redis counters
  const queryItems = validRelations.map((r) => ({
    shortCode: r.urls.short_code,
    fallbackDbClicks: r.urls.clicks
  }));

  const fastClicksList = await getMultipleClickCountsFast(queryItems);

  const links = validRelations.map((r, idx) => ({
    originalUrl: r.urls.original_url,
    shortCode: r.urls.short_code,
    clicks: fastClicksList[idx] ?? (r.urls.clicks || 0),
    position: r.position
  }));

  return {
    playlist,
    links
  };
};

export const getPlaylistStatsByCode = async (playlistCode) => {
  // Fetch playlist
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('*')
    .eq('playlist_code', playlistCode)
    .single();

  if (playlistError && playlistError.code === 'PGRST116') {
    return null;
  }

  if (playlistError) {
    throw new Error('Database error while fetching playlist');
  }

  // Fetch urls with positions
  const { data: relations, error: relationsError } = await supabase
    .from('playlist_urls')
    .select(`
      position,
      urls (
        original_url,
        short_code,
        clicks
      )
    `)
    .eq('playlist_id', playlist.id)
    .order('position', { ascending: true });

  if (relationsError) {
    throw new Error('Database error while fetching playlist URLs');
  }

  // Filter out any orphaned relations
  const validRelations = (relations || []).filter((r) => r && r.urls);

  // Batch query Redis fast counters for real-time playlist metrics
  const queryItems = validRelations.map((r) => ({
    shortCode: r.urls.short_code,
    fallbackDbClicks: r.urls.clicks
  }));

  const fastClicksList = await getMultipleClickCountsFast(queryItems);

  const urlsWithStats = validRelations.map((r, idx) => ({
    shortCode: r.urls.short_code,
    originalUrl: r.urls.original_url,
    clicks: fastClicksList[idx] ?? (r.urls.clicks || 0)
  }));

  // Aggregate total clicks directly from the real-time Redis counters
  const totalClicks = urlsWithStats.reduce((sum, item) => sum + item.clicks, 0);

  return {
    playlistCode: playlist.playlist_code,
    name: playlist.name,
    totalClicks,
    urlCount: urlsWithStats.length,
    urls: urlsWithStats
  };
};

export default {
  createPlaylist,
  getPlaylistByCode,
  getPlaylistStatsByCode
};
