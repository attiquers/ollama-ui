const express = require('express');
const router = express.Router();
// const { exec } = require('child_process'); // REMOVED: No longer needed, we'll use HTTP requests
const axios = require('axios'); // Already imported, good!

// Get the Ollama API URL from environment variables
// 'ollama' is the service name of the Ollama container in docker-compose.yml.
// Fallback to 'http://localhost:11434' for local development outside Docker.
const ollamaApiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';

// --- Important: You had two /generate routes. We're keeping the streaming one and fixing it. ---

// POST to generate a response from a specific LLM using Ollama HTTP API (with streaming)
router.post('/generate', async (req, res) => {
  const { model, prompt } = req.body;
  if (!model || !prompt) {
    return res.status(400).json({ error: 'Model and prompt are required.' });
  }

  try {
    // Make a request to Ollama's generate API with stream: true
    // Use the 'ollamaApiUrl' which will be 'http://ollama:11434' inside Docker.
    const ollamaResponse = await axios.post(
      `${ollamaApiUrl}/api/generate`, // CHANGED: Use ollamaApiUrl
      {
        model,
        prompt,
        stream: true, // Crucial: Tell Ollama to stream
      },
      {
        responseType: 'stream', // Crucial: Tell axios to expect a stream
      }
    );

    // Set appropriate headers for streaming
    res.setHeader('Content-Type', 'text/event-stream'); // Or application/json if you want to be strict, but text/event-stream is common for streams
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Pipe the Ollama response stream directly to the Express response
    ollamaResponse.data.pipe(res);

    // Handle end of stream and errors from Ollama
    ollamaResponse.data.on('end', () => {
      console.log('Stream from Ollama ended.');
      res.end(); // End the Express response
    });

    ollamaResponse.data.on('error', (err) => {
      console.error('Error streaming from Ollama:', err);
      if (!res.headersSent) { // Only send error if headers haven't been sent yet
        res.status(500).json({ error: 'Error streaming from Ollama.' });
      } else {
        res.end(); // If headers sent, just end the stream
      }
    });

  } catch (err) {
    console.error("Error setting up Ollama stream:", err);
    if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Failed to connect to Ollama streaming API.' });
    } else {
      // If headers were already sent (part of the stream), just end the response
      // This prevents "Cannot set headers after they are sent to the client" errors
        res.end();
    }
  }
});


// GET all local LLMs (ollama list)
// CHANGED: Replaced exec('ollama list') with an HTTP GET request to Ollama's /api/tags endpoint
router.get('/list', async (req, res) => { // Made the function 'async'
  try {
    // Make an HTTP GET request to Ollama's /api/tags endpoint
    // This endpoint returns a list of available models.
    const response = await axios.get(`${ollamaApiUrl}/api/tags`); // CHANGED: Use ollamaApiUrl and axios.get

    // The /api/tags response is usually like { models: [...] }
    const modelsData = response.data.models;

    // Extract just the model names (e.g., "llama2", "mistral")
    const modelNames = modelsData.map(model => model.name);

    res.json({ models: modelNames });

  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Ollama models.' });
  }
});


module.exports = router;