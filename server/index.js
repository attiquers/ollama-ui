
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const chatsRoutes = require('./routes/chats');
const ollamaRoutes = require('./routes/ollama');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ollama-ui', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Mount chats CRUD routes
app.use('/api/chats', chatsRoutes);
// Mount ollama routes
app.use('/api/ollama', ollamaRoutes);



app.listen(PORT, () => {
  console.log(`Ollama LLM server running on port http://localhost:${PORT}/`);
});
