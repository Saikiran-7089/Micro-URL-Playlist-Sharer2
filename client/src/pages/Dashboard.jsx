import React, { useState, useEffect } from 'react';
import { Copy, Plus, Trash2, ExternalLink } from 'lucide-react';
import { shortenUrl, createPlaylist, getUrlStats, getPlaylistStats } from '../services/api';

const Dashboard = () => {
  // URL Shortener State
  const [urlInput, setUrlInput] = useState('');
  const [shortenedUrlData, setShortenedUrlData] = useState(null);
  const [urlError, setUrlError] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  // Playlist State
  const [playlistName, setPlaylistName] = useState('');
  const [playlistUrls, setPlaylistUrls] = useState(['', '', '']);
  const [playlistData, setPlaylistData] = useState(null);
  const [playlistError, setPlaylistError] = useState('');
  const [playlistLoading, setPlaylistLoading] = useState(false);

  // Stats State
  const [statsInput, setStatsInput] = useState('');
  const [statsData, setStatsData] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [statsLoading, setStatsLoading] = useState(false);

  // Playlist Analytics State
  const [playlistStatsInput, setPlaylistStatsInput] = useState('');
  const [playlistStatsData, setPlaylistStatsData] = useState(null);
  const [playlistStatsError, setPlaylistStatsError] = useState('');
  const [playlistStatsLoading, setPlaylistStatsLoading] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleShortenUrl = async (e) => {
    e.preventDefault();
    setUrlError('');
    setUrlLoading(true);
    setShortenedUrlData(null);
    try {
      const res = await shortenUrl(urlInput);
      if (res.success) {
        setShortenedUrlData(res.data);
        setUrlInput('');
      }
    } catch (err) {
      setUrlError(err.response?.data?.message || 'Failed to shorten URL');
    } finally {
      setUrlLoading(false);
    }
  };

  const handlePlaylistUrlChange = (index, value) => {
    const newUrls = [...playlistUrls];
    newUrls[index] = value;
    setPlaylistUrls(newUrls);
  };

  const addPlaylistUrl = () => setPlaylistUrls([...playlistUrls, '']);
  const removePlaylistUrl = (index) => {
    if (playlistUrls.length > 1) {
      const newUrls = playlistUrls.filter((_, i) => i !== index);
      setPlaylistUrls(newUrls);
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    setPlaylistError('');
    setPlaylistLoading(true);
    setPlaylistData(null);
    
    const validUrls = playlistUrls.filter(url => url.trim() !== '');
    if (validUrls.length === 0) {
      setPlaylistError('Please enter at least one URL');
      setPlaylistLoading(false);
      return;
    }

    try {
      const res = await createPlaylist(playlistName, validUrls);
      if (res.success) {
        setPlaylistData(res.data);
        setPlaylistName('');
        setPlaylistUrls(['', '', '']);
      }
    } catch (err) {
      setPlaylistError(err.response?.data?.message || 'Failed to create playlist');
    } finally {
      setPlaylistLoading(false);
    }
  };

  const handleGetStats = async (e) => {
    e.preventDefault();
    setStatsError('');
    setStatsLoading(true);
    setStatsData(null);
    try {
      const res = await getUrlStats(statsInput);
      if (res.success) {
        setStatsData(res.data);
      }
    } catch (err) {
      setStatsError(err.response?.data?.message || 'Failed to get stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleGetPlaylistStats = async (e) => {
    e.preventDefault();
    setPlaylistStatsError('');
    setPlaylistStatsLoading(true);
    setPlaylistStatsData(null);
    try {
      const res = await getPlaylistStats(playlistStatsInput.trim());
      if (res.success) {
        setPlaylistStatsData(res.data);
      }
    } catch (err) {
      setPlaylistStatsError(err.response?.data?.message || 'Failed to get playlist analytics');
    } finally {
      setPlaylistStatsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      {/* URL Shortener Card */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Create Short URL</h2>
        <form onSubmit={handleShortenUrl} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Enter long URL</label>
            <input
              type="url"
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              placeholder="https://example.com/very/long/url"
            />
          </div>
          {urlError && <p className="text-red-500 text-sm">{urlError}</p>}
          <button
            type="submit"
            disabled={urlLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {urlLoading ? 'Shortening...' : 'Shorten URL'}
          </button>
        </form>

        {shortenedUrlData && (
          <div className="mt-6 p-4 bg-green-50 rounded-md border border-green-200">
            <h3 className="text-lg font-medium text-green-800 mb-2">Success!</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Original:</span> <a href={shortenedUrlData.originalUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{shortenedUrlData.originalUrl}</a></p>
              <div className="flex items-center justify-between">
                <p><span className="font-semibold">Short URL:</span> <a href={shortenedUrlData.shortUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{shortenedUrlData.shortUrl}</a></p>
                <button onClick={() => handleCopy(shortenedUrlData.shortUrl)} className="text-gray-500 hover:text-gray-700 p-1">
                  <Copy size={16} />
                </button>
              </div>
              <p><span className="font-semibold">Clicks:</span> {shortenedUrlData.clicks}</p>
            </div>
          </div>
        )}
      </div>

      {/* Playlist Creator Card */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Create Playlist</h2>
        <form onSubmit={handleCreatePlaylist} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Playlist Name</label>
            <input
              type="text"
              required
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              placeholder="My Favorite Resources"
            />
          </div>
          
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">URLs</label>
            {playlistUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handlePlaylistUrlChange(index, e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  placeholder={`URL ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removePlaylistUrl(index)}
                  disabled={playlistUrls.length <= 1}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addPlaylistUrl}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={16} className="mr-1" /> Add URL
          </button>

          {playlistError && <p className="text-red-500 text-sm">{playlistError}</p>}
          
          <button
            type="submit"
            disabled={playlistLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 mt-4"
          >
            {playlistLoading ? 'Creating...' : 'Create Playlist'}
          </button>
        </form>

        {playlistData && (
          <div className="mt-6 p-4 bg-green-50 rounded-md border border-green-200">
            <h3 className="text-lg font-medium text-green-800 mb-2">Playlist Created!</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Name:</span> {playlistData.name}</p>
              <p><span className="font-semibold">Code:</span> {playlistData.playlistCode}</p>
              <p><span className="font-semibold">Links:</span> {playlistData.totalLinks}</p>
              <div className="flex items-center justify-between">
                <p><span className="font-semibold">URL:</span> <a href={playlistData.playlistUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{playlistData.playlistUrl}</a></p>
                <button onClick={() => handleCopy(playlistData.playlistUrl)} className="text-gray-500 hover:text-gray-700 p-1">
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Card */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Statistics</h2>
        <form onSubmit={handleGetStats} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Enter Short Code</label>
            <input
              type="text"
              required
              value={statsInput}
              onChange={(e) => setStatsInput(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              placeholder="e.g. aB72xK"
            />
          </div>
          {statsError && <p className="text-red-500 text-sm">{statsError}</p>}
          <button
            type="submit"
            disabled={statsLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {statsLoading ? 'Loading...' : 'Get Statistics'}
          </button>
        </form>

        {statsData && (
          <div className="mt-6 p-4 bg-purple-50 rounded-md border border-purple-200">
            <h3 className="text-lg font-medium text-purple-800 mb-2">Stats for {statsData.shortCode}</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Original URL:</span> <a href={statsData.originalUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{statsData.originalUrl}</a></p>
              <p><span className="font-semibold">Total Clicks:</span> <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{statsData.clicks}</span></p>
              <p><span className="font-semibold">Created:</span> {new Date(statsData.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Playlist Analytics Card */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Playlist Analytics</h2>
        <form onSubmit={handleGetPlaylistStats} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Enter Playlist Code</label>
            <input
              type="text"
              required
              value={playlistStatsInput}
              onChange={(e) => setPlaylistStatsInput(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              placeholder="e.g. PL5mPkqz"
            />
          </div>
          {playlistStatsError && <p className="text-red-500 text-sm">{playlistStatsError}</p>}
          <button
            type="submit"
            disabled={playlistStatsLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {playlistStatsLoading ? 'Loading...' : 'Get Playlist Analytics'}
          </button>
        </form>

        {playlistStatsData && (
          <div className="mt-6 p-4 bg-indigo-50 rounded-md border border-indigo-200 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-indigo-900">{playlistStatsData.name}</h3>
              <p className="text-xs text-indigo-700 font-mono">Code: {playlistStatsData.playlistCode}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white p-3 rounded shadow-sm border border-indigo-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Clicks</p>
                <p className="text-2xl font-bold text-indigo-600">{playlistStatsData.totalClicks}</p>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-indigo-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">URLs</p>
                <p className="text-2xl font-bold text-indigo-600">{playlistStatsData.urlCount}</p>
              </div>
            </div>

            <div className="overflow-x-auto bg-white rounded border border-indigo-100">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      URL
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      Short Code
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                      Clicks
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {playlistStatsData.urls.map((u, idx) => (
                    <tr key={u.shortCode || idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 max-w-[180px] truncate">
                        <a
                          href={u.originalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                          title={u.originalUrl}
                        >
                          <span className="truncate">{u.originalUrl.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink size={12} className="flex-shrink-0" />
                        </a>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-700">
                        {u.shortCode}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-indigo-700">
                        {u.clicks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>

  );
};

export default Dashboard;
