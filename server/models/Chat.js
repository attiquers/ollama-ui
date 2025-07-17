const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  user: String,
  ai: String,
  datetime: String,
});

const ChatSchema = new mongoose.Schema({
  name: String,
  datetime: String,
  messages: [MessageSchema],
});

module.exports = mongoose.model('Chat', ChatSchema);