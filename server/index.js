const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const mongoose = require('mongoose');

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
  'http://localhost:5173',        // ✅ ADD THIS
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
  exposedHeaders: ['X-Chat-ID'], // <--- THIS IS THE NEW CRITICAL CHANGE
  credentials: true
};

// ✅ Middleware
app.use(cors(corsOptions));
app.use(express.json());

// 🔍 Debug: Log incoming origins
app.use((req, res, next) => {
  console.log('🌐 Incoming request from:', req.headers.origin, 'Path:', req.path);
  next();
});

// ✅ Routes
app.use('/api/chats', chatsRoutes);
app.use('/api/ollama', ollamaRoutes);

// ✅ /generate endpoint (calls Ollama directly) - For direct generation, not used in main chat flow
app.post('/generate', async (req, res) => {
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

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🛠  Docker internal access: http://backend:${PORT}`);
});