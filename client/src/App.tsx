// App.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import ChatInput from '@/components/ChatInput';
import CurrentHistory from '@/components/CurrentHistory';

// ChatMessageDb type is used for database interaction
type ChatMessageDb = {
  user: string;
  ai: string;
  datetime: string;
};

const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5000/api';

function App({
  chatId: propChatId,
  selectedLLM,
  setSelectedLLM,
  chatsData,
  setSelectedChatId,
  selectedChatId,
  setChatsData
}: any) {
  const [currentChatMessages, setCurrentChatMessages] = useState<Array<{ user: string; ai: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Add a ref to store the AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChatMessages]);

  useEffect(() => {
    if (propChatId !== selectedChatId) {
      setSelectedChatId(propChatId ?? null);
    }
  }, [propChatId, selectedChatId, setSelectedChatId]);

  useEffect(() => {
    const chat = chatsData.find((c: any) => c._id === selectedChatId);
    if (chat) {
      setCurrentChatMessages(chat.messages.map((m: any) => ({ user: m.user, ai: m.ai })));
      setHasInteracted(true);
    } else if (!selectedChatId && !hasInteracted) {
      setCurrentChatMessages([]);
    }
  }, [chatsData, selectedChatId, hasInteracted]);

  useEffect(() => {
    const storedLLM = localStorage.getItem('selectedLLM');
    if (storedLLM && !selectedLLM) {
      setSelectedLLM(storedLLM);
    }
  }, [selectedLLM, setSelectedLLM]);

  useEffect(() => {
    if (selectedLLM) {
      localStorage.setItem('selectedLLM', selectedLLM);
    }
  }, [selectedLLM]);

  useEffect(() => {
    if (selectedChatId && propChatId !== selectedChatId) {
      window.history.replaceState(null, '', `/chat/${selectedChatId}`);
    }
  }, [selectedChatId, propChatId]);

  // New function to stop the ongoing generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      console.log("Aborting AI generation...");
      abortControllerRef.current.abort();
      setIsLoading(false); // Stop loading indicator
      abortControllerRef.current = null; // Clean up the ref
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!selectedLLM) {
      alert('Please select an LLM first!');
      return;
    }

    // If there's already an ongoing request, stop it first (optional, but good UX)
    if (isLoading) {
      stopGeneration();
      // Optionally, you might want to wait a moment or prevent new messages until current is fully stopped
      // For now, we'll just proceed with the new message.
    }

    setIsLoading(true);
    setHasInteracted(true);

    // Initialize AbortController for the new request
    const abortController = new AbortController();
    abortControllerRef.current = abortController; // Store it in the ref

    let currentChatId = selectedChatId;
    let chatToUpdate = chatsData.find((c: any) => c._id === selectedChatId) ?? null;
    let createdNewChat = false;

    const userMessageForDb: ChatMessageDb = { user: text, ai: '', datetime: new Date().toISOString() };

    setCurrentChatMessages((prev) => [
      ...prev,
      { user: text, ai: '' }
    ]);

    try {
      if (!chatToUpdate) {
        const newChatData = {
          name: `Chat with ${selectedLLM}`,
          datetime: userMessageForDb.datetime,
          messages: [userMessageForDb]
        };

        const res = await axios.post(`${API_BASE_URL}/chats`, newChatData);
        chatToUpdate = res.data;
        currentChatId = chatToUpdate._id;
        createdNewChat = true;

        if (typeof setChatsData === 'function') {
          setChatsData((prev: any[]) => [...prev, chatToUpdate]);
        }
        if (typeof setSelectedChatId === 'function') {
          setSelectedChatId(currentChatId);
        }
        setCurrentChatMessages(chatToUpdate.messages.map((m: any) => ({ user: m.user, ai: m.ai })));

      } else {
        const updatedMessagesForDb: ChatMessageDb[] = [...(chatToUpdate.messages || []), userMessageForDb];
        if (typeof setChatsData === 'function') {
          setChatsData((prev: any[]) => prev.map((c: any) =>
            c._id === chatToUpdate._id ? { ...c, messages: updatedMessagesForDb } : c
          ));
        }
        await axios.put(`${API_BASE_URL}/chats/${chatToUpdate._id}`, {
          ...chatToUpdate,
          messages: updatedMessagesForDb
        });
      }

      // --- Ollama API Call and Streaming Response Handling ---
      const response = await fetch(`${API_BASE_URL}/ollama/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedLLM, prompt: text, stream: true }),
        signal: abortController.signal // Pass the signal here!
      });

      if (!response.body) {
        console.error('No response body received from Ollama stream.');
        setIsLoading(false);
        abortControllerRef.current = null; // Clean up
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiAccumulatedText = '';
      let buffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { value, done: doneReading } = await reader.read();

        // Check if the request was aborted
        if (abortController.signal.aborted) {
          console.log("Frontend: Request was aborted.");
          streamDone = true;
          // You might want to update the last message to indicate it was interrupted
          // e.g., append "[Generation stopped by user]"
          break; // Exit the loop
        }

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;

          try {
            const jsonChunk = JSON.parse(line);

            if (jsonChunk.response) {
              aiAccumulatedText += jsonChunk.response;

              setCurrentChatMessages((prev) => {
                const updated = [...prev];
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
            // If JSON parsing fails, the stream might be broken. Consider stopping.
            streamDone = true; // Stop processing this stream
            break;
          }
        }
        if (doneReading && buffer.trim() === '') {
          streamDone = true;
        }
      }

      // --- After streaming is complete or aborted, save the final AI response to the DB ---
      // Only save if some AI text was generated
      if (aiAccumulatedText.length > 0) {
        const aiMessageForDb: ChatMessageDb = {
          user: text,
          ai: aiAccumulatedText,
          datetime: new Date().toISOString()
        };

        let finalMessagesForDb: ChatMessageDb[] = [];

        if (createdNewChat) {
          // If it was a new chat, messages were just the user's initial message
          // So, add the full user message + the AI response
          finalMessagesForDb = [
            { user: userMessageForDb.user, ai: aiMessageForDb.ai, datetime: userMessageForDb.datetime }
          ];
        } else if (chatToUpdate) {
          const existingMessages = chatToUpdate.messages || [];
          // Find the user message that was optimistically added and update its AI response
          const indexToUpdate = existingMessages.findIndex(
            (msg: ChatMessageDb) => msg.user === text && msg.ai === ''
          );

          if (indexToUpdate !== -1) {
            finalMessagesForDb = [...existingMessages];
            finalMessagesForDb[indexToUpdate] = {
              ...finalMessagesForDb[indexToUpdate],
              ai: aiAccumulatedText,
              datetime: aiMessageForDb.datetime
            };
          } else {
            // Fallback: If for some reason the optimistic update wasn't found,
            // add a new complete message. This shouldn't happen if optimistic update is correct.
            finalMessagesForDb = [...existingMessages, { user: text, ai: aiAccumulatedText, datetime: aiMessageForDb.datetime }];
          }
        }

        if (currentChatId) {
          try {
            await axios.put(`${API_BASE_URL}/chats/${currentChatId}`, {
              ...chatToUpdate,
              messages: finalMessagesForDb,
              name: createdNewChat ? `Chat with ${selectedLLM}` : chatToUpdate.name
            });

            if (typeof setChatsData === 'function') {
              setChatsData((prev: any[]) => prev.map((c: any) =>
                c._id === currentChatId ? { ...c, messages: finalMessagesForDb } : c
              ));
            }
          } catch (error) {
            console.error("Error saving final AI response to DB:", error);
          }
        }
      } else {
        // If AI text is empty (e.g., due to abort), ensure the optimistic AI message is removed or marked
        setCurrentChatMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].user === text && updated[updated.length - 1].ai === '') {
            // Remove the last message if it's the user's message with an empty AI response
            return updated.slice(0, -1);
          }
          return updated;
        });
      }


    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Fetch request aborted by user.");
        // If the request was aborted, update the UI to reflect that
        setCurrentChatMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].user === text && updated[updated.length - 1].ai === '') {
            updated[updated.length - 1].ai = "[Generation stopped]"; // Or remove it entirely
          }
          return updated;
        });
      } else {
        console.error("Error during sendMessage or Ollama stream:", error);
        setCurrentChatMessages((prev) => prev.slice(0, prev.length - 1)); // Revert UI on other errors
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null; // Clean up the AbortController
    }
  }, [selectedLLM, selectedChatId, chatsData, setChatsData, setSelectedChatId, setHasInteracted, stopGeneration]);

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
          {/* Pass isLoading and stopGeneration to ChatInput */}
          <ChatInput onSend={sendMessage} isLoading={isLoading} onStop={stopGeneration} />
        </footer>
      </div>
    </div>
  );
}

export default App;