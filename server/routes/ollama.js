// routes/ollama.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Chat = require('../models/Chat');

const OLLAMA_API_BASE_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';

router.get('/list', async (_, res) => {
  try {
    const { data } = await axios.get(`${OLLAMA_API_BASE_URL}/api/tags`);
    console.log('[OLLAMA-LIST] returning models:', data.models.map(m => m.name));
    res.json({ models: data.models.map(m => m.name) });
  } catch (e) {
    console.error('[OLLAMA-LIST] ERROR:', e.message);
    res.status(500).json({ error: 'Failed to list models' });
  }
});

router.post('/chat', async (req, res) => {
  const { model, messages, chatId: clientChatId } = req.body;
  console.log('[OLLAMA-CHAT] Incoming chat request. Model:', model, 'Client Chat ID:', clientChatId, 'Messages length:', messages?.length);

  if (!model || !Array.isArray(messages) || !messages.length) {
    console.warn('[OLLAMA-CHAT] 400 – Model or messages missing');
    return res.status(400).json({ error: 'Model and messages required' });
  }

  const lastUserMsg = messages[messages.length - 1];
  if (lastUserMsg.role !== 'user' || !lastUserMsg.content) {
    console.warn('[OLLAMA-CHAT] 400 – Last message not a valid user message');
    return res.status(400).json({ error: 'Last message must be a user message with content.' });
  }

  let chat;
  let hasSavedFinalResponse = false; // Flag to prevent multiple saves
  let fullAI = ''; // Accumulate AI response here

  try {
    if (clientChatId) {
      chat = await Chat.findById(clientChatId);
      if (!chat) {
        console.warn('[OLLAMA-CHAT] Chat not found for ID:', clientChatId, 'Creating new chat.');
        // If chat not found for provided ID, create a new one as if no ID was provided
        chat = new Chat({ messages: [], name: lastUserMsg.content.substring(0, 50) });
      } else {
        console.log('[OLLAMA-CHAT] Found existing chat with ID:', clientChatId);
      }
    } else {
      console.log('[OLLAMA-CHAT] Creating NEW chat instance with ID: (will be generated)');
      chat = new Chat({ messages: [], name: lastUserMsg.content.substring(0, 50) });
    }

    // Add user message to chat history and save immediately.
    // This is the first and only 'save()' on the initial document instance.
    chat.messages.push({ user: lastUserMsg.content, ai: '' });
    await chat.save();
    console.log('[OLLAMA-CHAT] User message saved to DB. Chat ID:', chat._id.toString());

    // Set X-Chat-ID header for the client
    res.setHeader('X-Chat-ID', chat._id.toString());
    res.setHeader('Content-Type', 'text/plain'); // Ensure content type for streaming
    res.flushHeaders();
    console.log('[OLLAMA-CHAT] Headers flushed. X-Chat-ID set to:', chat._id.toString());

    const ollamaRes = await axios.post(
      `${OLLAMA_API_BASE_URL}/api/chat`,
      { model, messages, stream: true },
      { responseType: 'stream' }
    );
    console.log('[OLLAMA-CHAT] Ollama API request sent. Status:', ollamaRes.status);

    // This function centralizes the logic for saving the AI response
    // It uses findByIdAndUpdate to perform an atomic update, preventing VersionError
    const saveAIResponse = async (errorMsg = '') => {
      // Prevent duplicate saves
      if (hasSavedFinalResponse) {
        console.log('[OLLAMA-CHAT] Save already performed, skipping duplicate save.');
        return;
      }
      hasSavedFinalResponse = true; // Set flag to true immediately

      const lastIdx = chat.messages.length - 1; // Index of the last message (AI's reply)
      if (lastIdx >= 0) {
        let aiContentToSave = fullAI;
        if (errorMsg) {
          aiContentToSave += `\n[Error: ${errorMsg.substring(0, 100)}...]`;
        }

        const updateData = {
          $set: {
            [`messages.${lastIdx}.ai`]: aiContentToSave, // Update the specific AI message content
            [`messages.${lastIdx}.datetime`]: new Date(), // Set datetime for this message
            datetime: new Date() // Update the chat's last activity datetime
          },
          $inc: { __v: 1 } // Manually increment the version key to keep it in sync
        };

        try {
          // Use findByIdAndUpdate for an atomic update to prevent VersionError
          const updatedChat = await Chat.findByIdAndUpdate(
            chat._id,
            updateData,
            { new: true, overwrite: false, upsert: false } // new: return updated doc, overwrite: don't replace doc, upsert: don't create if not found
          );

          if (!updatedChat) {
            console.error('[OLLAMA-CHAT] Chat document not found for update, ID:', chat._id.toString());
          } else {
            console.log('[OLLAMA-CHAT] AI response saved to DB for chat ID:', chat._id.toString());
          }
        } catch (dbError) {
          console.error('[OLLAMA-CHAT] Database save error (VersionError likely if findByIdAndUpdate fails unexpectedly):', dbError.message);
        }
      }

      // Ensure the response stream to the client is ended
      if (!res.writableEnded) {
        res.end();
        console.log('[OLLAMA-CHAT] Client response ended.');
      }
    };

    // --- Stream Event Listeners ---
    // Handles data chunks from Ollama
    ollamaRes.data.on('data', chunk => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message?.content) fullAI += json.message.content;
          res.write(line + '\n'); // Write to client
        } catch (e) {
          console.warn('[OLLAMA-CHAT] Malformed JSON chunk from Ollama:', line);
        }
      }
    });

    // Handles the normal end of the Ollama stream
    ollamaRes.data.on('end', async () => {
      console.log('[OLLAMA-CHAT] Ollama stream ended. Full AI response length:', fullAI.length);
      await saveAIResponse(); // Save the full response
    });

    // Handles errors from the Ollama stream (e.g., Ollama server issue)
    ollamaRes.data.on('error', async e => {
      console.error('[OLLAMA-CHAT] Ollama stream error:', e.message);
      await saveAIResponse(e.message); // Save partial response with error message
    });

    // Handles client connection closing (e.g., user stops generation)
    res.on('close', async () => {
      console.log('[OLLAMA-CHAT] Client connection closed. Checking for partial AI response to save.');
      await saveAIResponse('Client Disconnected'); // Save partial response indicating disconnect
    });

  } catch (error) {
    console.error('[OLLAMA-CHAT] Error during chat processing or database operation:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process chat request.' });
    } else if (!res.writableEnded) {
      res.write(JSON.stringify({ error: 'Server internal error during chat stream.' }) + '\n');
      res.end();
    }
  }
});

module.exports = router;