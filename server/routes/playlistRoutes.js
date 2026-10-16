import express from 'express';
import { createNewPlaylist, getPlaylist, getPlaylistStats } from '../controllers/playlistController.js';

const router = express.Router();

router.post('/', createNewPlaylist);
router.get('/:playlistCode/stats', getPlaylistStats);
router.get('/:playlistCode', getPlaylist);

export default router;
