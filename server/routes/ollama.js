const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const axios = require('axios');

// Start a specific LLM model with ollama run <model> (FIX: do not spawn, just check if model exists)
router.post('/start', (req, res) => {
  const { model } = req.body;
  if (!model) {
    return res.status(400).json({ error: 'Model is required.' });
  }
  // Instead of spawning, just check if the model exists using `ollama list`
  exec('ollama list', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }
    const lines = stdout.trim().split('\n').slice(1);
    const models = lines.map(line => line.split(/\s+/)[0]).filter(Boolean);
    if (!models.includes(model)) {
      return res.status(404).json({ error: `Model '${model}' not found in ollama list.` });
    }
    // Success: model exists, nothing else to do
    res.json({ message: `Model '${model}' is available.` });
  });
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
