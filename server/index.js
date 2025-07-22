const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const multer = require('multer'); // NEW: Import multer

const chatsRoutes = require('./routes/chats');
const ollamaRoutes = require('./routes/ollama');

const app = express();
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ollama-ui';
const ollamaApiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';

// ✅ Setup Mongoose
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ CORS config for local development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`❌ CORS blocked for origin: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Chat-ID'],
  exposedHeaders: ['X-Chat-ID'],
  credentials: true
};

// ✅ Middleware
app.use(cors(corsOptions));
// NEW: Multer will parse multipart form data. No need for express.json() for file uploads.
// Express.json() is still needed for other JSON requests if you have any.
// If all your POST requests to /ollama/chat will be multipart, you might not need express.json() here for this route.
app.use(express.json()); // Keep this for other JSON payloads
app.use(express.urlencoded({ extended: true })); // For URL-encoded bodies

// ✅ Routes
app.use('/api/chats', chatsRoutes);
app.use('/api/ollama', ollamaRoutes); // Ollama routes will now handle file uploads via multer setup there

// Existing /api/generate route (if it's still used - note: /ollama/chat is preferred for new chats)
app.post('/api/generate', async (req, res) => {
  const { model, prompt } = req.body;
  console.log('[GENERATE] Request received. Model:', model, 'Prompt length:', prompt?.length);

  if (!model || !prompt) {
    console.warn('[GENERATE] 400 - Model or prompt missing.');
    return res.status(400).json({ error: 'Model and prompt are required.' });
  }

  try {
    const response = await fetch(`${ollamaApiUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Ollama API error for /generate:', errorData);
      return res.status(response.status).json({
        error: errorData.error || 'Failed to generate response from Ollama.'
      });
    }

    const data = await response.json();
    console.log('[GENERATE] Ollama response received.');
    res.json({ response: data.response });

  } catch (error) {
    console.error('❌ Error communicating with Ollama for /generate:', error);
    res.status(500).json({ error: 'Failed to communicate with Ollama service.' });
  }
});

// ✅ Global error handler (CORS-safe)
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error in Express app:', err.message, err.stack);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});