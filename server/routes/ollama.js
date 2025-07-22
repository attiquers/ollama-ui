const express = require('express');
const router = express.Router();
const axios = require('axios');
const Chat = require('../models/Chat');
const multer = require('multer');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const OLLAMA_API_BASE_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';

// Configure multer storage for file uploads
const storage = multer.memoryStorage(); // Store file in memory as a Buffer
const upload = multer({ storage: storage });

// Helper functions for text extraction
async function extractTextFromFile(file) {
  const { originalname, mimetype, buffer } = file;
  let extractedText = '';

  console.log(`[${new Date().toISOString()}] [FILE-EXTRACT] Processing file: ${originalname}, Type: ${mimetype}`);

  try {
    if (mimetype === 'text/plain') {
      extractedText = buffer.toString('utf8');
      console.log(`[${new Date().toISOString()}] [FILE-EXTRACT] TXT file extracted. Content length: ${extractedText.length}`);
    } else if (mimetype === 'application/pdf') {
      const data = await pdf(buffer);
      extractedText = data.text;
      console.log(`[${new Date().toISOString()}] [FILE-EXTRACT] PDF file extracted. Content length: ${extractedText.length}`);
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      extractedText = result.value;
      console.log(`[${new Date().toISOString()}] [FILE-EXTRACT] DOCX file extracted. Content length: ${extractedText.length}`);
    } else {
      console.warn(`[${new Date().toISOString()}] [FILE-EXTRACT] Unsupported file type: ${mimetype}`);
      throw new Error(`Unsupported file type: ${mimetype}`);
    }
    return extractedText;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [FILE-EXTRACT] Error extracting text from ${originalname}:`, error.message);
    throw new Error(`Failed to extract text from document: ${error.message}`);
  }
}

router.get('/list', async (_, res) => {
  try {
    const { data } = await axios.get(`${OLLAMA_API_BASE_URL}/api/tags`);
    console.log(`[${new Date().toISOString()}] [OLLAMA-LIST] returning models:`, data.models.map(m => m.name));
    res.json({ models: data.models.map(m => m.name) });
  } catch (e) {
    console.error(`[${new Date().toISOString()}] [OLLAMA-LIST] ERROR:`, e.message);
    res.status(500).json({ error: 'Failed to list models' });
  }
});

router.post('/chat', upload.single('document'), async (req, res) => {
  console.log(`\n[${new Date().toISOString()}] [OLLAMA-CHAT] STARTING Request processing.`);

  let { model, messages, chatId: clientChatId } = req.body;
  
  try {
    messages = JSON.parse(messages);
  } catch (e) {
    console.error(`[${new Date().toISOString()}] [OLLAMA-CHAT] Error parsing messages JSON from FormData:`, e);
    return res.status(400).json({ error: 'Invalid messages format.' });
  }

  console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] Incoming chat request. Model: ${model}, Client Chat ID: ${clientChatId}, Messages length: ${messages?.length}`);
  console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] Uploaded File status: ${req.file ? 'Present' : 'Absent'}`);

  if (!model || !Array.isArray(messages) || !messages.length) {
    console.warn(`[${new Date().toISOString()}] [OLLAMA-CHAT] 400 – Model or messages missing.`);
    return res.status(400).json({ error: 'Model and messages required.' });
  }

  const lastUserMsg = messages[messages.length - 1];
  if (lastUserMsg.role !== 'user' || (!lastUserMsg.content && (!lastUserMsg.images || lastUserMsg.images.length === 0) && !req.file)) {
      console.warn(`[${new Date().toISOString()}] [OLLAMA-CHAT] 400 – Last message not a valid user message with content, image, or document.`);
      return res.status(400).json({ error: 'Last message must be a user message with content, an image, or a document.' });
  }

  let chat;
  let hasSavedFinalResponse = false;
  let fullAI = '';
  let documentContext = '';
  let documentName = '';

  try {
    // Handle document upload and text extraction
    if (req.file) {
      documentName = req.file.originalname;
      const fileProcessingStartTime = Date.now();
      try {
        documentContext = await extractTextFromFile(req.file);
        console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] Document context extraction finished in ${Date.now() - fileProcessingStartTime}ms. Content length: ${documentContext.length}`);
        // Prepend document context to the user's message for Ollama
        lastUserMsg.content = `Context from document "${documentName}":\n\n${documentContext}\n\nUser query: ${lastUserMsg.content}`;
      } catch (fileExtractError) {
        console.error(`[${new Date().toISOString()}] [OLLAMA-CHAT] Failed to extract text from document:`, fileExtractError.message);
        lastUserMsg.content = `(Error processing document: ${fileExtractError.message})\n\nUser query: ${lastUserMsg.content}`;
        documentContext = `Error: ${fileExtractError.message}`; // Store error in DB field
      }
    }

    const chatRetrievalStartTime = Date.now();
    if (clientChatId) {
      chat = await Chat.findById(clientChatId);
      if (!chat) {
        console.warn(`[${new Date().toISOString()}] [OLLAMA-CHAT] Chat not found for ID: ${clientChatId}. Creating new chat.`);
        chat = new Chat({ messages: [], name: lastUserMsg.content.substring(0, 50) });
      } else {
        console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] Found existing chat with ID: ${clientChatId}. Took ${Date.now() - chatRetrievalStartTime}ms.`);
      }
    } else {
      console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] Creating NEW chat instance. Took ${Date.now() - chatRetrievalStartTime}ms.`);
      chat = new Chat({ messages: [], name: lastUserMsg.content.substring(0, 50) });
    }

    // Add user message to chat history and save immediately.
    const userMessageSaveStartTime = Date.now();
    chat.messages.push({
      user: lastUserMsg.content,
      ai: '',
      image: lastUserMsg.images && lastUserMsg.images.length > 0 ? `data:${req.body.imageMimeType || 'image/jpeg'};base64,${lastUserMsg.images[0]}` : undefined,
      document: req.file ? { name: documentName, content: documentContext.substring(0, 5000) } : undefined
    });
    await chat.save();
    console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] User message saved to DB. Chat ID: ${chat._id.toString()}. Took ${Date.now() - userMessageSaveStartTime}ms.`);

    res.setHeader('X-Chat-ID', chat._id.toString());
    res.setHeader('Content-Type', 'text/plain');
    res.flushHeaders();
    console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] Headers flushed to client. X-Chat-ID set to: ${chat._id.toString()}`);

    const ollamaApiCallStartTime = Date.now();
    const ollamaRes = await axios.post(
      `${OLLAMA_API_BASE_URL}/api/chat`,
      { model, messages, stream: true },
      { responseType: 'stream' }
    );
    console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] Ollama API request sent. Status: ${ollamaRes.status}. Time to connect: ${Date.now() - ollamaApiCallStartTime}ms.`);

    const saveAIResponse = async (errorMsg = '') => {
      if (hasSavedFinalResponse) {
        console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] Save already performed, skipping duplicate save.`);
        return;
      }
      hasSavedFinalResponse = true;

      const lastIdx = chat.messages.length - 1;
      if (lastIdx >= 0) {
        let aiContentToSave = fullAI;
        if (errorMsg) {
          aiContentToSave += `\n[Error: ${errorMsg.substring(0, 100)}...]`;
        }

        const dbUpdateStartTime = Date.now();
        const updateData = {
          $set: {
            [`messages.${lastIdx}.ai`]: aiContentToSave,
            [`messages.${lastIdx}.datetime`]: new Date(),
            datetime: new Date()
          },
          $inc: { __v: 1 }
        };

        try {
          const updatedChat = await Chat.findByIdAndUpdate(
            chat._id,
            updateData,
            { new: true, overwrite: false, upsert: false }
          );

          if (!updatedChat) {
            console.error(`[${new Date().toISOString()}] [OLLAMA-CHAT] Chat document not found for update, ID: ${chat._id.toString()}`);
          } else {
            console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] AI response saved to DB for chat ID: ${chat._id.toString()}. Took ${Date.now() - dbUpdateStartTime}ms.`);
          }
        } catch (dbError) {
          console.error(`[${new Date().toISOString()}] [OLLAMA-CHAT] Database save error (VersionError likely if findByIdAndUpdate fails unexpectedly):`, dbError.message);
        }
      }

      if (!res.writableEnded) {
        res.end();
        console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] Client response ended.`);
      }
    };

    let firstChunkReceived = false;
    ollamaRes.data.on('data', chunk => {
      if (!firstChunkReceived) {
        console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] First AI stream chunk received. Time to first byte from Ollama: ${Date.now() - ollamaApiCallStartTime}ms.`);
        firstChunkReceived = true;
      }
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message?.content) fullAI += json.message.content;
          res.write(line + '\n');
        } catch (e) {
          console.warn(`[${new Date().toISOString()}] [OLLAMA-CHAT] Malformed JSON chunk from Ollama:`, line);
        }
      }
    });

    ollamaRes.data.on('end', async () => {
      console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] Ollama stream ended. Full AI response length: ${fullAI.length}. Total stream time from Ollama request: ${Date.now() - ollamaApiCallStartTime}ms.`);
      await saveAIResponse();
      console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] FINISHED Request processing.`);
    });

    ollamaRes.data.on('error', async e => {
      console.error(`[${new Date().toISOString()}] [OLLAMA-CHAT] Ollama stream error:`, e.message);
      await saveAIResponse(e.message);
      console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] FINISHED Request processing WITH ERROR.`);
    });

    res.on('close', async () => {
      console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] Client connection closed (e.g., user navigated away or stopped). Checking for partial AI response to save.`);
      await saveAIResponse('Client Disconnected');
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] [OLLAMA-CHAT] Error during chat processing or database operation:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process chat request.' });
    } else if (!res.writableEnded) {
      res.write(JSON.stringify({ error: 'Server internal error during chat stream.' }) + '\n');
      res.end();
    }
    console.log(`[${new Date().toISOString()}] [OLLAMA-CHAT] FINISHED Request processing WITH UNCAUGHT ERROR.`);
  }
});

module.exports = router;