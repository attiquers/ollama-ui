const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
  },
  ai: {
    type: String,
    required: false, // AI response can be empty initially or partially
  },
  datetime: {
    type: Date,
    default: Date.now,
  },
});

const chatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  messages: [messageSchema],
  datetime: { // Last updated/created timestamp for the chat itself
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Chat', chatSchema);