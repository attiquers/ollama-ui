import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import ChatInput from '@/components/ChatInput';
import CurrentHistory from '@/components/CurrentHistory';
import { useParams } from 'react-router-dom';

// Use a simpler Message type for frontend UI
interface Message {
  user: string;
  ai: string;
}

interface ChatData {
  _id: string;
  name: string;
  messages: Array<{ user: string; ai: string; datetime?: string }>; // Messages from DB might have datetime
  datetime: string;
}

interface AppProps {
  chatId: string | null;
  selectedLLM: string;
  setSelectedLLM: (llm: string) => void;
  chatsData: ChatData[];
  setSelectedChatId: (id: string | null) => void;
  selectedChatId: string | null;
  setChatsData: (data: ChatData[]) => void;
}

const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5000/api';

function App({
  chatId: propChatId,
  selectedLLM,
  setSelectedLLM,
  chatsData,
  setSelectedChatId,
  selectedChatId,
  setChatsData
}: AppProps) {
  const [currentChatMessages, setCurrentChatMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Add a ref to store the AbortController for the ongoing generation request
  const abortControllerRef = useRef<AbortController | null>(null);
  // Ref to store the actual chat ID being used for the current generation
  const currentGenerationChatIdRef = useRef<string | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChatMessages]);

  // Sync route chatId with internal selectedChatId state
  useEffect(() => {
    if (propChatId !== selectedChatId) {
      setSelectedChatId(propChatId ?? null);
    }
  }, [propChatId, selectedChatId, setSelectedChatId]);

  // Load chat messages when selected chat changes
  useEffect(() => {
    const chat = chatsData.find((c) => c._id === selectedChatId);
    if (chat) {
      // Map DB messages to frontend Message type
      setCurrentChatMessages(chat.messages.map(m => ({ user: m.user, ai: m.ai || '' })));
      setHasInteracted(true); // Mark as interacted if a chat is loaded
    } else if (!selectedChatId) {
      // If no chat selected, clear messages, unless already interacted (e.g., in a new unsaved chat)
      setCurrentChatMessages([]);
      setHasInteracted(false);
    }
  }, [selectedChatId, chatsData]);

  // Persist selected LLM in localStorage
  useEffect(() => {
    const storedLLM = localStorage.getItem('selectedLLM');
    if (storedLLM) { // Only set if something is stored
      setSelectedLLM(storedLLM);
    }
  }, [setSelectedLLM]); // Dependency array should include setSelectedLLM to avoid lint warnings

  useEffect(() => {
    if (selectedLLM) {
      localStorage.setItem('selectedLLM', selectedLLM);
    }
  }, [selectedLLM]);

  // Function to re-fetch chats from the backend (for sidebar update)
  const refetchChats = useCallback(async () => {
    try {
      const res = await axios.get<ChatData[]>(`${API_BASE_URL}/chats`);
      setChatsData(res.data);
    } catch (error) {
      console.error("Error re-fetching chats:", error);
    }
  }, [setChatsData]);

  // Function to save current chat messages (used for partial saves on stop)
  const savePartialChat = useCallback(async (chatId: string | null, messages: Message[]) => {
    if (!chatId) {
      console.warn("Attempted to save partial chat without a chatId.");
      return;
    }
    try {
      // Map frontend messages to a format suitable for DB save, adding datetime
      const messagesToSave = messages.map(msg => ({
        user: msg.user,
        ai: msg.ai,
        datetime: new Date().toISOString() // Backend's Chat model will convert this to Date
      }));

      await axios.post(`${API_BASE_URL}/chats/${chatId}/save`, { messages: messagesToSave });
      console.log('Partial chat saved successfully!');
      refetchChats(); // Refresh sidebar to show latest state
    } catch (error) {
      console.error("Error saving partial chat:", error);
    }
  }, [refetchChats]);

  // Function to stop the ongoing generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      console.log("Aborting AI generation...");
      abortControllerRef.current.abort();
      setIsLoading(false); // Stop loading indicator immediately

      // Save the current partial messages (if any AI response was accumulated)
      if (currentGenerationChatIdRef.current && currentChatMessages.length > 0) {
        // We save the `currentChatMessages` as they are, including any partial AI content.
        // The backend's /chats/:chatId/save endpoint handles overwriting the last message.
        savePartialChat(currentGenerationChatIdRef.current, currentChatMessages);
      }
    }
  }, [currentChatMessages, savePartialChat]);

  const sendMessage = useCallback(async (text: string) => {
    if (!selectedLLM) {
      alert('Please select an LLM first!');
      return;
    }

    // Stop any ongoing generation before starting a new one
    if (isLoading) {
      stopGeneration();
    }

    setIsLoading(true);
    setHasInteracted(true);

    // Optimistically add user message to UI
    const newUserMessage: Message = { user: text, ai: '' };
    setCurrentChatMessages((prev) => [...prev, newUserMessage]);

    // Create a new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController; // Store for potential aborting

    let currentChatId = selectedChatId;
    currentGenerationChatIdRef.current = selectedChatId; // Store for partial save on abort

    try {
      // Build messages array for the backend in Ollama's expected format:
      // [{ role: 'user', content: '...' }, { role: 'assistant', content: '...' }]
      const messagesForBackend: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      currentChatMessages.forEach(msg => {
          messagesForBackend.push({ role: 'user', content: msg.user });
          if (msg.ai && msg.ai.trim() !== '') { // Only include AI message if it has content
              messagesForBackend.push({ role: 'assistant', content: msg.ai });
          }
      });
      // Add the new user message to the end of the history for the current prompt
      messagesForBackend.push({ role: 'user', content: text });


      const response = await fetch(`${API_BASE_URL}/ollama/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedLLM,
          messages: messagesForBackend,
          stream: true,
          chatId: currentChatId, // Pass current chat ID (null if new chat)
        }),
        signal: abortController.signal, // Pass the signal to abort the fetch
      });

      // Get X-Chat-ID from response headers if a new chat was created by the backend
      const newChatIdFromHeader = response.headers.get('X-Chat-ID');
      if (newChatIdFromHeader && !currentChatId) {
        currentChatId = newChatIdFromHeader;
        setSelectedChatId(currentChatId); // Update selected chat ID in parent state
        currentGenerationChatIdRef.current = currentChatId; // Update ref too
      }

      if (!response.body) {
        console.error('No response body received from Ollama stream.');
        setIsLoading(false);
        abortControllerRef.current = null;
        currentGenerationChatIdRef.current = null;
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiAccumulatedText = '';
      let buffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { value, done: doneReading } = await reader.read();

        // Check if the request was aborted during reading
        if (abortController.signal.aborted) {
          console.log("Frontend: Fetch request was aborted during stream processing.");
          streamDone = true;
          break; // Exit the loop
        }

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete last line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue;

          try {
            const jsonChunk = JSON.parse(line);
            if (jsonChunk.message && jsonChunk.message.content) {
              aiAccumulatedText += jsonChunk.message.content;

              setCurrentChatMessages((prev) => {
                const updated = [...prev];
                // Ensure we update the AI part of the last message (the one currently being generated)
                if (updated.length > 0) {
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    ai: aiAccumulatedText
                  };
                }
                return updated;
              });
              chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }

            if (jsonChunk.done) {
              streamDone = true;
              break;
            }
          } catch (error) {
            console.error("Error parsing JSON chunk from stream:", error, "Line:", line);
            streamDone = true; // Stop processing this stream due to error
            break;
          }
        }
        if (doneReading && buffer.trim() === '') {
          streamDone = true;
        }
      }

      // After stream is done (either completed or aborted by user via signal)
      // The backend (ollama.js) should have handled saving the full AI response to DB.
      // We just need to ensure frontend state is consistent and refresh the sidebar chats.
      console.log("Stream processing completed/aborted.");
      refetchChats(); // Refresh chats data to update sidebar and local state with final save

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Fetch request aborted by user (catch block).");
        // The stopGeneration function already initiated savePartialChat and UI updates
        // No further action needed here for saving or UI state specific to this abort.
      } else {
        console.error("Error during sendMessage or Ollama stream:", error);
        setCurrentChatMessages((prev) => {
            const updated = [...prev];
            if (updated.length > 0) {
                // If AI response was empty or partial, mark it as failed
                const lastMessage = updated[updated.length - 1];
                if (lastMessage.ai === '' || lastMessage.ai === '[Generation stopped]') {
                    lastMessage.ai = `Error: ${error.message || 'Failed to get response'}`;
                }
            }
            return updated;
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null; // Clear AbortController ref
      currentGenerationChatIdRef.current = null; // Clear current generation chat ID ref
    }
  }, [selectedLLM, selectedChatId, currentChatMessages, refetchChats, setSelectedChatId, stopGeneration, savePartialChat]);

  return (
    <div className="flex-1 flex bg-[#1B1C1D] items-center justify-center min-h-screen w-[60vw]">
      {(selectedChatId || hasInteracted || currentChatMessages.length > 0) ? (
        <div className="flex flex-col items-center justify-end pb-20 w-[60vw] min-h-screen relative">
          <CurrentHistory
            messages={
              currentChatMessages.flatMap((m) => [
                { role: 'user' as const, content: m.user },
                { role: 'assistant' as const, content: m.ai, blinking: isLoading && m.ai === '' }
              ])
            }
          />
          <div ref={chatEndRef} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-[60vw] min-h-screen relative">
          <div className="flex flex-col items-center w-full justify-end pb-20">
            <div>
              <img src="ollama.svg" alt="Ollama Logo" className='h-50 pb-4' />
            </div>
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-extrabold text-white mb-2">Private, Fast, Secure</h2>
            </div>
          </div>
          <div ref={chatEndRef} />
        </div>
      )}
      <div className='fixed bottom-0 bg-[#1B1C1D] pb-4 rounded-sm z-30'>
        <footer className='w-[60vw]'>
          <ChatInput onSend={sendMessage} isLoading={isLoading} onStop={stopGeneration} />
        </footer>
      </div>
    </div>
  );
}

export default App;