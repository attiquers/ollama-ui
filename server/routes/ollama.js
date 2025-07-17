const express = require('express');
const { exec } = require('child_process');

const router = express.Router();

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

// POST to generate a response from a specific LLM
router.post('/generate', (req, res) => {
  const { model, prompt } = req.body;
  if (!model || !prompt) {
    return res.status(400).json({ error: 'Model and prompt are required.' });
  }
  const command = `ollama run ${model} "${prompt.replace(/"/g, '\"')}"`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }
    res.json({ response: stdout.trim() });
  });
});

module.exports = router;
