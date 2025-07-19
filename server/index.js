const express = require('express');
const cors = require('cors'); // Keep this import
const fetch = require('node-fetch'); // For making HTTP requests to Ollama API
const mongoose = require('mongoose');

const chatsRoutes = require('./routes/chats');
const ollamaRoutes = require('./routes/ollama');

// Use the MONGO_URI environment variable provided by Docker Compose
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ollama-ui';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const app = express();
const PORT = process.env.PORT || 5000; // Ensure this matches your docker-compose.yml backend port

// ADDED/CHANGED: Explicitly configure CORS to allow requests from your frontend's origin
// This is crucial for resolving the Cross-Origin Request Blocked error.
const corsOptions = {
  origin: 'http://localhost:3000', // Allow requests from your frontend's URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow these HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
  credentials: true // Allow cookies/auth headers to be sent
};
app.use(cors(corsOptions)); // Apply the configured CORS middleware

app.use(express.json()); // For parsing JSON request bodies

// Mount chats CRUD routes
app.use('/api/chats', chatsRoutes);
// Mount ollama routes
app.use('/api/ollama', ollamaRoutes);

// Get the Ollama API URL from environment variables
const ollamaApiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';

app.post('/generate', async (req, res) => {
  const { model, prompt } = req.body;
  if (!model || !prompt) {
    return res.status(400).json({ error: 'Model and prompt are required.' });
  }

  try {
    const response = await fetch(`${ollamaApiUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Ollama API error:', errorData);
      return res.status(response.status).json({ error: errorData.error || 'Failed to generate response from Ollama.' });
    }

    const data = await response.json();
    res.json({ response: data.response });

  } catch (error) {
    console.error('Error communicating with Ollama:', error);
    res.status(500).json({ error: 'Failed to communicate with Ollama service.' });
  }
});

app.listen(PORT, () => {
  console.log(`Ollama LLM backend server listening on port ${PORT}`);
  console.log(`Access this backend via http://localhost:${PORT} (from host)`);
  console.log(`Internal Docker communication: http://backend:${PORT}`);
});
