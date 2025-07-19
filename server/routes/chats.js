const express = require('express');
const Chat = require('../models/Chat'); // Your Mongoose Chat model
const router = express.Router();

// DELETE all chats
router.delete('/clear/all', async (req, res) => {
  try {
    await Chat.deleteMany({});
    res.json({ message: 'All chats deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete all chats.' });
  }
});

// GET all chats
router.get('/', async (req, res) => {
  try {
    // Sort chats by datetime, newest first
    const chats = await Chat.find().sort({ datetime: -1 });
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
    const { name, messages } = req.body;
    const chat = new Chat({
      name: name || `New Chat - ${new Date().toLocaleString()}`,
      messages: messages || [], // Initialize with messages if provided
      datetime: new Date(), // Set creation datetime
    });
    await chat.save();
    res.status(201).json(chat);
  } catch (err) {
    console.error("Error creating new chat:", err);
    res.status(500).json({ error: 'Failed to create chat.' });
  }
});

// Endpoint to save or update a chat by ID (for partial and full saves)
// This endpoint will be called by the frontend to explicitly save the current state of messages
router.post('/:chatId/save', async (req, res) => {
  const { chatId } = req.params;
  const { messages } = req.body; // Expecting an array of { user: string, ai: string }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: 'Messages array is required.' });
  }

  try {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    // Overwrite the existing messages array with the current state from the frontend
    // Ensure each message has a datetime if not already present
    chat.messages = messages.map(msg => ({
      user: msg.user,
      ai: msg.ai,
      datetime: msg.datetime || new Date() // Use existing datetime or new one
    }));
    chat.datetime = new Date(); // Update chat's last updated time

    await chat.save();
    res.status(200).json({ message: 'Chat saved successfully', chat });
  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// UPDATE chat by id (can be used for renaming, etc. but /:chatId/save is preferred for messages)
router.put('/:id', async (req, res) => {
  try {
    // Only allow specific fields to be updated, e.g., name
    const updateData = {};
    if (req.body.name) {
      updateData.name = req.body.name;
    }
    // You might also update datetime if the chat itself is modified
    updateData.datetime = new Date();

    const chat = await Chat.findByIdAndUpdate(req.params.id, updateData, { new: true });
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