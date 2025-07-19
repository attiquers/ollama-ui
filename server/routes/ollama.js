const express = require('express');
const router = express.Router();
const axios = require('axios');
const Chat = require('../models/Chat'); // Corrected path to your Mongoose Chat model

// Ensure you have an Ollama instance running and accessible
const OLLAMA_API_BASE_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';

// Endpoint to list available Ollama models
router.get('/list', async (req, res) => {
    try {
        const response = await axios.get(`${OLLAMA_API_BASE_URL}/api/tags`);
        const modelsData = response.data.models.map(model => model.name);
        res.json({ models: modelsData });
    } catch (error) {
        console.error("Error fetching Ollama models:", error);
        res.status(500).json({ error: 'Failed to fetch Ollama models.' });
    }
});

// Endpoint to handle chat interactions with Ollama, including streaming and DB saving
router.post('/chat', async (req, res) => {
    const { model, messages, stream, chatId: clientChatId } = req.body;

    if (!model || !messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Model and a non-empty messages array are required.' });
    }

    let currentChat;
    let accumulatedAiContent = '';

    // The last message in the array is the current user's prompt
    const lastUserMessageInRequest = messages[messages.length - 1];
    if (lastUserMessageInRequest.role !== 'user') {
        return res.status(400).json({ error: 'The last message in the array must be a user message.' });
    }

    try {
        // Find or create chat
        if (clientChatId) {
            currentChat = await Chat.findById(clientChatId); // Still need to await finding an existing chat
            if (!currentChat) {
                return res.status(404).json({ error: 'Chat not found.' });
            }
        } else {
            // Create a new chat instance in memory if no chatId is provided
            currentChat = new Chat({
                name: lastUserMessageInRequest.content.substring(0, 30) || `New Chat ${new Date().toLocaleString()}`,
                messages: [], // Will be populated immediately below
                datetime: new Date(),
            });
            // No need to await currentChat.save() here. We just need the _id for the header.
            // The first actual save will be kicked off asynchronously below.
        }

        // Add the user's new message to the chat's messages array in memory
        currentChat.messages.push({
            user: lastUserMessageInRequest.content,
            ai: '', // Placeholder for AI response
            datetime: new Date(),
        });
        currentChat.datetime = new Date(); // Update chat's last activity time

        // === OPTIMIZATION: Start the save operation for the user message WITHOUT AWAITING ===
        // This makes the database write asynchronous and non-blocking,
        // allowing the code to proceed immediately to the Ollama API call.
        // The save will complete in the background. If it fails, it's logged.
        // The final save (on stream end) will ensure consistency.
        currentChat.save().catch(saveErr => {
            console.error("Failed to save user message optimistically:", saveErr);
            // Consider more robust error handling for critical DB failures here,
            // e.g., if you absolutely must ensure the user message is saved before proceeding.
            // For now, it proceeds to Ollama regardless, relying on the final save.
        });


        // Inform the client about the chat ID (especially if a new chat was created)
        // Mongoose generates _id synchronously when a new document is instantiated.
        res.setHeader('X-Chat-ID', currentChat._id.toString());
        res.setHeader('Content-Type', 'text/plain'); // For SSE-like streaming

        // Ollama API expects messages in { role: 'user' | 'assistant', content: string } format.
        // The frontend App.tsx should now send messages in this format.
        const ollamaMessages = messages; // Use the messages array directly from the request body

        const ollamaResponse = await axios.post(
            `${OLLAMA_API_BASE_URL}/api/chat`, // Ollama's chat endpoint
            {
                model,
                messages: ollamaMessages,
                stream
            },
            { responseType: 'stream' } // Always expect stream from Ollama if streaming
        );

        ollamaResponse.data.on('data', (chunk) => {
            try {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    const json = JSON.parse(line);
                    if (json.message && json.message.content) {
                        accumulatedAiContent += json.message.content;
                    }
                    // Send each chunk back to the client
                    res.write(JSON.stringify(json) + '\n');
                }
            } catch (e) {
                console.error("Error parsing Ollama stream chunk:", e);
                // If parsing fails, it's a corrupted stream, end response
                if (!res.headersSent) { // Prevent setting headers if already sent by an earlier write
                    res.status(500); // Set status, but don't re-send headers
                }
                res.write(JSON.stringify({ error: 'Stream parsing error.' }) + '\n');
                res.end();
            }
        });

        ollamaResponse.data.on('end', async () => {
            // After successful stream completion, update the AI response in the DB
            if (currentChat && accumulatedAiContent) {
                try {
                    // Find the last message (which was the user's message we just processed)
                    // and update its AI response part.
                    const lastMessageIndex = currentChat.messages.length - 1;
                    if (lastMessageIndex >= 0 && currentChat.messages[lastMessageIndex].user === lastUserMessageInRequest.content) {
                        currentChat.messages[lastMessageIndex].ai = accumulatedAiContent;
                        currentChat.messages[lastMessageIndex].datetime = new Date(); // Update message datetime
                        currentChat.datetime = new Date(); // Update chat's last activity time
                        await currentChat.save(); // Await this final save to ensure consistency
                        console.log(`Chat ${currentChat._id} updated with full AI response.`);
                    }
                } catch (saveError) {
                    console.error("Error saving chat after full stream completion:", saveError);
                }
            }
            res.end(); // End the HTTP response to the client
        });

        ollamaResponse.data.on('error', (err) => {
            console.error("Ollama stream error:", err);
            // Attempt to send an error message to client before ending
            if (!res.headersSent) {
                res.status(500); // Set status if not already sent
            }
            res.write(JSON.stringify({ error: 'Ollama streaming error: ' + err.message }) + '\n');
            res.end();
        });

    } catch (error) {
        console.error("Error during Ollama chat request or chat management:", error);
        // If an error occurs before streaming starts (e.g., chat not found, Ollama unreachable)
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to process chat request or communicate with Ollama.' });
        } else {
            res.end(); // If headers sent (e.g., first write), just end the stream with error
        }
    }
});

module.exports = router;