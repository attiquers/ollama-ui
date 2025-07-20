// routes/chats.js  (only add logs where it matters)
const express = require('express');
const Chat = require('../models/Chat');
const router = express.Router();

router.get('/', async (_, res) => {
  try {
    const chats = await Chat.find().sort({ datetime: -1 });
    console.log('[CHATS-GET] returning', chats.length, 'chats');
    res.json(chats);
  } catch (err) {
    console.error('[CHATS-GET] ERROR:', err.message);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

/* … rest unchanged … */
module.exports = router;