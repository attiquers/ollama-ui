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

app.post('/generate', (req, res) => {
  const { model, prompt } = req.body;
  if (!model || !prompt) {
    return res.status(400).json({ error: 'Model and prompt are required.' });
  }
  const command = `ollama run ${model} "${prompt.replace(/"/g, '\\"')}"`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }
    // Get the last non-empty line as the response
    const lines = stdout.trim().split('\n').filter(Boolean);
    const response = lines[lines.length - 1] || '';
    res.json({ response });
  });
});

app.listen(PORT, () => {
  console.log(`Ollama LLM server running on port http://localhost:${PORT}/`);
});
