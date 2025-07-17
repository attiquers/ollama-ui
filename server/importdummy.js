const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Chat = require('./models/Chat');

const dummyChatsPath = path.join(__dirname, 'dummyChats.json');
const dummyChats = JSON.parse(fs.readFileSync(dummyChatsPath, 'utf-8'));

// Remove 'id' field since MongoDB uses _id
const chatsToInsert = dummyChats.map(({ id, ...rest }) => rest);

mongoose.connect('mongodb://localhost:27017/ollama-ui', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    await Chat.deleteMany({});
    await Chat.insertMany(chatsToInsert);
    console.log('Dummy chats imported!');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('MongoDB error:', err);
    mongoose.disconnect();
  });