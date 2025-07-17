const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const axios = require('axios');

router.post('/generate', async (req, res) => {
  const { model, prompt } = req.body;
  if (!model || !prompt) {
    return res.status(400).json({ error: 'Model and prompt are required.' });
  }

  try {
    // Make a request to Ollama's generate API with stream: true
    const ollamaResponse = await axios.post(
      'http://localhost:11434/api/generate',
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
        res.end();
    }
  }
});


// GET all local LLMs (ollama list)
router.get('/list', (req, res) => {
  exec('ollama list', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }
    // Parse output: skip header, get first word of each line
    const lines = stdout.trim().split('\n').slice(1);
    const models = lines.map(line => line.split(/\s+/)[0]).filter(Boolean);
    res.json({ models });
  });
});

// POST to generate a response from a specific LLM using Ollama HTTP API
// (already imported above)
router.post('/generate', async (req, res) => {
  const { model, prompt } = req.body;
  if (!model || !prompt) {
    return res.status(400).json({ error: 'Model and prompt are required.' });
  }
  try {
    const ollamaRes = await axios.post('http://localhost:11434/api/generate', {
      model,
      prompt
    }, { timeout: 60000 });
    // The response is streamed, but for simplicity, we expect Ollama to return the full response
    // If Ollama returns a stream, you may need to handle it differently
    res.json({ response: ollamaRes.data.response || ollamaRes.data });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate response from Ollama.' });
  }
});

module.exports = router;
