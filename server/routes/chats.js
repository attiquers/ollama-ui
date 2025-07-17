const express = require('express');

const Chat = require('../models/Chat');

const router = express.Router();

// GET all chats
router.get('/', async (req, res) => {
  try {
    const chats = await Chat.find();
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chats.' });
  }
});

// GET chat by id
router.get('/:id', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found.' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat.' });
  }
});

// CREATE new chat
router.post('/', async (req, res) => {
  try {
    const chat = new Chat(req.body);
    await chat.save();
    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create chat.' });
  }
});

// UPDATE chat by id
router.put('/:id', async (req, res) => {
  try {
    const chat = await Chat.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!chat) return res.status(404).json({ error: 'Chat not found.' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update chat.' });
  }
});

// DELETE chat by id
router.delete('/:id', async (req, res) => {
  try {
    const chat = await Chat.findByIdAndDelete(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found.' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete chat.' });
  }
});

module.exports = router;
